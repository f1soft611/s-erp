import { lazy, Suspense, useMemo } from 'react';
import { Box } from '@mui/material';
import {
  createBrowserRouter,
  createMemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AppSettingsProvider } from './shared/context/AppSettingsContext';
import { NotificationProvider } from './shared/context/NotificationContext';

const NoticeLoginPopupHost = lazy(() =>
  import('./pages/groupware/community/notice/components/NoticeLoginPopupHost').then(
    (module) => ({ default: module.NoticeLoginPopupHost }),
  ),
);

function App() {
  const router = useMemo(() => {
    const routes = [
      {
        path: '*',
        element: (
          <>
            <AppRouter />
            <Suspense fallback={null}>
              <NoticeLoginPopupHost />
            </Suspense>
          </>
        ),
      },
    ];

    return import.meta.env.MODE === 'test'
      ? createMemoryRouter(routes, {
          initialEntries: [window.location.pathname || '/login'],
        })
      : createBrowserRouter(routes);
  }, []);

  return (
    <AppSettingsProvider>
      <NotificationProvider>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            minHeight: 0,
            overflow: 'hidden',
            bgcolor: 'background.default',
            color: 'text.primary',
          }}
        >
          <RouterProvider router={router} />
        </Box>
      </NotificationProvider>
    </AppSettingsProvider>
  );
}

export default App;
