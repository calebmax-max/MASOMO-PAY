try:
    from .fee_structure import FeeStructure
    from .payment import Payment
    from .school import School
    from .student import Student
    from .user import User
except ImportError:
    from models.fee_structure import FeeStructure
    from models.payment import Payment
    from models.school import School
    from models.student import Student
    from models.user import User
