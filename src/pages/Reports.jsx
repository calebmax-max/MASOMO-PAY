import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { downloadReportBundle } from '../services/reportService';
import { formatCurrency } from '../utils/helpers';

const REPORT_CARDS = [
  { key: 'total_students',    label: 'Total students',    accent: '#7BB8F4', iconBg: '#0C2A44', bar: '#378ADD' },
  { key: 'total_collections', label: 'Total collections', accent: '#5DCAA5', iconBg: '#0A2A22', bar: '#1D9E75' },
  { key: 'total_balances',    label: 'Total balances',    accent: '#EF9F27', iconBg: '#2A1F08', bar: '#EF9F27' },
];

function formatVal(key, value) {
  if (key === 'total_students') return Number(value || 0).toLocaleString();
  return formatCurrency(value);
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    apiRequest('/api/reports/summary')
      .then((data) => { if (mounted) setSummary(data); })
      .catch((err) => { if (mounted) setError(err.message || 'Could not load report summary'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadReportBundle();
    } catch (err) {
      setError(err.message || 'Could not download report bundle');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section style={s.shell}>

      {/* ── Header ── */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Reports</h1>
          <p style={s.pgSub}>Fee summaries, balances, and collections.</p>
        </div>
        <button
          type="button"
          style={s.downloadBtn}
          onClick={handleDownload}
          disabled={downloading || loading}
          onMouseEnter={(e) => !(downloading || loading) && (e.currentTarget.style.background = '#1A3D5C')}
          onMouseLeave={(e) => !(downloading || loading) && (e.currentTarget.style.background = '#1A2F4A')}
        >
          {downloading ? 'Preparing download...' : 'Download reports'}
        </button>
      </div>

      {error && (
        <div style={s.errorBanner}>
          <AlertIcon /> {error}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div style={s.metricsGrid}>
        {REPORT_CARDS.map(({ key, label, accent, iconBg, bar }) => (
          <div key={key} style={s.metricCard}>
            <div style={{ ...s.metricBar, background: bar }} />
            <div style={s.metricTop}>
              <span style={s.metricLabel}>{label}</span>
              <span style={{ ...s.metricIcon, background: iconBg, color: accent }}>
                <i className={`ti ${key === 'total_students' ? 'ti-users' : key === 'total_collections' ? 'ti-cash' : 'ti-clock'}`} aria-hidden="true" style={{ fontSize: 15 }} />
              </span>
            </div>
            {loading ? (
              <p style={{ ...s.metricVal, color: '#7A7A8C' }}>—</p>
            ) : summary ? (
              <p style={{ ...s.metricVal, color: accent }}>{formatVal(key, summary[key])}</p>
            ) : (
              <p style={{ ...s.metricVal, color: '#7A7A8C' }}>N/A</p>
            )}
            <p style={s.metricSub}>
              {key === 'total_students' ? 'Enrolled this term' : key === 'total_collections' ? 'Across all classes' : 'Outstanding fees'}
            </p>
          </div>
        ))}
      </div>

      {/* ── Detail panel ── */}
      <div style={s.panel}>
        <div style={s.panelHead}>
          <span style={s.panelTitle}>Summary breakdown</span>
        </div>
        {loading ? (
          <p style={s.muted}>Loading report summary…</p>
        ) : summary ? (
          <div style={s.summaryList}>
            {REPORT_CARDS.map(({ key, label, accent }) => (
              <div key={key} style={s.summaryRow}>
                <span style={s.summaryKey}>{label}</span>
                <span style={{ ...s.summaryVal, color: accent }}>{formatVal(key, summary[key])}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={s.muted}>No report data available.</p>
        )}
      </div>
    </section>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */
const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };
function AlertIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
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
  downloadBtn: {
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
    whiteSpace: 'nowrap',
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
    overflow: 'hidden',
    position: 'relative',
  },
  metricBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
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
  summaryList: {
    padding: '0.5rem 0',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 1.25rem',
    borderBottom: '0.5px solid #2A2A38',
  },
  summaryKey: {
    fontSize: 13,
    color: '#7A7A8C',
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '-0.02em',
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    margin: 0,
    textAlign: 'center',
    padding: '2rem',
  },
};
