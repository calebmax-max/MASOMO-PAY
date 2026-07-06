import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPortalPayments, getPortalProfile, portalPayFees } from '../services/portalService';
import { formatCurrency, formatDate } from '../utils/helpers';

const PORTAL_CACHE_KEY = 'masomo_portal_dashboard_cache_v1';

function readPortalCache() {
  try {
    const raw = localStorage.getItem(PORTAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function writePortalCache(payload) {
  try {
    localStorage.setItem(PORTAL_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore cache write failures.
  }
}

export default function PortalDashboard() {
  const cached = readPortalCache();
  const [student, setStudent] = useState(cached?.student || null);
  const [payments, setPayments] = useState(cached?.payments || []);
  const [termFees, setTermFees] = useState(cached?.term_fees || { present: null, last: null, next: null });
  const [activeTermTab, setActiveTermTab] = useState('present');
  const [form, setForm] = useState({ amount: cached?.amount || '', phone_number: '' });
  const [loading, setLoading] = useState(!cached);
  const [saving, setSaving] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const refreshTimerRef = useRef(null);
  const refreshAttemptsRef = useRef(0);
  const MAX_REFRESH_ATTEMPTS = 12;
  const REFRESH_INTERVAL_MS = 5000;

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const loadPortal = useCallback(async () => {
    const [profileData, paymentData] = await Promise.all([getPortalProfile(), getPortalPayments()]);
    const nextStudent = profileData.student;
    const nextPayments = paymentData.payments || [];
    const nextTermFees = profileData.term_fees || { present: null, last: null, next: null };
    const nextAmount = profileData.student?.balance ? String(profileData.student.balance) : '';
    setStudent(nextStudent);
    setPayments(nextPayments);
    setTermFees(nextTermFees);
    setForm((current) => ({ ...current, amount: nextAmount }));
    setIsPolling(nextPayments.some((payment) => payment.status === 'pending'));
    writePortalCache({ student: nextStudent, payments: nextPayments, term_fees: nextTermFees, amount: nextAmount });
    return nextPayments;
  }, []);

  const scheduleRefresh = useCallback((attempt = 0) => {
    clearRefreshTimer();
    if (attempt >= MAX_REFRESH_ATTEMPTS) {
      return;
    }
    refreshAttemptsRef.current = attempt;
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const nextPayments = await loadPortal();
        const stillPending = nextPayments.some((payment) => payment.status === 'pending');
        if (stillPending) {
          scheduleRefresh(attempt + 1);
        } else {
          clearRefreshTimer();
        }
      } catch (err) {
        scheduleRefresh(attempt + 1);
      }
    }, REFRESH_INTERVAL_MS);
    setIsPolling(true);
  }, [clearRefreshTimer, loadPortal]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const nextPayments = await loadPortal();
        if (mounted && nextPayments.some((payment) => payment.status === 'pending')) {
          scheduleRefresh(0);
        }
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
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, loadPortal, scheduleRefresh]);

  const successfulPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'completed').slice(0, 8),
    [payments]
  );

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
      const response = await portalPayFees({
        amount: Number(form.amount),
        phone_number: form.phone_number,
      });
      if (response.payment) {
        setPayments((current) => [response.payment, ...current.filter((item) => item.id !== response.payment.id)]);
      }
      setMessage(response.message || 'Payment request sent successfully.');
      setIsPolling(true);
      scheduleRefresh(0);
    } catch (err) {
      setError(err.message || 'Could not start payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell portal-dashboard-page">
      <div className="portal-card portal-hero">
        <div className="portal-hero-panel">
          <span className="portal-hero-kicker">Student account</span>
          <h1 className="portal-hero-title">Simple fee tracking for parents and students.</h1>
          <p className="portal-hero-copy">
            View your current balance, make a payment request, and check the latest transaction history without digging through menus.
          </p>
          <div className="portal-hero-actions">
            <button
              type="button"
              className="portal-ghost-btn"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            >
              See payment history
            </button>
            <button
              type="button"
              className="portal-ghost-btn"
              onClick={() => setForm((current) => ({ ...current, amount: student?.balance ? String(student.balance) : current.amount }))}
            >
              Use current balance
            </button>
          </div>
        </div>

        <div className="portal-hero-card">
          <div className="portal-hero-balance">
            <span>Balance due</span>
            <strong>{student ? formatCurrency(student.balance) : '—'}</strong>
            <small>Updated from your latest account data.</small>
          </div>
          <div className="portal-quick-grid">
            <div className="portal-quick-item">
              <span>Student</span>
              <strong>{student?.name || '—'}</strong>
            </div>
            <div className="portal-quick-item">
              <span>Admission No</span>
              <strong>{student?.admission_no || '—'}</strong>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="portal-error-banner">{error}</div> : null}
      {message ? <div className="portal-success-banner">{message}</div> : null}

      {loading ? (
        <p className="portal-muted">Loading portal...</p>
      ) : student ? (
        <>
          <div className="portal-card">
            <div className="section-header">
              <h2>Term fees</h2>
            </div>
            <div className="portal-tabs" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {['present', 'last', 'next'].map((tabKey) => {
                const label = tabKey === 'present' ? 'Present term' : tabKey === 'last' ? 'Last term' : 'Next term';
                const active = activeTermTab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    className={`portal-ghost-btn ${active ? 'portal-primary-btn' : ''}`}
                    onClick={() => setActiveTermTab(tabKey)}
                    style={{ minWidth: '8.5rem' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {(() => {
              const selectedFee = termFees[activeTermTab];
              if (!selectedFee) {
                return <p className="portal-empty">No fee information available for this term yet.</p>;
              }
              return (
                <div className="portal-hero-card" style={{ padding: '1rem' }}>
                  <div className="portal-hero-balance">
                    <span>{activeTermTab === 'present' ? 'Present term fee' : activeTermTab === 'last' ? 'Last term fee' : 'Next term fee'}</span>
                    <strong>{formatCurrency(selectedFee.amount || 0)}</strong>
                    <small>{selectedFee.term_name || 'Term fee'}</small>
                  </div>
                  {(selectedFee.start_date || selectedFee.end_date) ? (
                    <p className="portal-help">
                      {selectedFee.start_date && selectedFee.end_date
                        ? `${selectedFee.start_date} to ${selectedFee.end_date}`
                        : selectedFee.start_date || selectedFee.end_date}
                    </p>
                  ) : null}
                </div>
              );
            })()}
          </div>

          <div className="portal-card portal-form">
            <h2>Pay Fees</h2>
            <p className="portal-help">Enter amount and phone number.</p>

            <form className="portal-form" onSubmit={submitPayment}>
              <label>
                Amount
                <input
                  className="portal-input"
                  type="number"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="Amount"
                />
              </label>
              <label>
                Phone Number
                <input
                  className="portal-input"
                  value={form.phone_number}
                  onChange={(event) => setForm({ ...form, phone_number: event.target.value })}
                  placeholder="Phone number"
                />
              </label>
              <div className="button-row">
                <button type="submit" className="portal-primary-btn" disabled={saving}>
                  {saving ? 'Sending STK...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>

          <div className="portal-card">
            <div className="section-header">
              <h2>Successful Payment History</h2>
            </div>
            {successfulPayments.length ? (
              <div className="portal-table-wrap">
                <table className="portal-table">
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
                    {successfulPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>{payment.payment_method}</td>
                        <td>
                          <span className={`status-pill portal-status-${payment.status}`}>
                            {getStatusLabel(payment.status, payment.status === 'pending' && isPolling)}
                          </span>
                        </td>
                        <td>{formatDate(payment.timestamp)}</td>
                        <td>{payment.mpesa_code || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="portal-empty">No successful payments yet.</p>
            )}
          </div>
        </>
      ) : (
        <p className="portal-empty">No student profile found.</p>
      )}
    </section>
  );
}

function getStatusLabel(status, isChecking = false) {
  if (status === 'pending' && isChecking) {
    return 'Checking...';
  }
  switch (status) {
    case 'completed':
      return 'Successful';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'unmatched':
      return 'Unmatched';
    case 'duplicate':
      return 'Duplicate';
    default:
      return status || 'Unknown';
  }
}
