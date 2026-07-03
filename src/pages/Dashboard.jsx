import React, { useEffect, useState } from 'react';
import { fetchPayments } from '../services/paymentService';
import { apiRequest } from '../services/api';
import { getStudents } from '../services/studentService';
import { formatCurrency } from '../utils/helpers';
import { navigateTo } from '../utils/navigation';

const AVATAR_COLORS = [
  { bg: '#0C2A44', fg: '#7BB8F4' },
  { bg: '#0A2A22', fg: '#5DCAA5' },
  { bg: '#1E1A3A', fg: '#AFA9EC' },
  { bg: '#2A1F08', fg: '#EF9F27' },
  { bg: '#2A0E1A', fg: '#ED93B1' },
];

const METRIC_ACCENTS = {
  blue:  { bar: '#378ADD', iconBg: '#0C2A44', iconFg: '#7BB8F4', valColor: '#7BB8F4' },
  teal:  { bar: '#1D9E75', iconBg: '#0A2A22', iconFg: '#5DCAA5', valColor: '#5DCAA5' },
  amber: { bar: '#EF9F27', iconBg: '#2A1F08', iconFg: '#EF9F27', valColor: '#EF9F27' },
};

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function formatShort(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `KSh ${Math.round(n / 1_000)}K`;
  return `KSh ${n.toLocaleString()}`;
}

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
        setSummary({ ...summaryData, total_students: studentData.students?.length || 0 });
        setPayments((paymentData.payments || []).slice(0, 5));
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadDashboard();
    return () => { mounted = false; };
  }, []);

  return (
    <section style={s.wrap}>

      {/* ── Top bar ── */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Dashboard</h1>
          <p style={s.pgSub}>Quick school fee overview</p>
        </div>
        <button
          type="button"
          style={s.recBtn}
          onClick={() => navigateTo('/payments')}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1A3D5C')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1A2F4A')}
        >
          <PlusIcon /> Record payment
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={s.err}>
          <AlertIcon />
          {error}
        </div>
      )}

      {/* ── Metrics ── */}
      <div style={s.metrics}>
        <MetricCard
          label="Total students"
          value={summary.total_students.toLocaleString()}
          sub="Enrolled this term"
          iconClass="ti-users"
          accent="blue"
        />
        <MetricCard
          label="Total collected"
          value={formatShort(summary.total_collections)}
          sub="Across all classes"
          iconClass="ti-cash"
          accent="teal"
        />
        <MetricCard
          label="Pending balances"
          value={formatShort(summary.total_balances)}
          sub="Outstanding fees"
          iconClass="ti-clock"
          accent="amber"
        />
      </div>

      {/* ── Recent payments ── */}
      <div style={s.panel}>
        <div style={s.panelHead}>
          <span style={s.panelTitle}>Recent payments</span>
          {!loading && <span style={s.pill}>{payments.length} recent</span>}
        </div>

        {loading ? (
          <p style={s.empty}>Loading dashboard…</p>
        ) : payments.length ? (
          <ul style={s.list}>
            {payments.map((payment, i) => {
              const name = payment.student_name || payment.student_admission_no || payment.payment_method || 'Unknown';
              const { bg, fg } = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <PaymentRow
                  key={payment.id}
                  name={name}
                  avatarBg={bg}
                  avatarFg={fg}
                  method={payment.payment_method}
                  amount={formatCurrency(payment.amount)}
                />
              );
            })}
          </ul>
        ) : (
          <p style={s.empty}>No payment activity yet.</p>
        )}
      </div>
    </section>
  );
}

/* ─── MetricCard ─────────────────────────────────────────────── */
function MetricCard({ label, value, sub, iconClass, accent }) {
  const { bar, iconBg, iconFg, valColor } = METRIC_ACCENTS[accent];
  return (
    <div style={s.metric}>
      <div style={{ ...s.metricBar, background: bar }} />
      <div style={s.metricTop}>
        <span style={s.metricLabel}>{label}</span>
        <span style={{ ...s.metricIcon, background: iconBg, color: iconFg }}>
          <i className={`ti ${iconClass}`} aria-hidden="true" style={{ fontSize: 15 }} />
        </span>
      </div>
      <p style={{ ...s.metricVal, color: valColor }}>{value}</p>
      <p style={s.metricSub}>{sub}</p>
    </div>
  );
}

/* ─── PaymentRow ─────────────────────────────────────────────── */
function PaymentRow({ name, avatarBg, avatarFg, method, amount }) {
  const [hovered, setHovered] = useState(false);
  return (
    <li
      style={{ ...s.prow, background: hovered ? '#1C1E28' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ ...s.av, background: avatarBg, color: avatarFg }}>{getInitials(name)}</div>
      <div style={s.pinfo}>
        <p style={s.pname}>{name}</p>
        {method && <p style={s.pmeta}>{method === 'manual' ? 'cash' : 'mpesa'}</p>}
      </div>
      <span style={s.pamt}>{amount}</span>
      <span style={s.statusBadge}>Paid</span>
    </li>
  );
}

/* ─── Icons ──────────────────────────────────────────────────── */
const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };

function PlusIcon() {
  return (
    <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const s = {
  wrap: {
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
  recBtn: {
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
  },
  err: {
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
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
    marginBottom: '1.5rem',
  },
  metric: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    overflow: 'hidden',
    position: 'relative',
  },
  metricBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  metricTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: '#7A7A8C',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricVal: {
    fontSize: 30,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '-0.03em',
    lineHeight: 1,
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
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  prow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 1.25rem',
    borderBottom: '0.5px solid #2A2A38',
    transition: 'background 0.1s',
  },
  av: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  pinfo: {
    flex: 1,
    minWidth: 0,
  },
  pname: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F0F0F2',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  pmeta: {
    fontSize: 11,
    color: '#7A7A8C',
    marginTop: 2,
    marginBottom: 0,
  },
  pamt: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    color: '#F0F0F2',
    flexShrink: 0,
  },
  statusBadge: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 999,
    background: '#0A2A22',
    color: '#5DCAA5',
    fontWeight: 500,
    flexShrink: 0,
  },
  empty: {
    padding: '2.5rem',
    textAlign: 'center',
    fontSize: 13,
    color: '#7A7A8C',
    margin: 0,
  },
};
