import React, { useEffect, useState } from 'react';
import StudentCard from '../components/StudentCard';
import { deleteStudent, getStudents } from '../services/studentService';
import { navigateTo } from '../utils/navigation';

export default function Students() {
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
        if (mounted) {
          setError(err.message || 'Could not load students');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPage();
    return () => {
      mounted = false;
    };
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
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <p>Search, manage, and track balances.</p>
        </div>
        <button type="button" className="primary-btn" onClick={() => navigateTo('/students/new')}>
          Add Student
        </button>
      </div>

      <div className="card">
        <input
          className="search-input"
          placeholder="Search students..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyUp={(event) => {
            if (event.key === 'Enter') {
              loadStudents(query).catch((err) => setError(err.message || 'Could not search students'));
            }
          }}
        />
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {loading ? <p className="muted">Loading students...</p> : null}

      <div className="students-grid">
        {students.map((student) => (
          <StudentCard key={student.id} student={student} onDelete={handleDelete} />
        ))}
      </div>

      {!loading && !students.length ? <p className="muted">No students found.</p> : null}
    </section>
  );
}
