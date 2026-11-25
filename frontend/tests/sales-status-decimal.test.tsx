import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import { resetGridDecimalPolicyCache } from '../src/shared/services/gridDecimalPolicy.service';
import { SalesOrderStatusDetailPanel } from '../src/pages/sales/order/status/components/SalesOrderStatusDetailPanel';
import { QuotationStatusDetailPanel } from '../src/pages/sales/quotation/status/components/QuotationStatusDetailPanel';
import { DeliveryStatusDetailPanel } from '../src/pages/sales/shipment/delivery/status/components/DeliveryStatusDetailPanel';
import { StatementDetailPanel } from '../src/pages/sales/shipment/statement/status/components/StatementDetailPanel';
import { StatementPrint } from '../src/pages/sales/shipment/statement/components/StatementPrint';
import { DeliveryPlanForm } from '../src/pages/sales/shipment/deliveryplan/components/DeliveryPlanForm';
import type { PlanRow } from '../src/pages/sales/shipment/deliveryplan/types/salesDeliveryPlan.types';
import type { F1GridRef } from '../src/shared/components/f1-grid';
import type { SalesOrderItem } from '../src/pages/sales/order/create/types/salesOrder.types';
import type { QuotationItem } from '../src/pages/sales/quotation/create/types/quotation.types';
import type { DeliveryItem } from '../src/pages/sales/shipment/delivery/create/types/salesDelivery.types';
import type { StatementItem } from '../src/pages/sales/shipment/statement/types/salesStatement.types';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/services/apiClient', () => ({ apiGet }));

const line = {
  salesOrderDetailId: 1, quotationDetailId: 1, salesDeliveryDetailId: 1, salesStatementDetailId: 1,
  lineNo: 1, orderQty: 1.234, quotationQty: 1.234, deliveryQty: 1.234,
  unitPrice: 12.345678, totalAmt: 15.234567, lineAmt: 15.234567,
  materialName: '품목', progressStatus: '대기',
};
const common = { loading: false, error: '', canEdit: false, onClose: vi.fn(), onView: vi.fn(), onEdit: vi.fn() };

describe('sales status detail decimal policy', () => {
  beforeEach(() => {
    apiGet.mockResolvedValue({ item: { SALES: {
      number: { places: 3, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
      decimal: { places: 6, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
      currency: { places: 3, trailingZeros: 'FIXED', rounding: 'HALF_UP' },
    } } });
    resetGridDecimalPolicyCache();
  });

  it.each([
    ['수주 품목 목록', <SalesOrderStatusDetailPanel {...common} order={{ status: '수주등록', totalAmt: 15.234567, details: [line] } as unknown as SalesOrderItem}
      orderStatusOptions={[]} progressStatusOptions={[]} deliveryMethodOptions={[]} />],
    ['견적 품목 목록', <QuotationStatusDetailPanel {...common} quotation={{ totalAmt: 15.234567, supplyAmt: 15.234567, vatAmt: 0, details: [line] } as unknown as QuotationItem} />],
    ['출하 품목 목록', <DeliveryStatusDetailPanel {...common} item={{ totalAmt: 15.234567, details: [line] } as unknown as DeliveryItem} />],
    ['거래명세서 품목 목록', <StatementDetailPanel {...common} onPrint={vi.fn()} item={{ totalAmt: 15.234567, details: [line] } as unknown as StatementItem} />],
  ])('uses the distinct quantity, price and amount rules in %s', async (tableName, panel) => {
    render(<GridDecimalModuleProvider moduleCode="SALES">{panel}</GridDecimalModuleProvider>);
    const table = screen.getByRole('table', { name: tableName });
    expect(await within(table).findByText('1.234')).toBeInTheDocument();
    expect(within(table).getByText('12.345678')).toBeInTheDocument();
    expect(within(table).getByText('15.235')).toBeInTheDocument();
  });

  it('displays the exact saved order price in the detail panel', async () => {
    const order = { status: '수주등록', totalAmt: '1234567890123.100001',
      details: [{ ...line, unitPrice: '1234567890123.100001' }] } as unknown as SalesOrderItem;
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <SalesOrderStatusDetailPanel {...common} order={order} orderStatusOptions={[]}
        progressStatusOptions={[]} deliveryMethodOptions={[]} />
    </GridDecimalModuleProvider>);
    const table = screen.getByRole('table', { name: '수주 품목 목록' });
    expect(await within(table).findByText('1,234,567,890,123.100001')).toBeInTheDocument();
  });

  it('displays the exact saved quotation price in the detail panel', async () => {
    const quotation = { totalAmt: '1234567890123.100001',
      details: [{ ...line, unitPrice: '1234567890123.100001' }] } as unknown as QuotationItem;
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <QuotationStatusDetailPanel {...common} quotation={quotation} />
    </GridDecimalModuleProvider>);
    const table = screen.getByRole('table', { name: '견적 품목 목록' });
    expect(await within(table).findByText('1,234,567,890,123.100001')).toBeInTheDocument();
  });

  it('displays the exact saved delivery price in the detail panel', async () => {
    const item = { totalAmt: '1234567890123.100001',
      details: [{ ...line, unitPrice: '1234567890123.100001' }] } as unknown as DeliveryItem;
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <DeliveryStatusDetailPanel {...common} item={item} />
    </GridDecimalModuleProvider>);
    const table = screen.getByRole('table', { name: '출하 품목 목록' });
    expect(await within(table).findByText('1,234,567,890,123.100001')).toBeInTheDocument();
  });

  it('prints decimal quantities and totals without binary addition errors', async () => {
    const item = {
      deliveryDt: '2026-11-24', statementDt: '2026-11-24', totalAmt: 3.980245,
      details: [
        { ...line, salesStatementDetailId: 1, deliveryQty: 0.1, unitPrice: 12.345678, supplyAmt: 1.234567, vatAmt: 0.1 },
        { ...line, salesStatementDetailId: 2, deliveryQty: 0.2, unitPrice: 12.345678, supplyAmt: 2.345678, vatAmt: 0.2 },
      ],
    } as unknown as StatementItem;
    render(<GridDecimalModuleProvider moduleCode="SALES"><StatementPrint item={item} onClose={vi.fn()} /></GridDecimalModuleProvider>);
    const dialog = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
    expect(await within(dialog).findAllByText('12.345678')).toHaveLength(4);
    expect(within(dialog).getAllByText('0.300')).toHaveLength(4);
    expect(within(dialog).getAllByText('3.580')).toHaveLength(2);
  });

  it('prints exact decimal strings from delivery details without losing digits', async () => {
    const item = { deliveryDt: '2026-11-24', statementDt: '2026-11-24', totalAmt: 0,
      details: [{ ...line, deliveryQty: '1', unitPrice: '1234567890123.100001',
        supplyAmt: '1234567890123.100001', vatAmt: '0' }] } as unknown as StatementItem;
    render(<GridDecimalModuleProvider moduleCode="SALES"><StatementPrint item={item} onClose={vi.fn()} /></GridDecimalModuleProvider>);
    const dialog = screen.getByRole('dialog', { name: '거래명세표 미리보기' });
    expect(await within(dialog).findAllByText('1,234,567,890,123.100001')).toHaveLength(2);
    expect(within(dialog).getAllByText('1,234,567,890,123.100')).toHaveLength(4);
  });

  it('displays the exact split plan total using the quantity policy', async () => {
    const row = { rowId: 'a', salesOrderId: 1, salesOrderDetailId: 2, orderQty: 1,
      remainingPlanQty: 0.3, plannedQty: 0.1, deliveredQty: 0, materialName: '품목' } as PlanRow;
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <DeliveryPlanForm storageKey="test-plan-decimal" planNo="" orderNo="" orderDt="" customerName=""
        rows={[row, { ...row, rowId: 'b', plannedQty: 0.2 }]} setRows={vi.fn()}
        gridRef={createRef<F1GridRef<PlanRow>>()} editable canSelectOrder={false} onSelectOrder={vi.fn()} />
    </GridDecimalModuleProvider>);
    const grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
    expect(await within(grid).findByText('0.300')).toBeInTheDocument();
  });

  it('preserves a six-place plan quantity entered in the grid', async () => {
    apiGet.mockResolvedValue({ item: { SALES: {
      number: { places: 6, trailingZeros: 'FIXED', rounding: 'DOWN' },
      decimal: { places: 6, trailingZeros: 'FIXED', rounding: 'DOWN' },
      currency: { places: 3, trailingZeros: 'FIXED', rounding: 'DOWN' },
    } } });
    const row = { rowId: 'a', salesOrderId: 1, salesOrderDetailId: 2, orderQty: 2,
      remainingPlanQty: 2, plannedQty: 1, deliveredQty: 0, materialName: '품목' } as PlanRow;
    const setRows = vi.fn();
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <DeliveryPlanForm storageKey="test-plan-exact" planNo="" orderNo="" orderDt="" customerName=""
        rows={[row]} setRows={setRows} gridRef={createRef<F1GridRef<PlanRow>>()}
        editable canSelectOrder={false} onSelectOrder={vi.fn()} />
    </GridDecimalModuleProvider>);
    const grid = screen.getByRole('grid', { name: '출하계획 상세 목록' });
    const [cell] = await within(grid).findAllByText('1.000000');
    fireEvent.doubleClick(cell);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1234567890123.100001' } });
    fireEvent.keyDown(screen.getByRole('spinbutton'), { key: 'Enter', code: 'Enter' });
    await waitFor(() => {
      const lastUpdate = setRows.mock.calls.at(-1)?.[0];
      expect(typeof lastUpdate).toBe('function');
      expect(lastUpdate([row])[0].plannedQty).toBe('1234567890123.100001');
    });
  });
});
