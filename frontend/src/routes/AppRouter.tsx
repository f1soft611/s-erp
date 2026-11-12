import { lazy, Suspense, useSyncExternalStore } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { resolvePushNotificationPath } from '../shared/utils/notificationPath';
import {
  isAuthenticated,
  subscribeAuthChange,
} from '../shared/services/authService';
import { PwaInstallPrompt } from '../shared/components/PwaInstallPrompt';

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
  const location = useLocation();
  console.log('PublicRoute auth', isAuthed, 'path', window.location.pathname);

  return isAuthed
    ? <Navigate to={resolvePushNotificationPath(location.state?.pushNotificationId) ?? '/'} replace />
    : <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthed = useAuthState();
  const location = useLocation();
  const pushIds = new URLSearchParams(location.search).getAll('pushNotificationId');
  const pushNotificationId = location.pathname === '/groupware/notifications'
    && pushIds.length === 1 && /^\d+$/.test(pushIds[0])
    && resolvePushNotificationPath(Number(pushIds[0]))
    ? Number(pushIds[0]) : null;
  console.log(
    'ProtectedRoute auth',
    isAuthed,
    'path',
    window.location.pathname,
  );

  return isAuthed ? <>{children}</>
    : <Navigate to="/login" state={{ pushNotificationId }} replace />;
}

function AppRouter() {
  const isAuthed = useAuthState();
  const location = useLocation();

  return (
    <>
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
            path="/search"
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
            path="/pr/*"
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
      <PwaInstallPrompt
        enabled={isAuthed && location.pathname === '/groupware/overview'}
      />
    </>
  );
}

export default AppRouter;
