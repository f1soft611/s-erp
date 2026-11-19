import { createContext, useContext } from 'react';
import type { AppThemeMode } from '../../theme/theme';

export const DEFAULT_DISPLAY_SCALE = 0.9;

type AppSettingsContextValue = {
  themeMode: AppThemeMode;
  setThemeMode: (mode: AppThemeMode) => void;
  displayScale: number;
  setDisplayScale: (scale: number) => void;
};

export const AppSettingsContext = createContext<AppSettingsContextValue | null>(
  null,
);

export function useOptionalAppSettings() {
  return useContext(AppSettingsContext);
}

export function useAppSettings() {
  const context = useOptionalAppSettings();
  if (!context) {
    throw new Error('useAppSettings must be used inside AppSettingsProvider');
  }
  return context;
}

export function useOptionalDisplayScale(): number {
  const context = useOptionalAppSettings();
  return context?.displayScale ?? DEFAULT_DISPLAY_SCALE;
}
