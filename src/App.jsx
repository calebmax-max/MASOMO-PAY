import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AddStudent from './pages/AddStudent';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { navigateTo } from './utils/navigation';
import './App.css';

function AppShell() {
  const { token } = useAuth();
  const [path, setPath] = useState(window.location.pathname || '/login');

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname || '/login');
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (path === '/' && token) {
      navigateTo('/dashboard');
    } else if (path === '/') {
      navigateTo('/login');
    }
  }, [path, token]);

  const page = useMemo(() => {
    if (path === '/login') return <Login />;
    const routeMap = {
      '/dashboard': <Dashboard />,
      '/students': <Students />,
      '/students/new': <AddStudent />,
      '/payments': <Payments />,
      '/reports': <Reports />,
      '/settings': <Settings />,
    };
    return routeMap[path] || <Dashboard />;
  }, [path]);

  if (path === '/login') {
    return page;
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>{page}</DashboardLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
