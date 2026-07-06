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
      title="Manage school fees, balances, and payments from one polished dashboard."
      description="Use your staff credentials to review balances, follow payment activity, and keep school finance work moving quickly."
      highlights={[
        {
          title: 'Secure access',
          description: 'Restricted login for staff and administrators.',
        },
        {
          title: 'Real-time records',
          description: 'See balances, payments, and updates in one view.',
        },
        {
          title: 'Fast workflow',
          description: 'Get in, review what matters, and move on.',
        },
      ]}
      panelTitle="Staff sign in"
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
