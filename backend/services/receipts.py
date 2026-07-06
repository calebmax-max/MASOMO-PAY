from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

try:
    from ..utils.helpers import format_currency
except ImportError:
    from utils.helpers import format_currency


PORTAL_GREEN = colors.HexColor("#43b86a")
PORTAL_GREEN_DARK = colors.HexColor("#1f7a4a")
PORTAL_TEXT = colors.HexColor("#0f172a")
PORTAL_MUTED = colors.HexColor("#64748b")
PORTAL_BORDER = colors.HexColor("#d7e5da")
PORTAL_SURFACE = colors.HexColor("#f8faf4")
PORTAL_HEAD = colors.HexColor("#eef6f0")


def build_receipt_data(payment, student=None):
    return {
        "receipt_no": getattr(payment, "mpesa_code", None),
        "student_name": getattr(student, "name", None),
        "amount": format_currency(payment.amount),
        "status": payment.status,
    }


def generate_receipt_pdf(payment, student=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
    )
    styles = _build_styles()
    story = []
    generated_at = datetime.now()

    story.append(Paragraph("Masomo Pay", styles["ReportKicker"]))
    story.append(Paragraph("Payment receipt", styles["ReportTitle"]))
    story.append(Paragraph("A short confirmation of one successful transaction.", styles["ReportSubtitle"]))
    story.append(Spacer(1, 10))

    summary_rows = [
        _info_cell("Student", getattr(student, "name", "-"), styles),
        _info_cell("Amount", format_currency(payment.amount), styles),
        _info_cell("Status", payment.status.title() if getattr(payment, "status", None) else "-", styles),
        _info_cell("Reference", getattr(payment, "mpesa_code", "-") or "-", styles),
    ]
    story.append(_summary_table(summary_rows, cols=2))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Transaction details", styles["ReportSection"]))
    transaction_rows = [
        ["Date", _format_timestamp(getattr(payment, "timestamp", None))],
        ["Payment method", _display_payment_method(getattr(payment, "payment_method", None))],
        ["Generated", generated_at.strftime("%d %b %Y, %I:%M %p")],
    ]
    story.append(_detail_table(transaction_rows))

    doc.build(
        story,
        onFirstPage=_page_decorations("Payment receipt"),
        onLaterPages=_page_decorations("Payment receipt"),
    )
    buffer.seek(0)
    return buffer.getvalue()


def generate_statement_pdf(student, payments):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
    )
    styles = _build_styles()
    story = []
    generated_at = datetime.now()

    payment_rows = list(payments or [])
    total_paid = sum(float(getattr(payment, "amount", 0) or 0) for payment in payment_rows)

    story.append(Paragraph("Masomo Pay", styles["ReportKicker"]))
    story.append(Paragraph("Student record", styles["ReportTitle"]))
    story.append(Paragraph("A clean downloadable summary with the latest balance and payment history.", styles["ReportSubtitle"]))
    story.append(Spacer(1, 10))

    summary_data = [
        _info_cell("Student", getattr(student, "name", "-"), styles),
        _info_cell("Admission no", getattr(student, "admission_no", "-"), styles),
        _info_cell("Class", getattr(student, "class_name", "-") or "-", styles),
        _info_cell("Balance", format_currency(getattr(student, "balance", 0) or 0), styles),
        _info_cell("Successful payments", str(len(payment_rows)), styles),
        _info_cell("Total paid", format_currency(total_paid), styles),
    ]
    story.append(_summary_table(summary_data, cols=3))
    story.append(Spacer(1, 12))

    detail_rows = [
        ["Admission no", getattr(student, "admission_no", "-") or "-"],
        ["Class", getattr(student, "class_name", "-") or "-"],
        ["Current balance", format_currency(getattr(student, "balance", 0) or 0)],
        ["Generated", generated_at.strftime("%d %b %Y, %I:%M %p")],
    ]
    story.append(Paragraph("Student details", styles["ReportSection"]))
    story.append(_detail_table(detail_rows))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Successful payment history", styles["ReportSection"]))
    if payment_rows:
        table_data = [["Date", "Method", "Amount", "Reference"]]
        for payment in payment_rows:
            table_data.append(
                [
                    _format_timestamp(getattr(payment, "timestamp", None)),
                    _display_payment_method(getattr(payment, "payment_method", None)),
                    format_currency(getattr(payment, "amount", 0) or 0),
                    getattr(payment, "mpesa_code", "-") or "-",
                ]
            )
        story.append(_payments_table(table_data))
    else:
        story.append(Paragraph("No successful payments recorded for this student yet.", styles["ReportBody"]))

    doc.build(
        story,
        onFirstPage=_page_decorations("Student record"),
        onLaterPages=_page_decorations("Student record"),
    )
    buffer.seek(0)
    return buffer.getvalue()


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportKicker",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=PORTAL_GREEN_DARK,
            alignment=TA_LEFT,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=PORTAL_TEXT,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReportSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13,
            textColor=PORTAL_MUTED,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReportSection",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=14,
            textColor=PORTAL_TEXT,
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReportBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=12.5,
            textColor=PORTAL_TEXT,
        )
    )
    return styles


def _summary_table(cells, cols=2):
    rows = [cells[i : i + cols] for i in range(0, len(cells), cols)]
    table = Table(rows, colWidths=[(A4[0] - 36 * mm) / cols] * cols, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, PORTAL_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, PORTAL_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def _info_cell(label, value, styles):
    return Paragraph(
        f'<para><font name="Helvetica-Bold" size="8.5" color="#64748b">{label}</font><br/>'
        f'<font name="Helvetica-Bold" size="11" color="#0f172a">{value}</font></para>',
        styles["Normal"],
    )


def _detail_table(rows):
    table = Table(rows, colWidths=[42 * mm, 110 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.8, PORTAL_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, PORTAL_BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TEXTCOLOR", (0, 0), (-1, -1), PORTAL_TEXT),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [PORTAL_HEAD, colors.white]),
            ]
        )
    )
    return table


def _payments_table(rows):
    table = Table(rows, colWidths=[48 * mm, 34 * mm, 34 * mm, 44 * mm], hAlign="LEFT", repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PORTAL_GREEN_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEADING", (0, 0), (-1, -1), 11),
                ("BOX", (0, 0), (-1, -1), 0.8, PORTAL_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, PORTAL_BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PORTAL_SURFACE]),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("TEXTCOLOR", (0, 1), (-1, -1), PORTAL_TEXT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return table


def _display_payment_method(payment_method):
    return "cash" if payment_method == "manual" else "mpesa"


def _format_timestamp(value):
    if not value:
        return "-"
    try:
        return value.strftime("%d %b %Y, %I:%M %p")
    except AttributeError:
        return str(value)


def _page_decorations(title):
    def draw(canvas, doc):
        canvas.saveState()
        width, height = A4
        page_no = canvas.getPageNumber()
        timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")

        canvas.setFillColor(PORTAL_GREEN_DARK)
        canvas.rect(0, height - 12 * mm, width, 12 * mm, stroke=0, fill=1)

        canvas.setFillColor(PORTAL_TEXT)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(doc.leftMargin, height - 17 * mm, "Masomo Pay")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(PORTAL_MUTED)
        canvas.drawString(doc.leftMargin, height - 21 * mm, title)

        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(width - doc.rightMargin, height - 17 * mm, f"Page {page_no}")
        canvas.drawRightString(width - doc.rightMargin, height - 21 * mm, "Downloaded report")

        canvas.setStrokeColor(PORTAL_BORDER)
        canvas.setLineWidth(0.8)
        canvas.line(doc.leftMargin, 14 * mm, width - doc.rightMargin, 14 * mm)

        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(PORTAL_MUTED)
        canvas.drawString(doc.leftMargin, 9 * mm, f"Generated {timestamp}")
        canvas.drawRightString(width - doc.rightMargin, 9 * mm, "Confidential school finance record")

        canvas.restoreState()

    return draw


