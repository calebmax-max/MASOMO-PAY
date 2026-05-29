import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createStudent } from '../services/studentService';
import { navigateTo } from '../utils/navigation';

export default function AddStudent() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    admission_no: '',
    class_name: '',
    parent_phone: '',
    portal_pin: '',
    balance: 0,
  });
  const [showPortalPin, setShowPortalPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => setForm((c) => ({ ...c, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createStudent({
        ...form,
        school_id: user?.school_id || null,
        balance: Number(form.balance),
      });
      navigateTo('/students');
    } catch (err) {
      setError(err.message || 'Could not create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={s.shell}>

      {/* ── Header ── */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Add student</h1>
          <p style={s.pgSub}>Create a new student record and opening balance.</p>
        </div>
        <button
          type="button"
          style={s.backBtn}
          onClick={() => navigateTo('/students')}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1E28')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <BackIcon /> Back to students
        </button>
      </div>

      {/* ── Form ── */}
      <form style={s.card} onSubmit={handleSubmit}>
        <p style={s.cardTitle}>Student details</p>

        <div style={s.formGrid}>
          {[
            { field: 'name',         label: 'Full name',         type: 'text',   placeholder: 'e.g. Amina Odhiambo' },
            { field: 'admission_no', label: 'Admission number',  type: 'text',   placeholder: 'e.g. ADM-2024-001' },
            { field: 'class_name',   label: 'Class',             type: 'text',   placeholder: 'e.g. Form 2A' },
            { field: 'parent_phone', label: 'Parent phone',      type: 'text',   placeholder: 'e.g. 0712 345 678' },
            { field: 'balance',      label: 'Opening balance',   type: 'number', placeholder: '0' },
          ].map(({ field, label, type, placeholder }) => (
            <label key={field} style={s.label}>
              {label}
              <input
                style={s.input}
                type={type}
                value={form[field]}
                placeholder={placeholder}
                onChange={(e) => updateField(field, e.target.value)}
              />
            </label>
          ))}

          <label style={s.label}>
            <span style={s.labelRow}>
              <span>Portal PIN</span>
              <button
                type="button"
                style={s.showBtn}
                onClick={() => setShowPortalPin((current) => !current)}
              >
                {showPortalPin ? 'Hide' : 'Show'}
              </button>
            </span>
            <input
              style={s.input}
              type={showPortalPin ? 'text' : 'password'}
              value={form.portal_pin}
              placeholder="Set a PIN for parent login"
              onChange={(e) => updateField('portal_pin', e.target.value)}
            />
          </label>
        </div>

        {error && <div style={s.errorBanner}><AlertIcon />{error}</div>}

        <div style={s.btnRow}>
          <button
            type="button"
            style={s.cancelBtn}
            onClick={() => navigateTo('/students')}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={s.submitBtn}
            disabled={loading}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#1A3D5C')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#1A2F4A')}
          >
            {loading ? 'Saving…' : 'Create student'}
          </button>
        </div>
      </form>
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
function BackIcon() {
  return (
    <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
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
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 14px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: 'transparent',
    color: '#7A7A8C',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: 0,
    paddingBottom: 12,
    borderBottom: '0.5px solid #2A2A38',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
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
  labelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  showBtn: {
    border: '0',
    background: 'transparent',
    color: '#7BB8F4',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
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
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 4,
    borderTop: '0.5px solid #2A2A38',
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
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
};
