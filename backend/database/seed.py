from werkzeug.security import generate_password_hash

try:
    from ..database.db import db
    from ..models.fee_structure import FeeStructure
    from ..models.payment import Payment
    from ..models.school import School
    from ..models.student import Student
    from ..models.user import User
except ImportError:
    from database.db import db
    from models.fee_structure import FeeStructure
    from models.payment import Payment
    from models.school import School
    from models.student import Student
    from models.user import User


def seed_demo_data():
    if School.query.first():
        return {"created": False, "message": "Seed data already exists"}

    school = School(
        name="Masomo Academy",
        phone="+254700000000",
        email="info@masomo.ac.ke",
        address="Nairobi, Kenya",
    )
    db.session.add(school)
    db.session.flush()

    admin = User(
        name="School Admin",
        email="admin@masomo.ac.ke",
        password=generate_password_hash("admin123"),
        role="admin",
        school_id=school.id,
    )
    accountant = User(
        name="School Accountant",
        email="accountant@masomo.ac.ke",
        password=generate_password_hash("accountant123"),
        role="accountant",
        school_id=school.id,
    )
    db.session.add_all([admin, accountant])
    db.session.flush()

    fee_structures = [
        FeeStructure(class_name="Grade 1", term="Term 1", amount=12000, school_id=school.id),
        FeeStructure(class_name="Grade 2", term="Term 1", amount=13000, school_id=school.id),
        FeeStructure(class_name="Grade 3", term="Term 1", amount=14000, school_id=school.id),
    ]
    students = [
        Student(
            name="Jane Doe",
            admission_no="ADM001",
            class_name="Grade 1",
            parent_phone="0712345678",
            portal_pin_hash=generate_password_hash("1234"),
            balance=6000,
            school_id=school.id,
        ),
        Student(
            name="John Smith",
            admission_no="ADM002",
            class_name="Grade 2",
            parent_phone="0722345678",
            portal_pin_hash=generate_password_hash("5678"),
            balance=3500,
            school_id=school.id,
        ),
    ]
    db.session.add_all(fee_structures + students)
    db.session.flush()

    payments = [
        Payment(
            student_id=students[0].id,
            school_id=school.id,
            amount=6000,
            payment_method="manual",
            mpesa_code="MPS-1001",
            status="completed",
            recorded_by=admin.id,
        ),
        Payment(
            student_id=students[1].id,
            school_id=school.id,
            amount=2000,
            payment_method="stkpush",
            mpesa_code="MPS-1002",
            status="completed",
            recorded_by=accountant.id,
        ),
    ]
    db.session.add_all(payments)
    db.session.commit()
    return {"created": True, "school_id": school.id, "students": len(students), "payments": len(payments)}
