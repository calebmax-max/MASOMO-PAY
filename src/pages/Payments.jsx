import React, { useEffect, useState } from 'react';
import PaymentTable from '../components/PaymentTable';
import { createManualPayment, fetchPayments, initiateSTKPush } from '../services/paymentService';
import { getStudents } from '../services/studentService';

const initialForm = {
  student_id: '',
  amount: '',
  phone_number: '',
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingManual, setSavingManual] = useState(false);
  const [savingStk, setSavingStk] = useState(false);

  const loadPayments = async () => {
    const data = await fetchPayments();
    setPayments(data.payments || []);
  };

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        const [paymentData, studentData] = await Promise.all([fetchPayments(), getStudents()]);
        if (!mounted) return;
        setPayments(paymentData.payments || []);
        setStudents(studentData.students || []);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Could not load payments');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPage();
    return () => {
      mounted = false;
    };
  }, []);

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const submitManualPayment = async (event) => {
    event.preventDefault();
    resetFeedback();
    setSavingManual(true);
    try {
      await createManualPayment({
        student_id: Number(form.student_id),
        amount: Number(form.amount),
      });
      setMessage('Manual payment saved.');
      setForm((current) => ({ ...current, amount: '' }));
      await loadPayments();
    } catch (err) {
      setError(err.message || 'Could not save manual payment');
    } finally {
      setSavingManual(false);
    }
  };

  const submitSTKPush = async () => {
    resetFeedback();
    setSavingStk(true);
    try {
      await initiateSTKPush({
        student_id: Number(form.student_id),
        amount: Number(form.amount),
        phone_number: form.phone_number,
      });
      setMessage('STK push initiated.');
      await loadPayments();
    } catch (err) {
      setError(err.message || 'Could not initiate STK push');
    } finally {
      setSavingStk(false);
    }
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Manage manual receipts and STK push requests.</p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={submitManualPayment}>
        <label>
          Student
          <select
            value={form.student_id}
            onChange={(event) => setForm({ ...form, student_id: event.target.value })}
          >
            <option value="">Select student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} - {student.admission_no}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input
            type="number"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
        </label>
        <label>
          Phone Number
          <input
            value={form.phone_number}
            onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
          />
        </label>

        <div className="button-row">
          <button type="submit" className="primary-btn" disabled={savingManual}>
            {savingManual ? 'Saving...' : 'Save Manual Payment'}
          </button>
          <button
            type="button"
            className="secondary-btn"
            onClick={submitSTKPush}
            disabled={savingStk}
          >
            {savingStk ? 'Sending...' : 'Trigger STK Push'}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}
      </form>

      <div className="card">
        <div className="section-header">
          <h2>Payment History</h2>
        </div>
        {loading ? <p className="muted">Loading payment history...</p> : <PaymentTable payments={payments} />}
      </div>
    </section>
  );
}
