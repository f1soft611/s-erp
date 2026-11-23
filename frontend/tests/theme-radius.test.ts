import { Box, Chip, ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../src/theme/theme';

describe('shared app theme shape', () => {
  it('uses the four pixel project radius in both themes', () => {
    expect(createAppTheme('light').shape.borderRadius).toBe(4);
    expect(createAppTheme('dark').shape.borderRadius).toBe(4);
  });

  it('resolves the shared MUI radius unit to four pixels', () => {
    render(createElement(
      ThemeProvider,
      { theme: createAppTheme() },
      createElement(
        'div',
        null,
        createElement(Box, { 'data-testid': 'radius-sample', sx: { borderRadius: 1 } }),
        createElement(Chip, { 'data-testid': 'default-chip', label: '상태' }),
      ),
    ));

    expect(getComputedStyle(screen.getByTestId('radius-sample')).borderRadius).toBe('4px');
    expect(getComputedStyle(screen.getByTestId('default-chip')).borderRadius).toBe('4px');
  });
});
