import React from 'react';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function PaymentTable({ payments = [] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Date</th>
            <th>Reference</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td>
                {payment.student_name || payment.student_admission_no || payment.student_id || '-'}
              </td>
              <td>{formatCurrency(payment.amount)}</td>
              <td>{payment.payment_method}</td>
              <td>
                <span className={`status-pill status-${payment.status}`}>{payment.status}</span>
              </td>
              <td>{formatDate(payment.timestamp)}</td>
              <td>{payment.mpesa_code || '-'}</td>
            </tr>
          ))}
          {!payments.length ? (
            <tr>
              <td colSpan="6" className="empty-state">
                No payments found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
