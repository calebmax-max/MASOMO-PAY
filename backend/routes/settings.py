from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt
from sqlalchemy.exc import IntegrityError

try:
    from ..database.db import db
    from ..middleware.auth_middleware import role_required
    from ..models.academic_term import AcademicTerm
    from ..models.fee_structure import FeeStructure
    from ..models.school import School
    from ..services.academic_terms import get_active_term, parse_iso_date
    from ..utils.validators import require_fields
except ImportError:
    from database.db import db
    from middleware.auth_middleware import role_required
    from models.academic_term import AcademicTerm
    from models.fee_structure import FeeStructure
    from models.school import School
    from services.academic_terms import get_active_term, parse_iso_date
    from utils.validators import require_fields

settings_bp = Blueprint('settings', __name__)


def _resolve_fee_structure_term(school_id, payload, existing_fee_structure=None):
    academic_term_id = payload.get('academic_term_id') or payload.get('term_id')
    if academic_term_id is not None:
        academic_term = AcademicTerm.query.filter_by(id=academic_term_id, school_id=school_id).first()
        if academic_term:
            return academic_term, None, None
        return None, {'error': 'validation_error', 'message': 'Select one of the configured academic terms'}, 400

    if existing_fee_structure and existing_fee_structure.academic_term_id is not None and 'term' not in payload and 'academic_term_id' not in payload and 'term_id' not in payload:
        return existing_fee_structure.academic_term, None, None

    term_name = payload.get('term')
    if isinstance(term_name, str):
        term_name = term_name.strip()
    if term_name:
        academic_term = AcademicTerm.query.filter_by(school_id=school_id).filter(AcademicTerm.name.ilike(term_name)).first()
        if academic_term:
            return academic_term, None, None

    active_term = get_active_term(school_id)
    if active_term:
        return active_term, None, None

    return None, {'error': 'validation_error', 'message': 'Select one of the configured academic terms'}, 400


def serialize_fee_structure(fee_structure, active_term_id=None):
    return {
        'id': fee_structure.id,
        'class_name': fee_structure.class_name,
        'term': fee_structure.term,
        'amount': float(fee_structure.amount or 0),
        'school_id': fee_structure.school_id,
        'academic_term_id': fee_structure.academic_term_id,
        'academic_term_name': fee_structure.academic_term.name if fee_structure.academic_term else fee_structure.term,
        'is_active_term': active_term_id is not None and fee_structure.academic_term_id == active_term_id,
    }


def serialize_academic_term(academic_term, active_term_id=None):
    return {
        'id': academic_term.id,
        'name': academic_term.name,
        'start_date': academic_term.start_date.isoformat() if academic_term.start_date else None,
        'end_date': academic_term.end_date.isoformat() if academic_term.end_date else None,
        'school_id': academic_term.school_id,
        'is_active': active_term_id is not None and academic_term.id == active_term_id,
    }


def serialize_school(school):
    return {
        'id': school.id,
        'name': school.name,
        'phone': school.phone,
        'email': school.email,
        'address': school.address,
    }


def _get_school_id_or_404():
    claims = get_jwt()
    school_id = claims.get('school_id')
    if not school_id:
        return None, (jsonify({'error': 'not_found', 'message': 'No school is assigned to this account'}), 404)
    return school_id, None


def _validate_term_dates(school_id, term_name, start_date, end_date, term_id=None):
    overlapping = AcademicTerm.query.filter_by(school_id=school_id)
    if term_id is not None:
        overlapping = overlapping.filter(AcademicTerm.id != term_id)

    for existing in overlapping.all():
        if existing.name.strip().lower() == term_name.strip().lower():
            return 'conflict', 'Academic term name already exists'
        if existing.start_date and existing.end_date and existing.start_date <= end_date and existing.end_date >= start_date:
            return 'conflict', 'Academic term dates overlap an existing term'

    return None, None


@settings_bp.get('')
@role_required('admin', 'accountant', 'staff')
def get_settings():
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    school = School.query.get_or_404(school_id)
    fee_structures = (
        FeeStructure.query.filter_by(school_id=school.id)
        .order_by(FeeStructure.class_name.asc(), FeeStructure.term.asc())
        .all()
    )
    academic_terms = AcademicTerm.query.filter_by(school_id=school.id).order_by(AcademicTerm.start_date.asc()).all()
    active_term = get_active_term(school.id)
    active_term_id = active_term.id if active_term else None

    return jsonify(
        {
            'school': serialize_school(school),
            'fee_structures': [serialize_fee_structure(fee_structure, active_term_id) for fee_structure in fee_structures],
            'academic_terms': [serialize_academic_term(term, active_term_id) for term in academic_terms],
            'active_term': serialize_academic_term(active_term, active_term_id) if active_term else None,
        }
    )


@settings_bp.put('')
@role_required('admin')
def update_settings():
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    school = School.query.get_or_404(school_id)
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ['name'])
    if missing:
        return jsonify({'error': 'validation_error', 'missing': missing}), 400

    school.name = payload['name'].strip()
    school.phone = payload.get('phone')
    school.email = payload.get('email')
    school.address = payload.get('address')
    db.session.commit()

    return jsonify({'school': serialize_school(school)})


@settings_bp.post('/academic-terms')
@role_required('admin', 'accountant')
def create_academic_term():
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ['name', 'start_date', 'end_date'])
    if missing:
        return jsonify({'error': 'validation_error', 'missing': missing}), 400

    try:
        start_date = parse_iso_date(payload['start_date'])
        end_date = parse_iso_date(payload['end_date'])
    except ValueError:
        return jsonify({'error': 'validation_error', 'message': 'Invalid term dates'}), 400

    if end_date < start_date:
        return jsonify({'error': 'validation_error', 'message': 'Term end date must be after the start date'}), 400

    conflict_type, message = _validate_term_dates(school_id, payload['name'], start_date, end_date)
    if conflict_type:
        return jsonify({'error': conflict_type, 'message': message}), 409

    academic_term = AcademicTerm(
        name=payload['name'].strip(),
        start_date=start_date,
        end_date=end_date,
        school_id=school_id,
    )
    db.session.add(academic_term)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'conflict', 'message': 'Academic term already exists'}), 409

    active_term = get_active_term(school_id)
    active_term_id = active_term.id if active_term else None
    return jsonify({'academic_term': serialize_academic_term(academic_term, active_term_id)}), 201


@settings_bp.put('/academic-terms/<int:academic_term_id>')
@role_required('admin', 'accountant')
def update_academic_term(academic_term_id):
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    academic_term = AcademicTerm.query.filter_by(id=academic_term_id, school_id=school_id).first_or_404()
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ['name', 'start_date', 'end_date'])
    if missing:
        return jsonify({'error': 'validation_error', 'missing': missing}), 400

    try:
        start_date = parse_iso_date(payload['start_date'])
        end_date = parse_iso_date(payload['end_date'])
    except ValueError:
        return jsonify({'error': 'validation_error', 'message': 'Invalid term dates'}), 400

    if end_date < start_date:
        return jsonify({'error': 'validation_error', 'message': 'Term end date must be after the start date'}), 400

    conflict_type, message = _validate_term_dates(school_id, payload['name'], start_date, end_date, term_id=academic_term.id)
    if conflict_type:
        return jsonify({'error': conflict_type, 'message': message}), 409

    academic_term.name = payload['name'].strip()
    academic_term.start_date = start_date
    academic_term.end_date = end_date
    db.session.commit()

    active_term = get_active_term(school_id)
    active_term_id = active_term.id if active_term else None
    return jsonify({'academic_term': serialize_academic_term(academic_term, active_term_id)})


@settings_bp.delete('/academic-terms/<int:academic_term_id>')
@role_required('admin', 'accountant')
def delete_academic_term(academic_term_id):
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    academic_term = AcademicTerm.query.filter_by(id=academic_term_id, school_id=school_id).first_or_404()
    db.session.delete(academic_term)
    db.session.commit()
    return jsonify({'message': 'academic_term_deleted'})


@settings_bp.put('/fee-structures/<int:fee_structure_id>')
@role_required('admin', 'accountant')
def update_fee_structure(fee_structure_id):
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    fee_structure = FeeStructure.query.filter_by(id=fee_structure_id, school_id=school_id).first_or_404()
    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ['class_name', 'amount'])
    if missing:
        return jsonify({'error': 'validation_error', 'missing': missing}), 400

    academic_term, error_response, status_code = _resolve_fee_structure_term(school_id, payload, existing_fee_structure=fee_structure)
    if error_response:
        return jsonify(error_response), status_code

    fee_structure.class_name = payload['class_name'].strip()
    fee_structure.term = academic_term.name if academic_term else (payload.get('term') or '').strip()
    fee_structure.academic_term_id = academic_term.id if academic_term else None
    fee_structure.amount = payload['amount']
    db.session.commit()

    return jsonify({'fee_structure': serialize_fee_structure(fee_structure, active_term_id=academic_term.id if academic_term else None)})


@settings_bp.post('/fee-structures')
@role_required('admin', 'accountant')
def create_fee_structure():
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    payload = request.get_json(silent=True) or {}
    missing = require_fields(payload, ['class_name', 'amount'])
    if missing:
        return jsonify({'error': 'validation_error', 'missing': missing}), 400

    academic_term, error_response, status_code = _resolve_fee_structure_term(school_id, payload)
    if error_response:
        return jsonify(error_response), status_code

    fee_structure = FeeStructure(
        class_name=payload['class_name'].strip(),
        term=academic_term.name if academic_term else (payload.get('term') or '').strip(),
        amount=payload['amount'],
        school_id=school_id,
        academic_term_id=academic_term.id if academic_term else None,
    )
    db.session.add(fee_structure)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'error': 'conflict', 'message': 'Fee structure already exists'}), 409

    return jsonify({'fee_structure': serialize_fee_structure(fee_structure, active_term_id=academic_term.id if academic_term else None)}), 201


@settings_bp.delete('/fee-structures/<int:fee_structure_id>')
@role_required('admin', 'accountant')
def delete_fee_structure(fee_structure_id):
    school_id, error_response = _get_school_id_or_404()
    if error_response:
        return error_response

    fee_structure = FeeStructure.query.filter_by(id=fee_structure_id, school_id=school_id).first_or_404()
    db.session.delete(fee_structure)
    db.session.commit()
    return jsonify({'message': 'fee_structure_deleted'})
