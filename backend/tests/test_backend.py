import unittest

from app import create_app
from database.db import db
from models.fee_structure import FeeStructure
from models.school import School
from models.student import Student
from services.reconcile import reconcile_payment


class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "JWT_SECRET_KEY": "test-secret",
                "SECRET_KEY": "test-secret",
                "INTASEND_PUBLIC_KEY": "",
                "INTASEND_SECRET_KEY": "",
            }
        )
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def register_admin(self, email="admin@example.com"):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Admin User",
                "email": email,
                "password": "secret123",
                "role": "admin",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()["access_token"]

    def create_student(self, token, admission_no="ADM001", portal_pin="1234"):
        response = self.client.post(
            "/api/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Jane Doe",
                "admission_no": admission_no,
                "class_name": "Grade 1",
                "parent_phone": "0712345678",
                "portal_pin": portal_pin,
                "balance": 1500,
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()["student"]

    def test_auth_flow(self):
        register_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Admin User",
                "email": "adminflow@example.com",
                "password": "secret123",
                "role": "admin",
            },
        )
        self.assertEqual(register_response.status_code, 201)
        token = register_response.get_json()["access_token"]

        login_response = self.client.post(
            "/api/auth/login",
            json={
                "email": "adminflow@example.com",
                "password": "secret123",
            },
        )
        self.assertEqual(login_response.status_code, 200)

        profile_response = self.client.get(
            "/api/auth/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(profile_response.status_code, 200)

    def test_student_crud(self):
        token = self.register_admin("students@example.com")
        student = self.create_student(token, "ADM002")

        list_response = self.client.get(
            "/api/students",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.get_json()["students"]), 1)

        update_response = self.client.put(
            f"/api/students/{student['id']}",
            headers={"Authorization": f"Bearer {token}"},
            json={"balance": 1000},
        )
        self.assertEqual(update_response.status_code, 200)

        delete_response = self.client.delete(
            f"/api/students/{student['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(delete_response.status_code, 200)

    def test_payments_and_reports(self):
        token = self.register_admin("payments@example.com")
        student = self.create_student(token, "ADM003")

        manual_response = self.client.post(
            "/api/payments/manual",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "student_id": student["id"],
                "amount": 500,
            },
        )
        self.assertEqual(manual_response.status_code, 201)

        stk_response = self.client.post(
            "/api/payments/stkpush",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "student_id": student["id"],
                "amount": 300,
                "phone_number": "0712345678",
            },
        )
        self.assertEqual(stk_response.status_code, 202)

        summary_response = self.client.get(
            "/api/reports/summary",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(summary_response.status_code, 200)

        student_report_response = self.client.get(
            f"/api/reports/student/{student['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(student_report_response.status_code, 200)

    def test_webhook_and_reconciliation(self):
        student = Student(name="Mary Jane", admission_no="ADM004", class_name="Grade 3", balance=1000)
        db.session.add(student)
        db.session.commit()

        response = self.client.post(
            "/api/webhooks/intasend",
            json={
                "transaction_code": "MPESA123",
                "amount": 250,
                "admission_no": "ADM004",
            },
        )
        self.assertEqual(response.status_code, 200)
        db.session.refresh(student)
        self.assertEqual(float(student.balance), 750.0)

        payment, status = reconcile_payment(
            {
                "student_id": student.id,
                "amount": 200,
                "mpesa_code": "MPESA999",
                "payment_method": "webhook",
            }
        )
        self.assertEqual(status, "matched")
        self.assertEqual(payment.mpesa_code, "MPESA999")

    def test_settings_route(self):
        school = School(
            name="Masomo Academy",
            phone="+254700000000",
            email="info@masomo.ac.ke",
            address="Nairobi",
        )
        db.session.add(school)
        db.session.flush()
        db.session.add(
            FeeStructure(
                class_name="Grade 1",
                term="Term 1",
                amount=12000,
                school_id=school.id,
            )
        )
        db.session.commit()

        register_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "School Admin",
                "email": "settings@example.com",
                "password": "secret123",
                "role": "admin",
                "school_id": school.id,
            },
        )
        self.assertEqual(register_response.status_code, 201)
        token = register_response.get_json()["access_token"]

        get_response = self.client.get(
            "/api/settings",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.get_json()["school"]["name"], "Masomo Academy")
        self.assertEqual(len(get_response.get_json()["fee_structures"]), 1)

        update_response = self.client.put(
            "/api/settings",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Masomo Pay School",
                "phone": "+254711111111",
                "email": "hello@masomo.ac.ke",
                "address": "Westlands",
            },
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["school"]["name"], "Masomo Pay School")

    def test_student_portal_flow(self):
        token = self.register_admin("portal@example.com")
        student = self.create_student(token, "ADM900", "4321")

        login_response = self.client.post(
            "/api/portal/login",
            json={
                "admission_no": student["admission_no"],
                "pin": "4321",
            },
        )
        self.assertEqual(login_response.status_code, 200)
        portal_token = login_response.get_json()["access_token"]

        profile_response = self.client.get(
            "/api/portal/profile",
            headers={"Authorization": f"Bearer {portal_token}"},
        )
        self.assertEqual(profile_response.status_code, 200)
        self.assertEqual(profile_response.get_json()["student"]["admission_no"], "ADM900")

        pay_response = self.client.post(
            "/api/portal/payments/stkpush",
            headers={"Authorization": f"Bearer {portal_token}"},
            json={
                "amount": 250,
                "phone_number": "0712345678",
            },
        )
        self.assertEqual(pay_response.status_code, 202)

        payments_response = self.client.get(
            "/api/portal/payments",
            headers={"Authorization": f"Bearer {portal_token}"},
        )
        self.assertEqual(payments_response.status_code, 200)
        self.assertGreaterEqual(len(payments_response.get_json()["payments"]), 1)


if __name__ == "__main__":
    unittest.main()
