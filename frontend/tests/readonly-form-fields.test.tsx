import { InputAdornment, IconButton, TextField } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GridFormField } from '../src/shared/components/f1-grid/form/GridFormField';
import { MasterPicker } from '../src/shared/components/master-picker/MasterPicker';
import { RichTextEditor } from '../src/shared/components/rich-text-editor/RichTextEditor';
import { createAppTheme } from '../src/theme/theme';

function background(label: string) {
  const field = screen.getByLabelText(label, { selector: 'input' });
  return getComputedStyle(field.closest('.MuiInputBase-root')!).backgroundColor;
}

describe.each([
  ['light', 'rgba(0, 0, 0, 0.12)'],
  ['dark', 'rgba(255, 255, 255, 0.12)'],
] as const)('읽기전용 폼 필드 (%s)', (mode, readOnlyColor) => {
  it('읽기전용과 비활성 입력을 구분하고 편집 가능 입력을 유지한다', () => {
    render(<ThemeProvider theme={createAppTheme(mode)}>
      <TextField label="읽기전용" slotProps={{ htmlInput: { readOnly: true } }} />
      <TextField label="비활성" disabled />
      <TextField label="편집 가능" />
      <TextField label="선택 입력" slotProps={{ input: { readOnly: true, endAdornment:
        <InputAdornment position="end"><IconButton aria-label="항목 선택" /></InputAdornment>,
      } }} />
    </ThemeProvider>);
    expect(background('읽기전용')).toBe(readOnlyColor);
    expect(background('비활성')).toBe(readOnlyColor);
    expect(background('편집 가능')).not.toBe(readOnlyColor);
    expect(background('선택 입력')).not.toBe(readOnlyColor);
  });

  it.each(['button', 'icon'] as const)('마스터 선택기 %s 모드의 실제 선택 가능 여부를 따른다', (triggerMode) => {
    const picker = (disabled: boolean) => <ThemeProvider theme={createAppTheme(mode)}>
      <MasterPicker label="거래처" value={null} search={vi.fn()} onChange={vi.fn()}
        triggerMode={triggerMode} disabled={disabled} />
    </ThemeProvider>;
    const { rerender } = render(picker(false));
    expect(background('거래처')).not.toBe(readOnlyColor);
    expect(screen.getByRole('button', { name: '거래처 선택' })).toBeEnabled();
    rerender(picker(true));
    expect(background('거래처')).toBe(readOnlyColor);
    expect(screen.getByRole('button', { name: '거래처 선택' })).toBeDisabled();
  });

  it('F1-Grid 행 폼의 읽기전용과 코드 선택 가능 상태를 구분한다', () => {
    const field = (type: 'text' | 'code', readOnly: boolean) =>
      <ThemeProvider theme={createAppTheme(mode)}>
        <GridFormField column={{ field: 'name', headerName: '이름', type,
          onOpenCodePicker: vi.fn() }} row={{ name: '값' }} mode="edit" value="값"
          readOnly={readOnly} onPatch={vi.fn()} />
      </ThemeProvider>;
    const { rerender } = render(field('text', true));
    expect(background('이름')).toBe(readOnlyColor);
    rerender(field('text', false));
    expect(background('이름')).not.toBe(readOnlyColor);
    rerender(field('code', false));
    expect(background('이름')).not.toBe(readOnlyColor);
    rerender(field('code', true));
    expect(background('이름')).toBe(readOnlyColor);
  });

  it.each(['select', 'autocomplete', 'user'] as const)('F1-Grid %s 읽기전용 선택 필드에 배경을 표시한다', (type) => {
    render(<ThemeProvider theme={createAppTheme(mode)}>
      <GridFormField column={{ field: 'name', headerName: '이름', type,
        options: [{ value: '값', label: '값' }],
        userOptions: [{ value: '값', label: '값' }] }}
        row={{ name: '값' }} mode="edit" value="값" readOnly onPatch={vi.fn()} />
    </ThemeProvider>);
    const root = screen.getByRole('combobox', { name: '이름' }).closest('.MuiInputBase-root')!;
    expect(getComputedStyle(root).backgroundColor).toBe(readOnlyColor);
  });

  it('F1-Grid 읽기전용 체크박스와 이미지 필드를 구분한다', () => {
    render(<ThemeProvider theme={createAppTheme(mode)}>
      <GridFormField column={{ field: 'enabled', headerName: '사용', type: 'checkbox' }}
        row={{ enabled: true }} mode="edit" value readOnly onPatch={vi.fn()} />
      <GridFormField column={{ field: 'photo', headerName: '사진', type: 'image' }}
        row={{ photo: '' }} mode="edit" value="" readOnly onPatch={vi.fn()} />
    </ThemeProvider>);
    const checkbox = screen.getByRole('checkbox', { name: '사용' }).closest('.MuiFormControlLabel-root')!;
    const image = screen.getByText('사진').parentElement!.querySelector('[data-f1-grid-form-image]')!;
    expect(getComputedStyle(checkbox).backgroundColor).toBe(readOnlyColor);
    expect(getComputedStyle(image).backgroundColor).toBe(readOnlyColor);
  });

  it('서식 편집기의 읽기전용 본문을 구분한다', async () => {
    const editor = (readOnly: boolean) => <ThemeProvider theme={createAppTheme(mode)}>
      <RichTextEditor ariaLabel="본문" readOnly={readOnly} />
    </ThemeProvider>;
    const { rerender } = render(editor(true));
    const body = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(getComputedStyle(body).backgroundColor).toBe(readOnlyColor));
    rerender(editor(false));
    await waitFor(() => expect(getComputedStyle(body).backgroundColor).not.toBe(readOnlyColor));
  });
});
