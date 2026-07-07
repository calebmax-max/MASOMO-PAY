import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import StudentCard from '../components/StudentCard';
import { deleteStudent, getStudents } from '../services/studentService';
import { navigateTo } from '../utils/navigation';

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudents = async (search = '') => {
    const data = await getStudents(search);
    setStudents(data.students || []);
  };

  useEffect(() => {
    let mounted = true;
    async function loadPage() {
      try {
        setLoading(true);
        const data = await getStudents();
        if (!mounted) return;
        setStudents(data.students || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Could not load students');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPage();
    return () => { mounted = false; };
  }, []);

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.name}?`)) return;
    setError('');
    try {
      await deleteStudent(student.id);
      await loadStudents(query);
    } catch (err) {
      setError(err.message || 'Could not delete student');
    }
  };

  return (
    <section style={s.shell}>

      {/* â”€â”€ Header â”€â”€ */}
      <div style={s.topbar}>
        <div>
          <h1 style={s.pgTitle}>Students</h1>
          <p style={s.pgSub}>Search, manage, and track balances</p>
        </div>
        {user?.role === 'admin' ? (
          <button
            type="button"
            style={s.addBtn}
            onClick={() => navigateTo('/students/new')}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#236d43')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1f7a4a')}
          >
            <PlusIcon /> Add student
          </button>
        ) : null}
      </div>

      {/* â”€â”€ Search â”€â”€ */}
      <div style={s.searchWrap}>
        <SearchIcon />
        <input
          style={s.searchInput}
          placeholder="Search by name or admission numberâ€¦"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              loadStudents(query).catch((err) => setError(err.message || 'Could not search students'));
            }
          }}
        />
      </div>

      {/* â”€â”€ Error â”€â”€ */}
      {error && (
        <div style={s.errorBar}>
          <AlertIcon />
          {error}
        </div>
      )}

      {/* â”€â”€ Table â”€â”€ */}
      {loading ? (
        <p style={s.muted}>Loading studentsâ€¦</p>
      ) : students.length ? (
        <div style={s.panel}>
          <div style={s.panelHead}>
            <span style={s.colLabel}>Student</span>
            <span style={s.colLabel}>Class</span>
            <span style={s.colLabel}>Balance</span>
            <span style={s.colLabel}>Actions</span>
          </div>
          <ul style={s.list}>
            {students.map((student, i) => (
              <StudentCard
                key={student.id}
                student={student}
                index={i}
                onDelete={handleDelete}
                onReport={() => navigateTo(`/students/${student.id}/report`)}
                onEdit={() => navigateTo(`/students/${student.id}/edit`)}
                onPay={(s) => navigateTo(`/payments?student_id=${s.id}`)}
                canEdit={user?.role === 'admin'}
                canDelete={user?.role === 'admin'}
              />
            ))}
          </ul>
        </div>
      ) : (
        <p style={s.muted}>No students found.</p>
      )}
    </section>
  );
}

/* â”€â”€â”€ Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ico = { width: 15, height: 15, display: 'block', flexShrink: 0 };

function PlusIcon() {
  return (
    <svg style={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg style={{ ...ico, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A7A8C' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg style={{ ...ico, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/* â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '9px 16px',
    borderRadius: 8,
    border: '0.5px solid #2A2A38',
    background: '#1f7a4a',
    color: '#dff5e5',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  searchWrap: {
    position: 'relative',
    marginBottom: '1.25rem',
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 36px',
    fontSize: 13,
    border: '0.5px solid #2A2A38',
    borderRadius: 8,
    background: '#161820',
    color: '#F0F0F2',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderRadius: 8,
    border: '0.5px solid #7B2020',
    background: '#2A1010',
    color: '#F09595',
    fontSize: 13,
    marginBottom: '1.25rem',
  },
  panel: {
    background: '#161820',
    border: '0.5px solid #2A2A38',
    borderRadius: 12,
    overflow: 'hidden',
  },
  panelHead: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 92px 102px minmax(240px, 1.15fr)',
    gap: 12,
    padding: '8px 1.25rem',
    borderBottom: '0.5px solid #2A2A38',
    background: '#1C1E28',
  },
  colLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: '#7A7A8C',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  list: {
    margin: 0,
    padding: 0,
  },
  muted: {
    fontSize: 13,
    color: '#7A7A8C',
    padding: '2rem',
    textAlign: 'center',
    margin: 0,
  },
};

