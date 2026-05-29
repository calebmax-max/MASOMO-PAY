import React, { useEffect, useState } from 'react';
import { getSchoolSettings, updateSchoolSettings } from '../services/schoolService';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
};

export default function Settings() {
  const [form, setForm] = useState(initialForm);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError('');
        const data = await getSchoolSettings();
        if (!mounted) return;

        setForm({
          name: data.school?.name || '',
          phone: data.school?.phone || '',
          email: data.school?.email || '',
          address: data.school?.address || '',
        });
        setFeeStructures(data.fee_structures || []);
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Could not load settings');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const data = await updateSchoolSettings(form);
      setForm({
        name: data.school?.name || '',
        phone: data.school?.phone || '',
        email: data.school?.email || '',
        address: data.school?.address || '',
      });
      setMessage('School settings updated.');
    } catch (err) {
      setError(err.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your school profile and fee structure from the live backend.</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p className="muted">Loading school settings...</p>
        ) : (
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              School Name
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <label>
              Address
              <input value={form.address} onChange={(event) => updateField('address', event.target.value)} />
            </label>

            {error ? <div className="error-banner">{error}</div> : null}
            {message ? <div className="success-banner">{message}</div> : null}

            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Fee Structure</h2>
        </div>
        {feeStructures.length ? (
          <div className="summary-grid">
            {feeStructures.map((item) => (
              <div key={item.id}>
                <span>
                  {item.class_name} · {item.term}
                </span>
                <strong>KES {Number(item.amount || 0).toLocaleString('en-KE')}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No fee structure has been configured yet.</p>
        )}
      </div>
    </section>
  );
}
