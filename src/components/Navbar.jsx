import React from 'react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
    : 'G';

  return (
    <header style={s.navbar}>

      {/* ── Brand ── */}
      <button type="button" style={s.brand} onClick={() => navigateTo('/dashboard')}>
        <div style={s.brandMark}>
          <img
            src="/masomo-logo.png"
            alt=""
            aria-hidden="true"
            style={s.brandLogo}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/logo192.png';
            }}
          />
        </div>
        <span style={s.brandName}>Masomo Pay</span>
      </button>

      {/* ── Actions ── */}
      <div style={s.actions}>

        {/* Notifications */}
        <button
          type="button"
          style={s.iconBtn}
          aria-label="Notifications"
          onMouseEnter={(e) => (e.currentTarget.style.background = '#1C1E28')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <i className="ti ti-bell" aria-hidden="true" style={{ fontSize: 18, color: '#7A7A8C' }} />
        </button>

        {/* Divider */}
        <div style={s.divider} />

        {/* User chip */}
        <div style={s.userChip}>
          <div style={s.avatar}>{initials}</div>
          <div style={s.userInfo}>
            <span style={s.userName}>{user?.name || 'Guest'}</span>
            <small style={s.userRole}>{user?.role || 'user'}</small>
          </div>
        </div>

        {/* Logout */}
        <button
          type="button"
          style={s.logoutBtn}
          onClick={logout}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2A1010')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: 15 }} />
          Logout
        </button>
      </div>
    </header>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const s = {
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 1.5rem',
    background: '#0D0F16',
    borderBottom: '0.5px solid #2A2A38',
    fontFamily: "'DM Sans', var(--font-sans, system-ui, sans-serif)",
    flexShrink: 0,
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 9,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 7,
    background: '#0C2A44',
    border: '0.5px solid #1A3D5C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#F0F0F2',
    letterSpacing: '-0.01em',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.1s',
    flexShrink: 0,
  },
  divider: {
    width: '0.5px',
    height: 20,
    background: '#2A2A38',
    margin: '0 4px',
  },
  userChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    padding: '4px 10px 4px 4px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#161820',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#0C2A44',
    color: '#7BB8F4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.2,
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#F0F0F2',
  },
  userRole: {
    fontSize: 10,
    color: '#7A7A8C',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: 'transparent',
    color: '#F09595',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
};
