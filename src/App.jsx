import React, { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PortalAuthProvider } from './context/PortalAuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import PortalLayout from './layouts/PortalLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import Login from './pages/Login';
import PortalLogin from './pages/PortalLogin';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AddStudent from './pages/AddStudent';
import EditStudent from './pages/EditStudent';
import StudentReport from './pages/StudentReport';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PortalDashboard from './pages/PortalDashboard';
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
    if (path === '/portal/login') return <PortalLogin />;
    if (path === '/portal/dashboard') return <PortalDashboard />;
    const editStudentMatch = path.match(/^\/students\/(\d+)\/edit$/);
    if (editStudentMatch) {
      return <EditStudent studentId={Number(editStudentMatch[1])} />;
    }
    const studentReportMatch = path.match(/^\/students\/(\d+)\/report$/);
    if (studentReportMatch) {
      return <StudentReport studentId={Number(studentReportMatch[1])} />;
    }
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

  if (path.startsWith('/portal')) {
    if (path === '/portal/login') {
      return page;
    }
    return (
      <PortalProtectedRoute>
        <PortalLayout>{page}</PortalLayout>
      </PortalProtectedRoute>
    );
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
      <PortalAuthProvider>
        <AppShell />
      </PortalAuthProvider>
    </AuthProvider>
  );
}
