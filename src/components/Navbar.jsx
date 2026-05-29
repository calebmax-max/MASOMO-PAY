import React from 'react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <button type="button" className="brand" onClick={() => navigateTo('/dashboard')}>
        <img src="/logo192.png" alt="Masomo logo" className="brand-logo" />
        <span>Masomo Pay</span>
      </button>

      <div className="navbar-actions">
        <button type="button" className="icon-btn" aria-label="Notifications">
          🔔
        </button>
        <div className="user-chip">
          <span>{user?.name || 'Guest'}</span>
          <small>{user?.role || 'user'}</small>
        </div>
        <button type="button" className="secondary-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
