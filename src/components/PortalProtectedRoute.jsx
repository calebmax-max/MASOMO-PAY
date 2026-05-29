import React, { useEffect } from 'react';
import { usePortalAuth } from '../context/PortalAuthContext';
import { navigateTo } from '../utils/navigation';

export default function PortalProtectedRoute({ children }) {
  const { isAuthenticated, loading } = usePortalAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigateTo('/portal/login');
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
