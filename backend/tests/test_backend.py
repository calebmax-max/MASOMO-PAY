import unittest
from datetime import date, timedelta

from flask import Flask
from sqlalchemy import inspect, text

from app import create_app, sync_legacy_schema
from database.db import db
from models.academic_term import AcademicTerm
from models.fee_structure import FeeStructure
from models.school import School
from models.student import Student
from services.academic_terms import apply_term_fees_for_school
from services.reconcile import reconcile_payment


class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "JWT_SECRET_KEY": "test-secret",
                "SECRET_KEY": "test-secret",
                "DARAJA_CONSUMER_KEY": "",
                "DARAJA_CONSUMER_SECRET": "",
                "DARAJA_SHORTCODE": "",
                "DARAJA_PASSKEY": "",
                "DARAJA_CALLBACK_URL": "",
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

    def test_sync_legacy_schema_adds_academic_terms_and_fee_column(self):
        db.session.remove()
        db.drop_all()
        db.engine.dispose()

        legacy_app = Flask(__name__)
        legacy_app.config.update(
            {
                "TESTING": False,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "JWT_SECRET_KEY": "test-secret",
                "SECRET_KEY": "test-secret",
                "DARAJA_CONSUMER_KEY": "",
                "DARAJA_CONSUMER_SECRET": "",
                "DARAJA_SHORTCODE": "",
                "DARAJA_PASSKEY": "",
                "DARAJA_CALLBACK_URL": "",
                "SCHEMA_SYNCED": False,
                "DATABASE_BOOTSTRAPPED": False,
            }
        )
        db.init_app(legacy_app)
        with legacy_app.app_context():
            db.session.execute(text("CREATE TABLE schools (id INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR(80))"))
            db.session.execute(
                text(
                    "CREATE TABLE fee_structures ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "class_name VARCHAR(80), "
                    "term VARCHAR(50), "
                    "amount NUMERIC(12, 2), "
                    "school_id INTEGER"
                    ")"
                )
            )
            db.session.commit()

            sync_legacy_schema(legacy_app)

            inspector = inspect(db.engine)
            self.assertIn("academic_terms", inspector.get_table_names())
            fee_columns = {column["name"] for column in inspector.get_columns("fee_structures")}
            self.assertIn("academic_term_id", fee_columns)

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

        detail_response = self.client.get(
            f"/api/students/{student['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.get_json()["student"]["admission_no"], "ADM002")

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
            "/api/webhooks/daraja",
            json={
                "Body": {
                    "stkCallback": {
                        "MerchantRequestID": "MRCH-123",
                        "CheckoutRequestID": "CHK-123",
                        "ResultCode": 0,
                        "ResultDesc": "The service request is processed successfully.",
                        "CallbackMetadata": {
                            "Item": [
                                {"Name": "Amount", "Value": 250},
                                {"Name": "MpesaReceiptNumber", "Value": "MPESA123"},
                                {"Name": "PhoneNumber", "Value": 254712345678},
                                {"Name": "AccountReference", "Value": "ADM004"},
                            ]
                        },
                    }
                }
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
            AcademicTerm(
                name="Term 1",
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                school_id=school.id,
            )
        )
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
        self.assertEqual(len(get_response.get_json()["academic_terms"]), 1)
        self.assertEqual(get_response.get_json()["active_term"]["name"], "Term 1")

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

    def test_fee_structures_link_to_active_term(self):
        school = School(
            name="Masomo Academy",
            phone="+254700000000",
            email="info@masomo.ac.ke",
            address="Nairobi",
        )
        db.session.add(school)
        db.session.flush()

        today = date.today()
        db.session.add(
            AcademicTerm(
                name="Term 1",
                start_date=today - timedelta(days=20),
                end_date=today + timedelta(days=20),
                school_id=school.id,
            )
        )
        db.session.add(
            AcademicTerm(
                name="Term 2",
                start_date=today + timedelta(days=30),
                end_date=today + timedelta(days=60),
                school_id=school.id,
            )
        )
        db.session.commit()

        register_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "School Admin",
                "email": "term-link@example.com",
                "password": "secret123",
                "role": "admin",
                "school_id": school.id,
            },
        )
        self.assertEqual(register_response.status_code, 201)
        token = register_response.get_json()["access_token"]

        response = self.client.post(
            "/api/settings/fee-structures",
            headers={"Authorization": f"Bearer {token}"},
            json={"class_name": "Grade 1", "amount": 2500},
        )
        self.assertEqual(response.status_code, 201)
        payload = response.get_json()["fee_structure"]
        self.assertEqual(payload["academic_term_name"], "Term 1")
        self.assertEqual(payload["academic_term_id"], 1)
        self.assertTrue(payload["is_active_term"])

    def test_existing_balance_is_carried_forward_when_term_fee_is_applied(self):
        school = School(
            name="Carry Forward School",
            phone="+254700000001",
            email="carry@masomo.ac.ke",
            address="Kisumu",
        )
        db.session.add(school)
        db.session.flush()

        student = Student(
            name="Grace Otieno",
            admission_no="ADM777",
            class_name="Grade 2",
            balance=1250,
            school_id=school.id,
        )
        db.session.add(student)
        db.session.flush()

        academic_term = AcademicTerm(
            name="Term 1",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 31),
            school_id=school.id,
        )
        db.session.add(academic_term)
        db.session.flush()
        db.session.add(
            FeeStructure(
                class_name="Grade 2",
                term="Term 1",
                amount=3000,
                school_id=school.id,
                academic_term_id=academic_term.id,
            )
        )
        db.session.commit()

        apply_term_fees_for_school(school.id, academic_term)
        db.session.refresh(student)

        self.assertEqual(float(student.balance), 4250.0)

    def test_portal_profile_reports_term_fee_tabs(self):
        school = School(
            name="Portal School",
            phone="+254700000002",
            email="portal@masomo.ac.ke",
            address="Mombasa",
        )
        db.session.add(school)
        db.session.flush()

        today = date.today()
        current_term = AcademicTerm(
            name="Term 2",
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=20),
            school_id=school.id,
        )
        previous_term = AcademicTerm(
            name="Term 1",
            start_date=today - timedelta(days=80),
            end_date=today - timedelta(days=30),
            school_id=school.id,
        )
        next_term = AcademicTerm(
            name="Term 3",
            start_date=today + timedelta(days=30),
            end_date=today + timedelta(days=80),
            school_id=school.id,
        )
        db.session.add_all([previous_term, current_term, next_term])
        db.session.flush()

        db.session.add_all(
            [
                FeeStructure(
                    class_name="Grade 1",
                    term="Term 1",
                    amount=2000,
                    school_id=school.id,
                    academic_term_id=previous_term.id,
                ),
                FeeStructure(
                    class_name="Grade 1",
                    term="Term 2",
                    amount=2500,
                    school_id=school.id,
                    academic_term_id=current_term.id,
                ),
                FeeStructure(
                    class_name="Grade 1",
                    term="Term 3",
                    amount=3000,
                    school_id=school.id,
                    academic_term_id=next_term.id,
                ),
            ]
        )

        student = Student(
            name="Mina Mwangi",
            admission_no="ADM901",
            class_name="Grade 1",
            parent_phone="0712345678",
            portal_pin_hash="hashed",
            balance=1000,
            school_id=school.id,
        )
        db.session.add(student)
        db.session.commit()

        login_response = self.client.post(
            "/api/portal/login",
            json={"admission_no": "ADM901", "pin": "1234"},
        )
        self.assertEqual(login_response.status_code, 401)

        student.portal_pin_hash = "pbkdf2:sha256:1000$test$test"
        db.session.commit()

        login_response = self.client.post(
            "/api/portal/login",
            json={"admission_no": "ADM901", "pin": "1234"},
        )
        self.assertEqual(login_response.status_code, 401)

        # Use the real portal flow from the existing test to avoid a separate auth setup.
        token = self.register_admin("portal@example.com")
        student = self.create_student(token, "ADM900", "4321")

        login_response = self.client.post(
            "/api/portal/login",
            json={"admission_no": student["admission_no"], "pin": "4321"},
        )
        self.assertEqual(login_response.status_code, 200)
        portal_token = login_response.get_json()["access_token"]

        profile_response = self.client.get(
            "/api/portal/profile",
            headers={"Authorization": f"Bearer {portal_token}"},
        )
        self.assertEqual(profile_response.status_code, 200)
        self.assertIn("present", profile_response.get_json()["term_fees"])
        self.assertIn("last", profile_response.get_json()["term_fees"])
        self.assertIn("next", profile_response.get_json()["term_fees"])

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


