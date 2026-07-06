import React, { useEffect, useState } from 'react';
import PaymentTable from '../components/PaymentTable';
import { createManualPayment, fetchPayments } from '../services/paymentService';
import { getStudent, getStudents } from '../services/studentService';
import { calculateBalance, formatCurrency } from '../utils/helpers';

const initialForm = { student_id: '', amount: '' };
const PAYMENTS_CACHE_KEY = 'masomo_payments_cache_v1';

function readPaymentsCache() {
  try {
    const raw = localStorage.getItem(PAYMENTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    return null;
  }
}

function writePaymentsCache(payload) {
  try {
    localStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore cache write failures.
  }
}

export default function Payments() {
  const cached = readPaymentsCache();
  const [payments, setPayments] = useState(cached?.payments || []);
  const [form, setForm] = useState(initialForm);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cached);
  const [savingManual, setSavingManual] = useState(false);

  const loadPayments = async () => {
    const data = await fetchPayments();
    const nextPayments = (data.payments || []).filter((payment) => payment.status === 'completed');
    setPayments(nextPayments);
    writePaymentsCache({ payments: nextPayments });
    return nextPayments;
  };

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        const paymentData = await fetchPayments();
        if (!mounted) return;
        const nextPayments = (paymentData.payments || []).filter((payment) => payment.status === 'completed');
        setPayments(nextPayments);
        writePaymentsCache({ payments: nextPayments });

        const params = new URLSearchParams(window.location.search);
        const studentId = params.get('student_id');
        if (studentId) {
          const data = await getStudent(studentId);
          if (!mounted || !data.student) return;
          setSelectedStudent(data.student);
          setForm((current) => ({ ...current, student_id: String(data.student.id) }));
          setStudentSearch(`${data.student.name} - ${data.student.admission_no}`);
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load payments');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPage();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const term = studentSearch.trim();

    if (!term || term.length < 2) {
      setStudentResults([]);
      setStudentSearchLoading(false);
      return () => {
        mounted = false;
      };
    }

    setStudentSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await getStudents(term);
        if (mounted) {
          setStudentResults(data.students || []);
        }
      } catch (err) {
        if (mounted) {
          setStudentResults([]);
        }
      } finally {
        if (mounted) {
          setStudentSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [studentSearch]);

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setForm((current) => ({ ...current, student_id: String(student.id) }));
    setStudentSearch(`${student.name} - ${student.admission_no}`);
    setStudentResults([]);
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
      await createManualPayment({ student_id: Number(form.student_id), amount: Number(form.amount) });
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
    <section style={s.shell}>
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Payments</h1>
          <p style={s.pgSub}>Manage payment records.</p>
        </div>
      </div>

      <form style={s.card} onSubmit={submitManualPayment}>
        <p style={s.cardTitle}>Record payment</p>

        <label style={s.label}>
          Search student
          <input
            style={s.input}
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              if (!e.target.value) {
                setSelectedStudent(null);
                setForm((current) => ({ ...current, student_id: '' }));
              }
            }}
            placeholder="Search name or admission"
          />
        </label>

        {studentSearchLoading ? <p style={s.muted}>Searching students...</p> : null}

        {studentResults.length > 0 && (
          <div style={s.searchResults}>
            {studentResults.slice(0, 8).map((student) => (
              <button
                key={student.id}
                type="button"
                style={{
                  ...s.searchItem,
                  ...(String(form.student_id) === String(student.id) ? s.searchItemActive : {}),
                }}
                onClick={() => selectStudent(student)}
              >
                <span style={s.searchName}>{student.name}</span>
                <small style={s.searchMeta}>{student.admission_no}</small>
                <small style={s.searchMeta}>{student.class_name}</small>
                <strong style={s.searchBal}>{formatCurrency(calculateBalance(student))}</strong>
              </button>
            ))}
          </div>
        )}

        {!studentResults.length && studentSearch.trim().length >= 2 && !studentSearchLoading ? (
          <p style={s.muted}>No matching students found.</p>
        ) : null}

        <label style={s.label}>
          Amount (KES)
          <input
            style={s.input}
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
          />
        </label>

        {selectedStudent && (
          <div style={s.selectedInfo}>
            Paying for <span style={{ color: '#93d48e', fontWeight: 500 }}>{selectedStudent.name}</span>{' '}
            <span style={{ color: '#7A7A8C' }}>({selectedStudent.admission_no})</span>
          </div>
        )}

        {error && (
          <div style={s.errorBanner}>
            <AlertIcon />
            {error}
          </div>
        )}
        {message && (
          <div style={s.successBanner}>
            <CheckIcon />
            {message}
          </div>
        )}

        <div style={s.btnRow}>
          <button
            type="submit"
            style={s.submitBtn}
            disabled={savingManual}
            onMouseEnter={(e) => !savingManual && (e.currentTarget.style.background = '#236d43')}
            onMouseLeave={(e) => !savingManual && (e.currentTarget.style.background = '#1f7a4a')}
          >
            {savingManual ? 'Saving...' : 'Save payment'}
          </button>
        </div>
      </form>

      <div style={s.card}>
        <p style={s.cardTitle}>Payment history</p>
        {loading ? <p style={s.muted}>Loading payment history...</p> : <PaymentTable payments={payments} />}
      </div>
    </section>
  );
}

const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };

function AlertIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const s = {
  shell: {
    padding: '1.5rem',
    fontFamily: "'DM Sans', var(--font-sans, system-ui, sans-serif)",
    background: '#0F1117',
    borderRadius: 12,
    minHeight: '100vh',
  },
  topbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  pgTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: '0 0 3px',
    letterSpacing: '-0.02em',
  },
  pgSub: {
    fontSize: 13,
    color: '#7A7A8C',
    marginTop: 3,
    marginBottom: 0,
  },
  card: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: 0,
    paddingBottom: 12,
    borderBottom: '0.5px solid #2A2A38',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#7A7A8C',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    padding: '9px 12px',
    fontSize: 13,
    border: '0.5px solid #2A2A38',
    borderRadius: 8,
    background: '#0F1117',
    color: '#F0F0F2',
    outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  searchResults: {
    border: '0.5px solid #2A2A38',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#0F1117',
  },
  searchItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 14px',
    background: 'transparent',
    border: 'none',
    borderBottom: '0.5px solid #2A2A38',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    transition: 'background 0.1s',
  },
  searchItemActive: {
    background: '#10261a',
  },
  searchName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F0F0F2',
  },
  searchMeta: {
    fontSize: 11,
    color: '#7A7A8C',
  },
  searchBal: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e9b24e',
    fontFamily: "'DM Mono', monospace",
  },
  selectedInfo: {
    fontSize: 13,
    color: '#7A7A8C',
    padding: '8px 12px',
    background: '#10261a',
    border: '0.5px solid rgba(67, 184, 106, 0.22)',
    borderRadius: 8,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid #7B2020',
    background: '#2A1010',
    color: '#F09595',
    fontSize: 13,
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid #1A4A34',
    background: '#0A2A22',
    color: '#93d48e',
    fontSize: 13,
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#1f7a4a',
    color: '#dff5e5',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    margin: 0,
    textAlign: 'center',
    padding: '1.5rem 0',
  },
};
