import { Box } from '@mui/material';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import AppRouter from './routes/AppRouter';
import { AppSettingsProvider } from './shared/context/AppSettingsContext';

function App() {
  const Router = import.meta.env.MODE === 'test' ? MemoryRouter : BrowserRouter;

  return (
    <AppSettingsProvider>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
        }}
      >
        <Router initialEntries={[window.location.pathname || '/login']}>
          <AppRouter />
        </Router>
      </Box>
    </AppSettingsProvider>
  );
}

export default App;
