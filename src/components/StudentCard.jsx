import React from 'react';
import { calculateBalance, formatCurrency } from '../utils/helpers';

export default function StudentCard({ student, onEdit, onDelete }) {
  return (
    <article className="card student-card">
      <div>
        <h3>{student.name}</h3>
        <p>{student.admission_no}</p>
        <p>{student.class_name}</p>
      </div>
      <div className="student-balance">{formatCurrency(calculateBalance(student))}</div>
      <div className="card-actions">
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
