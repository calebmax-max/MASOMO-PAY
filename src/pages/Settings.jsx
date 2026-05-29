import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  createFeeStructure,
  deleteFeeStructure,
  getSchoolSettings,
  updateFeeStructure,
  updateSchoolSettings,
} from '../services/schoolService';

const initialForm = { name: '', phone: '', email: '', address: '' };

function makeDraftFeeStructure() {
  return {
    clientId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    class_name: '',
    term: 'Term 1',
    amount: '',
  };
}

export default function Settings() {
  const { user } = useAuth();
  const canEditSchool = user?.role === 'admin';
  const canEditFees = user?.role === 'admin' || user?.role === 'accountant';
  const [form, setForm] = useState(initialForm);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFeeId, setSavingFeeId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
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
        setFeeStructures((data.fee_structures || []).map((item) => ({ ...item })));
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const unsavedCount = useMemo(
    () => feeStructures.filter((item) => !item.id || item._dirty).length,
    [feeStructures],
  );

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updateFeeField = (feeKey, field, value) => {
    setFeeStructures((current) =>
      current.map((item) => {
        const matches = item.id ? item.id === feeKey : item.clientId === feeKey;
        if (!matches) return item;
        return { ...item, [field]: value, _dirty: true };
      }),
    );
  };

  const addFeeStructure = () => {
    setFeeStructures((current) => [makeDraftFeeStructure(), ...current]);
    setMessage('');
    setError('');
  };

  const removeFeeStructure = async (feeStructure) => {
    setError('');
    setMessage('');

    const confirmed = window.confirm(
      `Delete fee structure for ${feeStructure.class_name || 'this class'} ${feeStructure.term || ''}?`,
    );
    if (!confirmed) return;

    if (!feeStructure.id) {
      setFeeStructures((current) => current.filter((item) => item.clientId !== feeStructure.clientId));
      return;
    }

    try {
      await deleteFeeStructure(feeStructure.id);
      setFeeStructures((current) => current.filter((item) => item.id !== feeStructure.id));
      setMessage('Fee structure deleted.');
    } catch (err) {
      setError(err.message || 'Could not delete fee structure');
    }
  };

  const saveFeeStructure = async (feeStructure) => {
    const payload = {
      class_name: feeStructure.class_name,
      term: feeStructure.term,
      amount: Number(feeStructure.amount),
    };

    if (!payload.class_name || !payload.term || Number.isNaN(payload.amount)) {
      throw new Error('Fill in class, term, and amount before saving.');
    }

    if (feeStructure.id) {
      const data = await updateFeeStructure(feeStructure.id, payload);
      setFeeStructures((current) =>
        current.map((item) =>
          item.id === feeStructure.id ? { ...data.fee_structure, clientId: item.clientId, _dirty: false } : item,
        ),
      );
      return;
    }

    const data = await createFeeStructure(payload);
    setFeeStructures((current) =>
      current.map((item) =>
        item.clientId === feeStructure.clientId ? { ...data.fee_structure, clientId: item.clientId, _dirty: false } : item,
      ),
    );
  };

  const saveAllFeeStructures = async () => {
    setSavingAll(true);
    setError('');
    setMessage('');

    try {
      for (const item of feeStructures) {
        if (!item.id || item._dirty) {
          await saveFeeStructure(item);
        }
      }
      setMessage('All fee structure changes saved.');
    } catch (err) {
      setError(err.message || 'Could not save all fee structures');
    } finally {
      setSavingAll(false);
    }
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
    <section style={s.shell}>
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Settings</h1>
          <p style={s.pgSub}>Manage your school profile and fee structure.</p>
        </div>
      </div>

      <div style={s.card}>
        <p style={s.cardTitle}>School profile</p>
        {loading ? (
          <p style={s.muted}>Loading school settings...</p>
        ) : canEditSchool ? (
          <form style={s.formGrid} onSubmit={handleSubmit}>
            {[
              { field: 'name', label: 'School name', type: 'text' },
              { field: 'phone', label: 'Phone', type: 'text' },
              { field: 'email', label: 'Email', type: 'email' },
              { field: 'address', label: 'Address', type: 'text' },
            ].map(({ field, label, type }) => (
              <label key={field} style={s.label}>
                {label}
                <input
                  style={s.input}
                  type={type}
                  value={form[field]}
                  onChange={(e) => updateField(field, e.target.value)}
                />
              </label>
            ))}

            {error && (
              <div style={s.errorBanner}>
                <AlertIcon />
                {error}
              </div>
            )}
            {message && (
              <div style={s.successBanner}>
                <CheckIcon />
                {message}
              </div>
            )}

            <div style={s.btnRow}>
              <button
                type="submit"
                style={s.submitBtn}
                disabled={saving}
                onMouseEnter={(e) => !saving && (e.currentTarget.style.background = '#1A3D5C')}
                onMouseLeave={(e) => !saving && (e.currentTarget.style.background = '#1A2F4A')}
              >
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </form>
        ) : (
          <div style={s.readOnlyGrid}>
            <div style={s.readOnlyRow}><span>School name</span><strong>{form.name || '—'}</strong></div>
            <div style={s.readOnlyRow}><span>Phone</span><strong>{form.phone || '—'}</strong></div>
            <div style={s.readOnlyRow}><span>Email</span><strong>{form.email || '—'}</strong></div>
            <div style={s.readOnlyRow}><span>Address</span><strong>{form.address || '—'}</strong></div>
            <p style={s.readOnlyNote}>School profile changes are restricted to the admin.</p>
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={s.sectionHead}>
          <p style={s.cardTitle}>Fee structure</p>
          {canEditFees ? (
            <div style={s.sectionActions}>
              <span style={s.feeHint}>{unsavedCount ? `${unsavedCount} unsaved change(s)` : 'All changes saved'}</span>
              <button type="button" style={s.ghostBtn} onClick={addFeeStructure}>
                + Add fee structure
              </button>
              <button
                type="button"
                style={s.submitBtn}
                disabled={savingAll || !feeStructures.length}
                onClick={saveAllFeeStructures}
                onMouseEnter={(e) => !savingAll && (e.currentTarget.style.background = '#1A3D5C')}
                onMouseLeave={(e) => !savingAll && (e.currentTarget.style.background = '#1A2F4A')}
              >
                {savingAll ? 'Saving all...' : 'Save all changes'}
              </button>
            </div>
          ) : null}
        </div>

        {feeStructures.length ? (
          <div style={s.feeGrid}>
            {feeStructures.map((item) => {
              const feeKey = item.id || item.clientId;
              const isNew = !item.id;
              return (
                <div key={feeKey} style={s.feeCard}>
                  <div style={s.feeFormGrid}>
                    <label style={s.label}>
                      Class name
                      <input
                        style={s.input}
                        type="text"
                        value={item.class_name}
                        onChange={(e) => updateFeeField(feeKey, 'class_name', e.target.value)}
                        placeholder="e.g. Grade 1"
                        disabled={!canEditFees}
                      />
                    </label>
                    <label style={s.label}>
                      Term
                      <input
                        style={s.input}
                        type="text"
                        value={item.term}
                        onChange={(e) => updateFeeField(feeKey, 'term', e.target.value)}
                        placeholder="e.g. Term 1"
                        disabled={!canEditFees}
                      />
                    </label>
                    <label style={s.label}>
                      Amount
                      <input
                        style={s.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateFeeField(feeKey, 'amount', e.target.value)}
                        placeholder="0"
                        disabled={!canEditFees}
                      />
                    </label>
                  </div>

                  <div style={s.feeFooter}>
                    <span style={s.feeMeta}>{isNew ? 'New fee structure' : `Fee ID ${item.id}`}</span>
                    {canEditFees ? (
                      <div style={s.rowActions}>
                        <button
                          type="button"
                          style={s.deleteBtn}
                          onClick={() => removeFeeStructure(item)}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          style={s.feeSaveBtn}
                          onClick={async () => {
                            setSavingFeeId(feeKey);
                            setError('');
                            setMessage('');
                            try {
                              await saveFeeStructure(item);
                              setMessage('Fee structure updated.');
                            } catch (err) {
                              setError(err.message || 'Could not save fee structure');
                            } finally {
                              setSavingFeeId(null);
                            }
                          }}
                          disabled={savingFeeId === feeKey}
                          onMouseEnter={(e) =>
                            savingFeeId !== feeKey && (e.currentTarget.style.background = '#1A3D5C')
                          }
                          onMouseLeave={(e) =>
                            savingFeeId !== feeKey && (e.currentTarget.style.background = '#1A2F4A')
                          }
                        >
                          {savingFeeId === feeKey ? 'Saving...' : 'Save row'}
                        </button>
                      </div>
                    ) : (
                      <span style={s.readOnlyNote}>Fee structure is editable only by the admin or accountant.</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={s.muted}>No fee structure has been configured yet.</p>
        )}
      </div>
    </section>
  );
}

const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };
function AlertIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

const s = {
  shell: {
    padding: '1.5rem',
    fontFamily: "'DM Sans', var(--font-sans, system-ui, sans-serif)",
    background: '#0F1117',
    borderRadius: 12,
    minHeight: '100vh',
  },
  topbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '2rem',
  },
  pgTitle: {
    fontSize: 22,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: '0 0 3px',
    letterSpacing: '-0.02em',
  },
  pgSub: {
    fontSize: 13,
    color: '#7A7A8C',
    marginTop: 3,
    marginBottom: 0,
  },
  card: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#F0F0F2',
    margin: '0 0 1.25rem',
    paddingBottom: 12,
    borderBottom: '0.5px solid #2A2A38',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: '1.25rem',
  },
  sectionActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  feeHint: {
    color: '#7A7A8C',
    fontSize: 12,
  },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: 'transparent',
    color: '#7A7A8C',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: '#7A7A8C',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    padding: '9px 12px',
    fontSize: 13,
    border: '0.5px solid #2A2A38',
    borderRadius: 8,
    background: '#0F1117',
    color: '#F0F0F2',
    outline: 'none',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid #7B2020',
    background: '#2A1010',
    color: '#F09595',
    fontSize: 13,
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid #1A4A34',
    background: '#0A2A22',
    color: '#5DCAA5',
    fontSize: 13,
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 20px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#1A2F4A',
    color: '#7BB8F4',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  feeGrid: {
    display: 'grid',
    gap: 14,
  },
  feeCard: {
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    padding: '1rem',
    background: '#0F1117',
    display: 'grid',
    gap: 14,
  },
  feeFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
  },
  feeFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTop: '0.5px solid #2A2A38',
    paddingTop: 12,
  },
  feeMeta: {
    fontSize: 12,
    color: '#7A7A8C',
  },
  rowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #7B2020',
    background: 'transparent',
    color: '#F09595',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  feeSaveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#1A2F4A',
    color: '#7BB8F4',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  readOnlyGrid: {
    display: 'grid',
    gap: 10,
  },
  readOnlyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 0',
    borderBottom: '0.5px solid #2A2A38',
  },
  readOnlyNote: {
    margin: 0,
    fontSize: 12,
    color: '#7A7A8C',
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    margin: 0,
    textAlign: 'center',
    padding: '1.5rem 0',
  },
};
