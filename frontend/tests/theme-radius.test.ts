import { Box, Chip, ThemeProvider } from '@mui/material';
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../src/theme/theme';

describe('shared app theme shape', () => {
  it('uses the six pixel project radius', () => {
    expect(createAppTheme().shape.borderRadius).toBe(6);
  });

  it('resolves the shared MUI radius unit to six pixels', () => {
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

    expect(getComputedStyle(screen.getByTestId('radius-sample')).borderRadius).toBe('6px');
    expect(getComputedStyle(screen.getByTestId('default-chip')).borderRadius).toBe('6px');
  });
});
