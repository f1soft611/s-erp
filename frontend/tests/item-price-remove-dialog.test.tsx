import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { ItemPriceRemoveDialog } from '../src/pages/co/master/item-partner-prices/components/ItemPriceRemoveDialog';
import { normalizeItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/services/itemPriceOverview.service';

const side = {
  priceId: 10, unitPrice: '1000', taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null,
  currency: null, moq: null, startDt: '2026-11-01', endDt: null, priceStatus: 'current',
};
const row = normalizeItemPriceOverviewRow({
  rowId: 'item-1', parentId: null, materialId: 1, materialCode: 'A01', materialName: '품목A',
  specialCount: 0, purchase: side, sales: null,
});

function renderDialog(onConfirm = vi.fn(), onClose = vi.fn()) {
  render(
    <ThemeProvider theme={createTheme()}>
      <ItemPriceRemoveDialog row={row} onConfirm={onConfirm} onClose={onClose} />
    </ThemeProvider>,
  );
  return { onConfirm, onClose };
}

describe('품목 기준 단가 삭제 확인 창', () => {
  it('단가가 없는 구분은 선택할 수 없고 기본은 삭제 방식이다', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: '단가 삭제' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /매입:/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /매출: 등록된 단가 없음/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /삭제 \(잘못 등록한 단가 정정\)/ })).toBeChecked();
  });

  it('삭제를 확인하면 선택한 구분과 방식을 전달한다', () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onConfirm).toHaveBeenCalledWith(['purchase'], 'delete');
  });

  it('미사용 처리를 고르면 버튼 이름과 전달 방식이 바뀌고, 구분을 모두 해제하면 실행할 수 없다', () => {
    const { onConfirm } = renderDialog();
    fireEvent.click(screen.getByRole('radio', { name: /미사용 처리/ }));
    fireEvent.click(screen.getByRole('button', { name: '미사용 처리' }));
    expect(onConfirm).toHaveBeenCalledWith(['purchase'], 'deactivate');
    fireEvent.click(screen.getByRole('checkbox', { name: /매입:/ }));
    expect(screen.getByRole('button', { name: '미사용 처리' })).toBeDisabled();
  });
});
