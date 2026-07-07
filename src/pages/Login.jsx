import React, { useState } from 'react';
import AuthLayout, { AuthAlertIcon } from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@masomo.ac.ke');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
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
    <AuthLayout
      kicker="Staff access"
      title="Manage fees and payments in one dashboard."
      description="Sign in to review balances, track payments, and manage school finances."
      highlights={[
        {
          title: 'Secure access',
          description: 'Restricted to staff and administrators.',
        },
        {
          title: 'Live records',
          description: 'Balances and payments, always current.',
        },
        {
          title: 'Fast workflow',
          description: 'Review what matters, then move on.',
        },
      ]}
      panelTitle="Sign in"
    >
      <form className="portal-auth-form" onSubmit={handleSubmit}>
        <label className="portal-field">
          Email
          <input
            className="portal-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            placeholder="admin@masomo.ac.ke"
          />
        </label>

        <label className="portal-field">
          <span className="portal-field-row">
            <span>Password</span>
            <button
              type="button"
              className="portal-pin-toggle"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </span>
          <input
            className="portal-input"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Enter password"
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
            onClick={() => navigateTo('/portal/login')}
          >
            Student / Parent Portal
          </button>
          <button type="submit" className="portal-primary-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}