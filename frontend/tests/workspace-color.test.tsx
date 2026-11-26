import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceColorPicker } from '../src/pages/groupware/community/workspace/components/WorkspaceColorPicker';
import { TEXT_COLOR_SWATCHES } from '../src/shared/components/rich-text-editor/textColorSwatches';

const renderPicker = (value: string | null = null) => {
  const onChange = vi.fn();
  const view = render(<WorkspaceColorPicker value={value} onChange={onChange} ariaLabel="컬럼 색상" />);
  return { onChange, ...view };
};

describe('WorkspaceColorPicker (document editor color palette pattern)', () => {
  it('opens a palette with the same twelve swatches the document editor uses', () => {
    renderPicker();
    expect(screen.queryByTestId('workspace-color-swatches')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '컬럼 색상' }));
    const swatches = within(screen.getByTestId('workspace-color-swatches')).getAllByRole('button');
    expect(swatches).toHaveLength(12);
    expect(TEXT_COLOR_SWATCHES).toHaveLength(12);
    expect(swatches.map((button) => button.getAttribute('aria-label'))).toEqual(
      TEXT_COLOR_SWATCHES.map((color) => `색상 ${color}`),
    );
  });

  it('applies a swatch, closes, and remembers it under recent colors', () => {
    const { onChange } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: '컬럼 색상' }));
    fireEvent.click(screen.getByRole('button', { name: '색상 #3b82f6' }));
    expect(onChange).toHaveBeenCalledWith('#3b82f6');
    fireEvent.click(screen.getByRole('button', { name: '컬럼 색상' }));
    const recent = screen.getByRole('group', { name: '최근 색상' });
    expect(within(recent).getByRole('button', { name: '최근 색상 #3b82f6' })).toBeTruthy();
  });

  it('marks the current color and clears it with the default color button', () => {
    const { onChange } = renderPicker('#22c55e');
    fireEvent.click(screen.getByRole('button', { name: '컬럼 색상' }));
    expect(screen.getByRole('button', { name: '색상 #22c55e' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '기본 색상' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('uses a custom reset label when the default means something else', () => {
    render(<WorkspaceColorPicker value="#22c55e" onChange={vi.fn()} ariaLabel="색상" resetLabel="방 기본 색상 사용" />);
    fireEvent.click(screen.getByRole('button', { name: '색상' }));
    expect(screen.getByRole('button', { name: '방 기본 색상 사용' })).toBeTruthy();
  });
});
