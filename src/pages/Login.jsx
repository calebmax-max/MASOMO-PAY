import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@masomo.ac.ke');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={s.shell}>
      <div style={s.center}>

        {/* ── Logo + Header ── */}
        <div style={s.topbar}>
          <img src="/logo512.png" alt="Masomo logo" style={s.logo} />
          <div>
            <h1 style={s.pgTitle}>Masomo Pay</h1>
            <p style={s.pgSub}>Login to manage school fees, balances, and payments.</p>
          </div>
        </div>

        {/* ── Login card ── */}
        <div style={s.card}>
          <p style={s.cardTitle}>Sign in</p>
          <form style={s.formGrid} onSubmit={handleSubmit}>
            {[
              { field: 'email',    label: 'Email',    type: 'email',    value: email,    setter: setEmail },
              { field: 'password', label: 'Password', type: 'password', value: password, setter: setPassword },
            ].map(({ field, label, type, value, setter }) => (
              <label key={field} style={s.label}>
                {label}
                <input
                  style={s.input}
                  type={type}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                />
              </label>
            ))}

            {error && (
              <div style={s.errorBanner}>
                <AlertIcon />
                {error}
              </div>
            )}

            <div style={s.btnRow}>
              <button
                type="button"
                style={s.secondaryBtn}
                onClick={() => navigateTo('/portal/login')}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1E28')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Student / Parent Portal
              </button>
              <button
                type="submit"
                style={s.submitBtn}
                disabled={loading}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#1A3D5C')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#1A2F4A')}
              >
                {loading ? 'Signing in…' : 'Login'}
              </button>
            </div>
          </form>
        </div>

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: '100%',
    maxWidth: 420,
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: '2rem',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    flexShrink: 0,
    objectFit: 'contain',
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
  btnRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 4,
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
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