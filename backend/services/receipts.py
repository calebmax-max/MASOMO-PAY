from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

try:
    from ..utils.helpers import format_currency
except ImportError:
    from utils.helpers import format_currency


def build_receipt_data(payment, student=None):
    return {
        "receipt_no": getattr(payment, "mpesa_code", None),
        "student_name": getattr(student, "name", None),
        "amount": format_currency(payment.amount),
        "status": payment.status,
    }


def generate_receipt_pdf(payment, student=None):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.drawString(50, 800, "Receipt")
    pdf.drawString(50, 780, f"Student: {getattr(student, 'name', '')}")
    pdf.drawString(50, 760, f"Amount: {format_currency(payment.amount)}")
    pdf.drawString(50, 740, f"Status: {payment.status}")
    pdf.drawString(50, 720, f"Reference: {getattr(payment, 'mpesa_code', '')}")
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()


def generate_statement_pdf(student, payments):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.drawString(50, 800, f"Statement: {student.name}")
    pdf.drawString(50, 780, f"Balance: {format_currency(student.balance)}")
    y_position = 760
    for payment in payments:
        pdf.drawString(50, y_position, f"{getattr(payment, 'timestamp', '')} {format_currency(payment.amount)} {payment.status}")
        y_position -= 20
        if y_position < 60:
            pdf.showPage()
            y_position = 800
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()
