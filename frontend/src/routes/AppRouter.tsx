import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  isAuthenticated,
  subscribeAuthChange,
} from '../shared/services/authService';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const ProfileSettingsPage = lazy(() =>
  import('../pages/dashboard/ProfileSettingsPage'),
);
const SecuritySettingsPage = lazy(() =>
  import('../pages/dashboard/SecuritySettingsPage'),
);
const F1GridDocsPage = lazy(() =>
  import('../pages/f1-grid-docs/F1GridDocsPage').then((module) => ({
    default: module.F1GridDocsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../pages/errors/NotFoundPage').then((module) => ({
    default: module.NotFoundPage,
  })),
);

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

  return isAuthed ? <Navigate to="/" replace /> : <>{children}</>;
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
    <Suspense fallback={null}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
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
        <Route path="/f1-grid-docs" element={<F1GridDocsPage />} />
        <Route
          path="/dashboard/profile"
          element={
            <ProtectedRoute>
              <ProfileSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/security"
          element={
            <ProtectedRoute>
              <SecuritySettingsPage />
            </ProtectedRoute>
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
          path="/groupware/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/co/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/*"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
