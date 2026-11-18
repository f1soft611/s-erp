import { createRef } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { ItemPriceOverviewTree } from '../src/pages/co/master/item-partner-prices/components/ItemPriceOverviewTree';
import { normalizeItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/services/itemPriceOverview.service';
import type { ItemPriceOverviewRow } from '../src/pages/co/master/item-partner-prices/types/itemPriceOverview.types';
import type { F1TreeRef } from '../src/shared/components/f1-grid';

vi.mock('../src/pages/sales/order/create/services/salesOrderMaster.service', () => ({
  searchOrderCustomers: vi.fn().mockResolvedValue([]),
  searchOrderMaterials: vi.fn().mockResolvedValue([]),
}));

const side = {
  priceId: 10, unitPrice: '1000', taxType: 'TAXABLE', vatIncludedAt: 'N', foreignUnitPrice: null,
  currency: null, moq: null, startDt: '2026-11-01', endDt: null, priceStatus: 'current',
};

const rows = [
  normalizeItemPriceOverviewRow({
    rowId: 'item-1', parentId: null, materialId: 1, materialCode: 'A01', materialName: '품목A',
    specialCount: 1, purchase: side, sales: null,
  }),
  normalizeItemPriceOverviewRow({
    rowId: 'cust-1-301', parentId: 'item-1', materialId: 1, materialCode: 'A01', materialName: '품목A',
    customerId: 301, customerCode: 'C1', customerName: '특별거래처', purchase: { ...side, priceId: 12 }, sales: null,
  }),
  normalizeItemPriceOverviewRow({
    rowId: 'item-2', parentId: null, materialId: 2, materialCode: 'B01', materialName: '품목B',
    specialCount: 0, purchase: null, sales: null,
  }),
];

function renderTree(treeRef = createRef<F1TreeRef<ItemPriceOverviewRow>>()) {
  render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <ItemPriceOverviewTree
          rows={rows}
          treeRef={treeRef}
          gridKey={0}
          loading={false}
          canCreate
          canUpdate
          canExportExcel={false}
          today="2026-11-18"
          onChangesChange={() => undefined}
          onSelectionChange={() => undefined}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
  return treeRef;
}

describe('item price overview tree', () => {
  it('lists every item with its special-price count and keeps children collapsed', async () => {
    renderTree();
    expect(await screen.findByText('A01 · 품목A')).toBeInTheDocument();
    expect(screen.getByText('B01 · 품목B')).toBeInTheDocument();
    expect(screen.getByText('특별 1건')).toBeInTheDocument();
    expect(screen.queryByText('특별거래처')).not.toBeInTheDocument();
  });

  it('shows the special customer under its item once expanded and adds a new child row', async () => {
    const treeRef = renderTree();
    await screen.findByText('A01 · 품목A');
    act(() => treeRef.current?.expandRow('item-1'));
    expect(await screen.findByText('특별거래처')).toBeInTheDocument();
    act(() => treeRef.current?.addChildRow('item-2', {
      rowId: 'new-child-x', parentId: 'item-2', materialId: 2, displayName: '(거래처를 선택하세요)',
    }));
    // 행 폼이 켜져 있어 특별단가 추가는 폼 창에서 입력한다(품목은 부모에서 채워짐, 거래처는 선택 창).
    const form = await screen.findByRole('dialog', { name: '품목 단가 입력' });
    expect(within(form).getByText('매입 단가')).toBeInTheDocument();
    expect(within(form).getByText('매출 단가')).toBeInTheDocument();
    expect(within(form).getByRole('button', { name: '거래처 선택 선택' })).toBeInTheDocument();
  });
});
