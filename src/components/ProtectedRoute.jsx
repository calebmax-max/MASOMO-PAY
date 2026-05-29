import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigateTo('/login');
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    return <div className="page-shell center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
