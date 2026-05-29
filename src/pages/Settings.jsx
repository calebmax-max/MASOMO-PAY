import React, { useEffect, useState } from 'react';
import { getSchoolSettings, updateSchoolSettings } from '../services/schoolService';

const initialForm = { name: '', phone: '', email: '', address: '' };

export default function Settings() {
  const [form, setForm] = useState(initialForm);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        setLoading(true);
        setError('');
        const data = await getSchoolSettings();
        if (!mounted) return;
        setForm({
          name: data.school?.name || '',
          phone: data.school?.phone || '',
          email: data.school?.email || '',
          address: data.school?.address || '',
        });
        setFeeStructures(data.fee_structures || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSettings();
    return () => { mounted = false; };
  }, []);

  const updateField = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await updateSchoolSettings(form);
      setForm({
        name: data.school?.name || '',
        phone: data.school?.phone || '',
        email: data.school?.email || '',
        address: data.school?.address || '',
      });
      setMessage('School settings updated.');
    } catch (err) {
      setError(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={s.shell}>

      {/* ── Header ── */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Settings</h1>
          <p style={s.pgSub}>Manage your school profile and fee structure.</p>
        </div>
      </div>

      {/* ── School profile form ── */}
      <div style={s.card}>
        <p style={s.cardTitle}>School profile</p>
        {loading ? (
          <p style={s.muted}>Loading school settings…</p>
        ) : (
          <form style={s.formGrid} onSubmit={handleSubmit}>
            {[
              { field: 'name',    label: 'School name',  type: 'text' },
              { field: 'phone',   label: 'Phone',        type: 'text' },
              { field: 'email',   label: 'Email',        type: 'email' },
              { field: 'address', label: 'Address',      type: 'text' },
            ].map(({ field, label, type }) => (
              <label key={field} style={s.label}>
                {label}
                <input
                  style={s.input}
                  type={type}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </label>
            ))}

            {error && <div style={s.errorBanner}><AlertIcon />{error}</div>}
            {message && <div style={s.successBanner}><CheckIcon />{message}</div>}

            <div style={s.btnRow}>
              <button
                type="submit"
                style={s.submitBtn}
                disabled={saving}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#1A3D5C')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#1A2F4A')}
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Fee structure ── */}
      <div style={s.card}>
        <p style={s.cardTitle}>Fee structure</p>
        {feeStructures.length ? (
          <div style={s.feeList}>
            {feeStructures.map((item) => (
              <div key={item.id} style={s.feeRow}>
                <span style={s.feeLabel}>{item.class_name} — {item.term}</span>
                <span style={s.feeAmt}>KES {Number(item.amount || 0).toLocaleString('en-KE')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={s.muted}>No fee structure has been configured yet.</p>
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
function CheckIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
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
  card: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: '0 0 1.25rem',
    paddingBottom: 12,
    borderBottom: '0.5px solid #2A2A38',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
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
    color: '#5DCAA5',
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
    background: '#1A2F4A',
    color: '#7BB8F4',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  feeList: {
    display: 'flex',
    flexDirection: 'column',
  },
  feeRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '11px 0',
    borderBottom: '0.5px solid #2A2A38',
  },
  feeLabel: {
    fontSize: 13,
    color: '#7A7A8C',
  },
  feeAmt: {
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "'DM Mono', monospace",
    color: '#5DCAA5',
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    margin: 0,
    textAlign: 'center',
    padding: '1.5rem 0',
  },
};