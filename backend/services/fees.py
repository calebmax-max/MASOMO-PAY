try:
    from ..models.fee_structure import FeeStructure
except ImportError:
    from models.fee_structure import FeeStructure


def _normalize_class_names(raw_class_names):
    if isinstance(raw_class_names, str):
        return [part.strip().lower() for part in raw_class_names.split(",") if part.strip()]
    if isinstance(raw_class_names, (list, tuple, set)):
        return [str(item).strip().lower() for item in raw_class_names if str(item).strip()]
    if raw_class_names:
        return [str(raw_class_names).strip().lower()]
    return []


def _matches_class(fee_structure, class_key):
    if not fee_structure or not fee_structure.class_name:
        return False
    return class_key in _normalize_class_names(fee_structure.class_name)


def get_fee_structure_for_term(school_id, class_name, academic_term):
    """Return the FeeStructure that applies to this student's class for the
    given academic term, preferring a match keyed by academic_term_id and
    falling back to a match keyed by term name (mirrors the lookup that used
    to live inline in portal.get_student_term_fees)."""
    if not academic_term or not school_id:
        return None

    class_key = (class_name or "").strip().lower()

    by_term_id = FeeStructure.query.filter_by(
        school_id=school_id, academic_term_id=academic_term.id
    ).all()
    match = next((fs for fs in by_term_id if _matches_class(fs, class_key)), None)
    if match:
        return match

    if academic_term.name:
        term_key = academic_term.name.strip().lower()
        by_name = [
            fs
            for fs in FeeStructure.query.filter_by(school_id=school_id).all()
            if fs.term and fs.term.strip().lower() == term_key
        ]
        match = next((fs for fs in by_name if _matches_class(fs, class_key)), None)

    return match