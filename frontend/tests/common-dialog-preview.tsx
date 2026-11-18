import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { CommonDialogPreview } from './components/CommonDialogPreview';

const theme = createTheme();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <CommonDialogPreview />
  </ThemeProvider>,
);
