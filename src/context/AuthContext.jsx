import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, getStoredUser, login as loginRequest, logout as clearSession } from '../services/authService';
import { navigateTo } from '../utils/navigation';
import { getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [user, setUserState] = useState(getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function refreshProfile() {
      if (!getToken() || getStoredUser()) {
        return;
      }
      try {
        setLoading(true);
        const data = await getProfile();
        if (mounted) {
          setUserState(data.user);
        }
      } catch (error) {
        clearSession();
        setTokenState(null);
        setUserState(null);
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

  const login = async (email, password) => {
    const data = await loginRequest(email, password);
    setTokenState(data.access_token);
    setUserState(data.user);
    navigateTo('/dashboard');
    return data;
  };

  const logout = () => {
    clearSession();
    setTokenState(null);
    setUserState(null);
    navigateTo('/login');
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      login,
      logout,
      setUser: setUserState,
    }),
    [token, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
