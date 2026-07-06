import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStudent, updateStudent } from '../services/studentService';
import { navigateTo } from '../utils/navigation';

export default function EditStudent({ studentId }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    admission_no: '',
    class_name: '',
    parent_phone: '',
    portal_pin: '',
    balance: '',
  });
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadStudent() {
      try {
        setLoading(true);
        const data = await getStudent(studentId);
        if (!mounted) return;
        const loaded = data.student;
        setStudent(loaded);
        setForm({
          name: loaded.name || '',
          admission_no: loaded.admission_no || '',
          class_name: loaded.class_name || '',
          parent_phone: loaded.parent_phone || '',
          portal_pin: '',
          balance: loaded.balance ?? '',
        });
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load student');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadStudent();
    return () => {
      mounted = false;
    };
  }, [studentId]);

  if (user?.role !== 'admin') {
    return (
      <section style={s.shell}>
        <div style={s.card}>
          <p style={s.cardTitle}>Access restricted</p>
          <p style={s.muted}>Only the admin can edit students.</p>
          <div style={s.btnRow}>
            <button
              type="button"
              style={s.cancelBtn}
              onClick={() => navigateTo('/students')}
            >
              Back to students
            </button>
          </div>
        </div>
      </section>
    );
  }

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateStudent(studentId, {
        name: form.name,
        admission_no: form.admission_no,
        class_name: form.class_name,
        parent_phone: form.parent_phone,
        balance: Number(form.balance),
        ...(form.portal_pin ? { portal_pin: form.portal_pin } : {}),
      });
      navigateTo('/students');
    } catch (err) {
      setError(err.message || 'Could not update student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section style={s.shell}>
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Edit student</h1>
          <p style={s.pgSub}>Update student details and portal access.</p>
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

      <form style={s.card} onSubmit={handleSubmit}>
        <p style={s.cardTitle}>
          {student ? `Student #${student.id}` : 'Student details'}
        </p>

        {loading ? (
          <p style={s.muted}>Loading student...</p>
        ) : (
          <div style={s.formGrid}>
            {[
              { field: 'name', label: 'Full name', type: 'text', placeholder: 'e.g. Amina Odhiambo' },
              { field: 'admission_no', label: 'Admission number', type: 'text', placeholder: 'e.g. ADM-2024-001' },
              { field: 'class_name', label: 'Class', type: 'text', placeholder: 'e.g. Form 2A' },
              { field: 'parent_phone', label: 'Parent phone', type: 'text', placeholder: 'e.g. 0712 345 678' },
              { field: 'balance', label: 'Balance', type: 'number', placeholder: '0' },
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
              </span>
              <input
                style={s.input}
                type="password"
                value={form.portal_pin}
                placeholder="Leave blank to keep the current PIN"
                onChange={(e) => updateField('portal_pin', e.target.value)}
              />
              <small style={s.helperText}>Leave this empty if you do not want to change the portal PIN.</small>
            </label>
          </div>
        )}

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
            disabled={saving || loading}
            onMouseEnter={(e) => !saving && !loading && (e.currentTarget.style.background = '#236d43')}
            onMouseLeave={(e) => !saving && !loading && (e.currentTarget.style.background = '#1f7a4a')}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}

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
    color: '#93d48e',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  helperText: {
    fontSize: 11,
    color: '#7A7A8C',
    lineHeight: 1.4,
    marginTop: -2,
    textTransform: 'none',
    letterSpacing: 0,
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
