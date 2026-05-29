import React from 'react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { navigateTo } from '../utils/navigation';

export default function PortalLayout({ children }) {
  const { student, logout } = usePortalAuth();

  return (
    <div className="dashboard-shell">
      <header className="navbar">
        <button type="button" className="brand" onClick={() => navigateTo('/portal/dashboard')}>
          <img src="/logo192.png" alt="Masomo logo" className="brand-logo" />
          <span>Student Portal</span>
        </button>
        <div className="navbar-actions">
          <div className="user-chip">
            <span>{student?.name || 'Student'}</span>
            <small>{student?.admission_no || 'Admission no'}</small>
          </div>
          <button type="button" className="secondary-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-content">{children}</main>
    </div>
  );
}
