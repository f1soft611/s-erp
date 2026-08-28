import { createTheme } from '@mui/material/styles';

export type AppThemeMode = 'light' | 'dark';

const basePalette = {
  primary: {
    main: '#1d4ed8',
    dark: '#1e3a8a',
    light: '#93c5fd',
  },
  secondary: {
    main: '#0f172a',
  },
  shape: {
    borderRadius: 8,
  },
};

export function createAppTheme(mode: AppThemeMode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#60a5fa' : '#1d4ed8',
        dark: isDark ? '#3b82f6' : '#1e3a8a',
        light: isDark ? '#bfdbfe' : '#93c5fd',
      },
      secondary: {
        main: isDark ? '#e2e8f0' : '#0f172a',
      },
      background: {
        default: isDark ? '#0f172a' : '#f4f7fb',
        paper: isDark ? '#111827' : '#ffffff',
      },
      text: {
        primary: isDark ? '#e2e8f0' : '#0f172a',
        secondary: isDark ? '#cbd5e1' : '#475569',
      },
    },
    shape: {
      borderRadius: basePalette.shape.borderRadius,
    },
    typography: {
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.03em',
      },
      button: {
        fontWeight: 700,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            textTransform: 'none',
            boxShadow: 'none',
            paddingTop: 8,
            paddingBottom: 8,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          fullWidth: true,
          margin: 'normal',
        },
      },
    },
  });
}

export default createAppTheme();
