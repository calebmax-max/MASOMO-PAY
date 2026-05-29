import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getPortalProfile,
  getStoredPortalStudent,
  hasPortalSession,
  portalLogin as portalLoginRequest,
  portalLogout as clearPortalSession,
} from '../services/portalService';
import { navigateTo } from '../utils/navigation';

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  const [tokenPresent, setTokenPresent] = useState(hasPortalSession());
  const [student, setStudent] = useState(getStoredPortalStudent());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refreshProfile() {
      if (!hasPortalSession() || getStoredPortalStudent()) {
        return;
      }
      try {
        setLoading(true);
        const data = await getPortalProfile();
        if (mounted) {
          setStudent(data.student);
        }
      } catch (error) {
        clearPortalSession();
        setTokenPresent(false);
        setStudent(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    refreshProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (admissionNo, pin) => {
    const data = await portalLoginRequest(admissionNo, pin);
    setTokenPresent(true);
    setStudent(data.student);
    navigateTo('/portal/dashboard');
    return data;
  };

  const logout = () => {
    clearPortalSession();
    setTokenPresent(false);
    setStudent(null);
    navigateTo('/portal/login');
  };

  const value = useMemo(
    () => ({
      student,
      loading,
      isAuthenticated: tokenPresent,
      login,
      logout,
    }),
    [student, loading, tokenPresent],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  return useContext(PortalAuthContext);
}
