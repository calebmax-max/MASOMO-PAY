import React, { useEffect, useMemo, useState } from 'react';
import { getStudentReport } from '../services/reportService';
import { formatCurrency, formatDate } from '../utils/helpers';
import { navigateTo } from '../utils/navigation';

export default function StudentReport({ studentId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadReport() {
      try {
        setLoading(true);
        setError('');
        const data = await getStudentReport(studentId);
        if (mounted) setReport(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load student report');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReport();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  const payments = useMemo(
    () => (report?.payments || []).filter((payment) => payment.status !== 'failed'),
    [report]
  );
  const student = report?.student || null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="student-report-page" style={s.shell}>
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Student report</h1>
          <p style={s.pgSub}>A full view of balance and payment history.</p>
        </div>
        <div style={s.actionRow}>
          <button
            type="button"
            className="report-no-print"
            style={s.secondaryBtn}
            onClick={() => navigateTo('/students')}
          >
            Back to students
          </button>
          <button
            type="button"
            className="report-no-print"
            style={s.primaryBtn}
            onClick={() => navigateTo(`/payments?student_id=${studentId}`)}
          >
            Record payment
          </button>
          <button
            type="button"
            className="report-no-print"
            style={{ ...s.secondaryBtn, ...(student ? {} : s.disabledBtn) }}
            onClick={handlePrint}
            disabled={!student}
          >
            Print report
          </button>
        </div>
      </div>

      {error && (
        <div className="report-error" style={s.errorBanner}>
          <AlertIcon />
          {error}
        </div>
      )}

      {loading ? (
        <p style={s.muted}>Loading student report...</p>
      ) : student ? (
        <>
          <div style={s.metricsGrid}>
            <div className="report-metric" style={s.metricCard}>
              <span style={s.metricLabel}>Student</span>
              <strong style={s.metricValue}>{student.name}</strong>
              <p style={s.metricSub}>{student.admission_no}</p>
            </div>
            <div className="report-metric" style={s.metricCard}>
              <span style={s.metricLabel}>Class</span>
              <strong style={s.metricValue}>{student.class_name || '-'}</strong>
              <p style={s.metricSub}>Current class placement</p>
            </div>
            <div className="report-metric" style={s.metricCard}>
              <span style={s.metricLabel}>Balance</span>
              <strong style={{ ...s.metricValue, color: '#EF9F27' }}>
                {formatCurrency(student.balance)}
              </strong>
              <p style={s.metricSub}>Outstanding fees</p>
            </div>
          </div>

          <div className="report-panel" style={s.panel}>
            <div style={s.panelHead}>
              <span style={s.panelTitle}>Recent payments</span>
              <span style={s.pill}>{payments.length} record{payments.length === 1 ? '' : 's'}</span>
            </div>

            {payments.length ? (
              <div style={s.tableWrap}>
                <table className="report-table" style={s.table}>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.payment_method === 'manual' ? 'cash' : (payment.payment_method || 'mpesa')}</td>
                        <td>
                          <span
                            className="report-status"
                            style={{
                              ...s.statusPill,
                              ...(payment.status === 'completed'
                                ? s.statusCompleted
                                : payment.status === 'pending'
                                  ? s.statusPending
                                  : s.statusOther),
                            }}
                          >
                            {payment.status || 'unknown'}
                          </span>
                        </td>
                        <td>{formatDate(payment.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={s.emptyState}>No payments recorded for this student yet.</p>
            )}
          </div>
        </>
      ) : (
        <p style={s.emptyState}>No student report found.</p>
      )}
    </section>
  );
}

const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };

function AlertIcon() {
  return (
    <svg
      style={{ ...ico, flexShrink: 0 }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
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
    gap: 12,
    marginBottom: '2rem',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
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
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#1A2F4A',
    color: '#7BB8F4',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: 'transparent',
    color: '#7A7A8C',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  disabledBtn: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
    marginBottom: '1.25rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    marginBottom: '1.5rem',
  },
  metricCard: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
  },
  metricLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: '#7A7A8C',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  },
  metricValue: {
    display: 'block',
    fontSize: 24,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: '0 0 6px',
  },
  metricSub: {
    fontSize: 11,
    color: '#7A7A8C',
    margin: 0,
  },
  panel: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '0.5px solid #2A2A38',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F0F0F2',
  },
  pill: {
    fontSize: 11,
    padding: '3px 10px',
    borderRadius: 999,
    background: '#0C2A44',
    color: '#7BB8F4',
    fontWeight: 500,
    border: '0.5px solid #1A3D5C',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    color: '#F0F0F2',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  statusCompleted: {
    background: '#0A2A22',
    color: '#5DCAA5',
  },
  statusPending: {
    background: '#2A1F08',
    color: '#EF9F27',
  },
  statusOther: {
    background: '#2A1010',
    color: '#F09595',
  },
  emptyState: {
    fontSize: 13,
    color: '#7A7A8C',
    textAlign: 'center',
    margin: 0,
    padding: '2rem',
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    textAlign: 'center',
    margin: 0,
    padding: '2rem',
  },
};
