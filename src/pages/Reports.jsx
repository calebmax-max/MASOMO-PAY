import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import { formatCurrency } from '../utils/helpers';

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    apiRequest('/api/reports/summary')
      .then((data) => {
        if (mounted) {
          setSummary(data);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Could not load report summary');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Fee summaries, balances, and collections.</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card">
        <h2>Summary</h2>
        {loading ? (
          <p className="muted">Loading report summary...</p>
        ) : summary ? (
          <div className="summary-grid">
            <div>
              <span>Total Students</span>
              <strong>{summary.total_students}</strong>
            </div>
            <div>
              <span>Total Collections</span>
              <strong>{formatCurrency(summary.total_collections)}</strong>
            </div>
            <div>
              <span>Total Balances</span>
              <strong>{formatCurrency(summary.total_balances)}</strong>
            </div>
          </div>
        ) : (
          <p className="muted">No report data available.</p>
        )}
      </div>
    </section>
  );
}
