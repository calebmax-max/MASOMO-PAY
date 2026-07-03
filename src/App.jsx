import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PortalAuthProvider } from './context/PortalAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PortalProtectedRoute from './components/PortalProtectedRoute';
import Login from './pages/Login';
import PortalLogin from './pages/PortalLogin';
import { navigateTo } from './utils/navigation';
import './App.css';

const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const PortalLayout = lazy(() => import('./layouts/PortalLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const AddStudent = lazy(() => import('./pages/AddStudent'));
const EditStudent = lazy(() => import('./pages/EditStudent'));
const StudentReport = lazy(() => import('./pages/StudentReport'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const PortalDashboard = lazy(() => import('./pages/PortalDashboard'));

function RouteLoading({ label }) {
  return (
    <div className="page-shell center" style={{ minHeight: '60vh' }}>
      <div className="portal-card" style={{ width: 'min(420px, calc(100% - 32px))', textAlign: 'center' }}>
        <p className="portal-muted" style={{ margin: 0, fontSize: 14 }}>
          {label}
        </p>
      </div>
    </div>
  );
}

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
      <Suspense fallback={<RouteLoading label="Loading portal..." />}>
        <PortalProtectedRoute>
          <PortalLayout>{page}</PortalLayout>
        </PortalProtectedRoute>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<RouteLoading label="Loading dashboard..." />}>
      <ProtectedRoute>
        <DashboardLayout>{page}</DashboardLayout>
      </ProtectedRoute>
    </Suspense>
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
