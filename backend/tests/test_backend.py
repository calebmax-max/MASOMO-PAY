import unittest

from app import create_app
from database.db import db
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

    def create_student(self, token, admission_no="ADM001"):
        response = self.client.post(
            "/api/students",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Jane Doe",
                "admission_no": admission_no,
                "class_name": "Grade 1",
                "parent_phone": "0712345678",
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


if __name__ == "__main__":
    unittest.main()
