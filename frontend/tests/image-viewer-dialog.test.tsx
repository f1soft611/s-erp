import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { ImageViewerDialog } from '../src/shared/components/ImageViewerDialog';
import { createAppTheme } from '../src/theme/theme';

describe('ImageViewerDialog', () => {
  it.each(['light', 'dark'] as const)(
    'preserves the image and uses a neutral canvas in %s theme',
    (mode) => {
      const theme = createAppTheme(mode);

      render(
        <ThemeProvider theme={theme}>
          <ImageViewerDialog
            open
            src="blob:viewer-image"
            alt="stamp.png"
            onClose={() => undefined}
          />
        </ThemeProvider>,
      );

      const dialog = screen.getByRole('dialog', { name: '이미지 보기' });
      const image = screen.getByRole('img', { name: 'stamp.png' });
      const canvas = screen.getByTestId('image-viewer-canvas');

      expect(dialog).toHaveStyle({
        backgroundColor: theme.palette.background.paper,
      });
      expect(image).toHaveAttribute('src', 'blob:viewer-image');
      expect(['', 'none']).toContain(window.getComputedStyle(image).filter);
      expect(window.getComputedStyle(canvas).backgroundImage).toContain(
        'repeating-conic-gradient',
      );
    },
  );
});
