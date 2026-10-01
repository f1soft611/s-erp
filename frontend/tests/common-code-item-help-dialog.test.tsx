import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { CommonCodeItemHelpDialog } from '../src/shared/components/common-code/CommonCodeItemHelpDialog';
import type { CommonCodeItemRow } from '../src/pages/co/master/common-code/types/commonCodeManagement.types';

const item: CommonCodeItemRow = {
  id: '101',
  groupId: '11',
  itemCode: 'INSPECTION',
  itemNm: '점검',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 10,
  useAt: 'Y',
  itemDc: '',
};

function renderDialog(
  props: Partial<React.ComponentProps<typeof CommonCodeItemHelpDialog>> = {},
) {
  const onCreateItem = vi.fn().mockResolvedValue({});
  const onUpdateItem = vi.fn().mockResolvedValue({});
  const onReload = vi.fn().mockResolvedValue(undefined);
  render(
    <ThemeProvider theme={createTheme()}>
      <CommonCodeItemHelpDialog
        open
        groupId="11"
        items={[item]}
        canEdit
        onClose={vi.fn()}
        onCreateItem={onCreateItem}
        onUpdateItem={onUpdateItem}
        onReload={onReload}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onCreateItem, onUpdateItem, onReload };
}

describe('CommonCodeItemHelpDialog', () => {
  it('hides create and edit actions for read-only users', async () => {
    renderDialog({ canEdit: false });

    expect(
      await screen.findByRole('dialog', { name: '기안양식 분류 설정' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '분류 추가' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '분류 수정 점검' }),
    ).not.toBeInTheDocument();
  });

  it('keeps F1-Grid add and copy actions but hides row deletion', async () => {
    renderDialog();

    await screen.findByRole('dialog', { name: '기안양식 분류 설정' });
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: '점검' }));

    expect(screen.getByRole('menuitem', { name: '행 추가' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: '행 복사' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: '행 삭제' }),
    ).not.toBeInTheDocument();
  });

  it('uses the F1-Grid form modal and keeps dialog actions and close control visible', async () => {
    renderDialog();

    const dialog = await screen.findByRole('dialog', {
      name: '기안양식 분류 설정',
    });
    const footer = dialog.querySelector('.MuiDialogActions-root');
    expect(footer).not.toBeNull();
    expect(
      within(footer as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.textContent?.trim()),
    ).toEqual(['저장', '취소']);
    expect(within(dialog).getByRole('button', { name: '저장' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: '분류 설정 닫기' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('textbox', { name: '상세코드' }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: '분류 추가' }));

    expect(
      await screen.findByRole('textbox', { name: '상세코드' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '적용' })).toBeVisible();
  });

  it('creates a classification item and reloads the list after save', async () => {
    const { onCreateItem, onReload } = renderDialog();

    fireEvent.click(await screen.findByRole('button', { name: '분류 추가' }));
    fireEvent.change(screen.getByRole('textbox', { name: '상세코드' }), {
      target: { value: 'SAFETY' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: '상세코드명' }), {
      target: { value: '안전점검' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({
          itemCode: 'SAFETY',
          itemNm: '안전점검',
          useAt: 'Y',
        }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('updates an existing classification item and reloads the list', async () => {
    const { onUpdateItem, onReload } = renderDialog();

    fireEvent.click(
      await screen.findByRole('button', { name: '101 행 정보 수정' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: '상세코드명' }), {
      target: { value: '정기점검' },
    });
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onUpdateItem).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          itemNm: '정기점검',
        }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('duplicates a row through the F1-Grid context menu and saves the new item', async () => {
    const { onCreateItem, onReload } = renderDialog();

    fireEvent.contextMenu(
      await screen.findByRole('gridcell', { name: '점검' }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: '행 복사' }));

    const copiedCell = await screen.findByRole('gridcell', {
      name: '점검 복사',
    });
    const copiedRow = copiedCell.closest('[role="row"]');
    expect(copiedRow).not.toBeNull();
    fireEvent.click(
      within(copiedRow as HTMLElement).getByRole('button', {
        name: /행 정보 수정/,
      }),
    );

    const formDialog = await screen.findByRole('dialog', { name: '분류 수정' });
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '상세코드' }),
      {
        target: { value: 'SAFETY' },
      },
    );
    fireEvent.change(
      within(formDialog).getByRole('textbox', { name: '상세코드명' }),
      {
        target: { value: '안전점검' },
      },
    );
    fireEvent.click(within(formDialog).getByRole('button', { name: '적용' }));
    fireEvent.click(
      within(
        screen.getByRole('dialog', { name: '기안양식 분류 설정' }),
      ).getByRole('button', { name: '저장' }),
    );

    await waitFor(() =>
      expect(onCreateItem).toHaveBeenCalledWith(
        expect.objectContaining({ itemCode: 'SAFETY', itemNm: '안전점검' }),
      ),
    );
    expect(onReload).toHaveBeenCalledOnce();
  });
});
