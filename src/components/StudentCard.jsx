import React from 'react';
import { calculateBalance, formatCurrency } from '../utils/helpers';

export default function StudentCard({ student, onEdit, onDelete, onPay }) {
  return (
    <article className="card student-card">
      <div className="student-card-copy">
        <h3>{student.name}</h3>
        <p className="muted">{student.admission_no}</p>
        <p className="muted">{student.class_name}</p>
      </div>
      <div className="student-card-meta">
        <span className="muted">Balance</span>
        <div className="student-balance">{formatCurrency(calculateBalance(student))}</div>
      </div>
      <div className="card-actions">
        <button type="button" className="primary-btn" onClick={() => onPay?.(student)}>
          Pay
        </button>
        <button type="button" className="secondary-btn" onClick={() => onEdit?.(student)}>
          Edit
        </button>
        <button type="button" className="danger-btn" onClick={() => onDelete?.(student)}>
          Delete
        </button>
      </div>
    </article>
  );
}
