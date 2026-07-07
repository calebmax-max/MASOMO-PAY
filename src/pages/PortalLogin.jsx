import React, { useState } from 'react';
import AuthLayout, { AuthAlertIcon } from '../components/AuthLayout';
import { usePortalAuth } from '../context/PortalAuthContext';
import { navigateTo } from '../utils/navigation';

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const [admissionNo, setAdmissionNo] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(admissionNo, pin);
    } catch (err) {
      setError(err.message || 'Portal login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      kicker="Parent & student access"
      title="Check fees and pay directly from your phone."
      description="Sign in with your admission number and PIN to view balances, make payments, and track transaction history."
      highlights={[
        {
          title: 'Fast login',
          description: 'Admission number and PIN.',
        },
        {
          title: 'Clear balance',
          description: 'See what is due at a glance.',
        },
        {
          title: 'Payment trail',
          description: 'Track requests and receipts.',
        },
      ]}
      panelTitle="Sign in"
    >
      <form className="portal-auth-form" onSubmit={handleSubmit}>
        <label className="portal-field">
          Admission Number
          <input
            className="portal-input"
            value={admissionNo}
            onChange={(event) => setAdmissionNo(event.target.value)}
            autoComplete="username"
            placeholder="e.g. ADM001"
          />
        </label>

        <label className="portal-field">
          <span className="portal-field-row">
            <span>Portal PIN</span>
            <button
              type="button"
              className="portal-pin-toggle"
              onClick={() => setShowPin((current) => !current)}
            >
              {showPin ? 'Hide' : 'Show'}
            </button>
          </span>
          <input
            className="portal-input"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            type={showPin ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter PIN"
          />
        </label>

        {error ? (
          <div className="portal-error-banner portal-auth-error">
            <AuthAlertIcon />
            {error}
          </div>
        ) : null}

        <div className="portal-auth-actions">
          <button
            type="button"
            className="portal-secondary-btn"
            onClick={() => navigateTo('/login')}
          >
            Back to staff login
          </button>
          <button type="submit" className="portal-primary-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Open Portal'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}