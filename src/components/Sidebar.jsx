import React from 'react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

const links = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Students',  path: '/students',  icon: 'ti-users'            },
  { label: 'Payments',  path: '/payments',  icon: 'ti-cash'             },
  { label: 'Reports',   path: '/reports',   icon: 'ti-chart-bar'        },
  { label: 'Settings',  path: '/settings',  icon: 'ti-settings'         },
];

export default function Sidebar({ activePath }) {
  const { user } = useAuth();
  const current = activePath || (typeof window !== 'undefined' ? window.location.pathname : '');

  return (
    <aside style={s.sidebar}>

      {/* ── Brand ── */}
      <div style={s.brand}>
        <div style={s.brandMark}>
          <img
            src="/masomo-logo.png"
            alt="Masomo Pay"
            style={s.brandLogo}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/logo192.png';
            }}
          />
        </div>
        <div>
          <p style={s.brandName}>Masomo Pay</p>
          <p style={s.brandSub}>Fee management</p>
        </div>
      </div>

      {/* ── Nav links ── */}
      <nav style={s.nav}>
        <p style={s.navSection}>Menu</p>
        {links.map(({ label, path, icon }) => {
          const active = current === path || current.startsWith(path + '/');
          const isStudents = path === '/students';
          return (
            <button
              key={path}
              type="button"
              style={{ ...s.link, ...(active ? s.linkActive : {}) }}
              onClick={() => navigateTo(path)}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#13241a'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {active && <span style={s.activeBar} />}
                <i
                  className={`ti ${icon}`}
                  aria-hidden="true"
                  style={{ ...s.icon, color: active ? '#93d48e' : '#7A7A8C' }}
                />
              <span style={s.linkText}>
                {label}
                {isStudents && user?.role === 'accountant' ? <small style={s.linkBadge}>view only</small> : null}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={s.footer}>
        <div style={s.footerDot} />
        <span style={s.footerText}>Connected</span>
      </div>
    </aside>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */
const s = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    borderRight: '0.5px solid rgba(67, 184, 106, 0.14)',
    background: 'linear-gradient(180deg, #0f172a, #111827)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    padding: '1.25rem 0',
    fontFamily: "'DM Sans', var(--font-sans, system-ui, sans-serif)",
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 1.25rem 1.25rem',
    borderBottom: '0.5px solid rgba(67, 184, 106, 0.14)',
    marginBottom: '1rem',
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: '#10261a',
    border: '0.5px solid rgba(67, 184, 106, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  brandLogo: {
    width: 30,
    height: 30,
    objectFit: 'contain',
    display: 'block',
  },
  brandName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: 0,
    letterSpacing: '-0.01em',
  },
  brandSub: {
    fontSize: 11,
    color: '#93d48e',
    marginTop: 1,
    marginBottom: 0,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  navSection: {
    fontSize: 10,
    fontWeight: 500,
    color: '#6b8d74',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '0 1.25rem',
    margin: '0 0 6px',
  },
  link: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 1.25rem',
    border: 'none',
    background: 'transparent',
    color: '#91a79a',
    fontSize: 14,
    fontWeight: 400,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s, color 0.1s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  linkActive: {
    background: '#10261a',
    color: '#93d48e',
    fontWeight: 500,
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 3,
    height: 18,
    borderRadius: '0 3px 3px 0',
    background: '#43b86a',
  },
  icon: {
    fontSize: 18,
    flexShrink: 0,
  },
  linkText: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  linkBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: '#93d48e',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '1rem 1.25rem 0',
    borderTop: '0.5px solid rgba(67, 184, 106, 0.14)',
    marginTop: 'auto',
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: '#43b86a',
    flexShrink: 0,
  },
  footerText: {
    fontSize: 12,
    color: '#7A7A8C',
  },
};
