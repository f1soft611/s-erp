import { useSyncExternalStore } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import {
  isAuthenticated,
  subscribeAuthChange,
} from '../shared/services/authService';

function useAuthState() {
  return useSyncExternalStore(
    subscribeAuthChange,
    isAuthenticated,
    () => false,
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthState();
  console.log('PublicRoute auth', isAuthed, 'path', window.location.pathname);

  return isAuthed ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthState();
  console.log(
    'ProtectedRoute auth',
    isAuthed,
    'path',
    window.location.pathname,
  );

  return isAuthed ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />
        }
      />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />
        }
      />
    </Routes>
  );
}

export default AppRouter;
