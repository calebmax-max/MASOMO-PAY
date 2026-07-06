import React from 'react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { navigateTo } from '../utils/navigation';

export default function PortalLayout({ children }) {
  const { student, logout } = usePortalAuth();

  return (
    <div className="portal-shell">
      <header className="portal-navbar">
        <button type="button" className="portal-brand" onClick={() => navigateTo('/portal/dashboard')}>
          <img
            src="/masomo-logo.png"
            alt="Masomo logo"
            className="brand-logo"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = '/logo192.png';
            }}
          />
          <span className="portal-brand-copy">
            <span>Student Portal</span>
            <small>Balance, fees, and payment history</small>
          </span>
        </button>
        <div className="navbar-actions">
          <div className="portal-user-chip">
            <span>{student?.name || 'Student'}</span>
            <small>{student?.admission_no || 'Admission no'}</small>
          </div>
          <button type="button" className="portal-secondary-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="portal-content">{children}</main>
    </div>
  );
}
