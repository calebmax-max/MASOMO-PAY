import React, { useState } from 'react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { navigateTo } from '../utils/navigation';

export default function PortalLogin() {
  const { login } = usePortalAuth();
  const [admissionNo, setAdmissionNo] = useState('');
  const [pin, setPin] = useState('');
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
    <div className="auth-shell">
      <form className="auth-card card" onSubmit={handleSubmit}>
        <img src="/logo512.png" alt="Masomo logo" className="auth-logo" />
        <h1>Student Portal</h1>
        <p>Log in with your admission number and portal PIN.</p>

        <label>
          Admission Number
          <input value={admissionNo} onChange={(event) => setAdmissionNo(event.target.value)} />
        </label>

        <label>
          Portal PIN
          <input value={pin} onChange={(event) => setPin(event.target.value)} type="password" />
        </label>

        {error ? <div className="error-banner">{error}</div> : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Signing in...' : 'Open Portal'}
        </button>

        <button type="button" className="secondary-btn" onClick={() => navigateTo('/login')}>
          Back to staff login
        </button>
      </form>
    </div>
  );
}
