import React, { useEffect, useState } from 'react';
import { fetchPayments } from '../services/paymentService';
import { apiRequest } from '../services/api';
import { getStudents } from '../services/studentService';
import { formatCurrency } from '../utils/helpers';
import { navigateTo } from '../utils/navigation';

export default function Dashboard() {
  const [summary, setSummary] = useState({ total_students: 0, total_collections: 0, total_balances: 0 });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const [summaryData, paymentData, studentData] = await Promise.all([
          apiRequest('/api/reports/summary'),
          fetchPayments(),
          getStudents(),
        ]);
        if (!mounted) return;
        setSummary({
          ...summaryData,
          total_students: studentData.students?.length || 0,
        });
        setPayments((paymentData.payments || []).slice(0, 5));
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Could not load dashboard');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Quick school fee overview.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => navigateTo('/payments')}>
          Record Payment
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="stats-grid">
        <div className="card stat-card">
          <span>Total Students</span>
          <strong>{summary.total_students}</strong>
        </div>
        <div className="card stat-card">
          <span>Total Collected</span>
          <strong>{formatCurrency(summary.total_collections)}</strong>
        </div>
        <div className="card stat-card">
          <span>Pending Balances</span>
          <strong>{formatCurrency(summary.total_balances)}</strong>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Recent Payments</h2>
        </div>
        {loading ? (
          <p className="muted">Loading dashboard...</p>
        ) : payments.length ? (
          <ul className="mini-list">
            {payments.map((payment) => (
              <li key={payment.id}>
                <span>{payment.student_name || payment.student_admission_no || payment.payment_method}</span>
                <strong>{formatCurrency(payment.amount)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No payment activity yet.</p>
        )}
      </div>
    </section>
  );
}
