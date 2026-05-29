import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createStudent } from '../services/studentService';
import { navigateTo } from '../utils/navigation';

export default function AddStudent() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '',
    admission_no: '',
    class_name: '',
    parent_phone: '',
    balance: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createStudent({
        ...form,
        school_id: user?.school_id || null,
        balance: Number(form.balance),
      });
      navigateTo('/students');
    } catch (err) {
      setError(err.message || 'Could not create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Add Student</h1>
          <p>Create a new student record and opening balance.</p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Name
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <label>
          Admission Number
          <input value={form.admission_no} onChange={(event) => updateField('admission_no', event.target.value)} />
        </label>
        <label>
          Class
          <input value={form.class_name} onChange={(event) => updateField('class_name', event.target.value)} />
        </label>
        <label>
          Parent Phone
          <input value={form.parent_phone} onChange={(event) => updateField('parent_phone', event.target.value)} />
        </label>
        <label>
          Opening Balance
          <input type="number" value={form.balance} onChange={(event) => updateField('balance', event.target.value)} />
        </label>

        {error ? <div className="error-banner">{error}</div> : null}

        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Saving...' : 'Create Student'}
        </button>
      </form>
    </section>
  );
}
