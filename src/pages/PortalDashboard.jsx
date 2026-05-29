import React, { useEffect, useMemo, useState } from 'react';
import { getPortalPayments, getPortalProfile, portalPayFees } from '../services/portalService';
import { formatCurrency, formatDate } from '../utils/helpers';

export default function PortalDashboard() {
  const [student, setStudent] = useState(null);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ amount: '', phone_number: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPortal = async () => {
    const [profileData, paymentData] = await Promise.all([getPortalProfile(), getPortalPayments()]);
    setStudent(profileData.student);
    setPayments(paymentData.payments || []);
    setForm((current) => ({ ...current, amount: profileData.student?.balance ? String(profileData.student.balance) : '' }));
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        await loadPortal();
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Could not load portal');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const recentPayments = useMemo(() => payments.slice(0, 8), [payments]);

  const submitPayment = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!form.amount || !form.phone_number) {
      setError('Enter the amount and phone number to continue.');
      return;
    }
    setSaving(true);
    try {
      await portalPayFees({
        amount: Number(form.amount),
        phone_number: form.phone_number,
      });
      setMessage('Payment request sent through IntaSend.');
      await loadPortal();
    } catch (err) {
      setError(err.message || 'Could not start payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>My Account</h1>
          <p>See your balance, payment history, and pay fees through IntaSend.</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {loading ? (
        <p className="muted">Loading portal...</p>
      ) : student ? (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <span>Student</span>
              <strong>{student.name}</strong>
            </div>
            <div className="card stat-card">
              <span>Admission No</span>
              <strong>{student.admission_no}</strong>
            </div>
            <div className="card stat-card">
              <span>Balance</span>
              <strong>{formatCurrency(student.balance)}</strong>
            </div>
          </div>

          <div className="card form-grid">
            <h2>Pay Fees</h2>
            <p className="muted">Enter the amount you want to pay and the phone number that will receive the IntaSend prompt.</p>

            <form className="form-grid" onSubmit={submitPayment}>
              <label>
                Amount
                <input
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="Enter amount"
                />
              </label>
              <label>
                Phone Number
                <input
                  value={form.phone_number}
                  onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
                  placeholder="07..."
                />
              </label>
              <div className="button-row">
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Sending...' : 'Pay with IntaSend'}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="section-header">
              <h2>Payment History</h2>
            </div>
            {recentPayments.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.payment_method}</td>
                        <td>
                          <span className={`status-pill status-${payment.status}`}>{payment.status}</span>
                        </td>
                        <td>{formatDate(payment.timestamp)}</td>
                        <td>{payment.mpesa_code || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No payments yet.</p>
            )}
          </div>
        </>
      ) : (
        <p className="muted">No student profile found.</p>
      )}
    </section>
  );
}
