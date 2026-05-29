import React, { useEffect, useMemo, useState } from 'react';
import PaymentTable from '../components/PaymentTable';
import { createManualPayment, fetchPayments } from '../services/paymentService';
import { getStudents } from '../services/studentService';
import { calculateBalance, formatCurrency } from '../utils/helpers';

const initialForm = {
  student_id: '',
  amount: '',
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingManual, setSavingManual] = useState(false);

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

        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('student_id');
        if (studentId) {
          const student = (studentData.students || []).find((item) => String(item.id) === String(studentId));
          if (student) {
            setForm((current) => ({ ...current, student_id: String(student.id) }));
            setSelectedStudent(student);
            setStudentSearch(`${student.name} - ${student.admission_no}`);
          }
        }
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

  const filteredStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) {
      return students;
    }
    return students.filter((student) => {
      const haystack = [student.name, student.admission_no, student.class_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [studentSearch, students]);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setForm((current) => ({ ...current, student_id: String(student.id) }));
    setStudentSearch(`${student.name} - ${student.admission_no}`);
  };

  const submitManualPayment = async (event) => {
    event.preventDefault();
    resetFeedback();
    if (!form.student_id || !form.amount) {
      setError('Select a student and enter an amount.');
      return;
    }
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

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Record a payment after a parent has paid and keep the fee ledger updated.</p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={submitManualPayment}>
        <label>
          Search Student
          <input
            className="search-input"
            value={studentSearch}
            onChange={(event) => {
              setStudentSearch(event.target.value);
              const exactMatch = students.find((student) => {
                const haystack = `${student.name} - ${student.admission_no}`.toLowerCase();
                return haystack === event.target.value.trim().toLowerCase();
              });
              if (!event.target.value) {
                setSelectedStudent(null);
                setForm((current) => ({ ...current, student_id: '' }));
              } else if (exactMatch) {
                selectStudent(exactMatch);
              }
            }}
            placeholder="Type a name or admission number"
          />
        </label>
        {filteredStudents.length ? (
          <div className="student-search-results">
            {filteredStudents.slice(0, 8).map((student) => (
              <button
                key={student.id}
                type="button"
                className={`student-search-item ${String(form.student_id) === String(student.id) ? 'is-selected' : ''}`}
                onClick={() => selectStudent(student)}
              >
                <span className="student-search-name">{student.name}</span>
                <small>{student.admission_no}</small>
                <small>{student.class_name}</small>
                <strong>{formatCurrency(calculateBalance(student))}</strong>
              </button>
            ))}
          </div>
        ) : studentSearch ? (
          <p className="muted">No matching students found.</p>
        ) : null}
        <label>
          Amount
          <input
            type="number"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />
        </label>

        {selectedStudent ? (
          <div className="muted">
            Paying for <strong>{selectedStudent.name}</strong> ({selectedStudent.admission_no})
          </div>
        ) : null}

        <div className="button-row">
          <button type="submit" className="primary-btn" disabled={savingManual}>
            {savingManual ? 'Saving...' : 'Save Payment'}
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
