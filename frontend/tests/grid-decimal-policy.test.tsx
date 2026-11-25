import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useLayoutEffect, useMemo } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import { usePolicyDecimalRule, usePolicyDecimalStatus } from '../src/shared/components/f1-grid/core/gridDecimalPolicyContext';
import { roundGridNumber } from '../src/shared/components/f1-grid/utils/grid.utils';
import { resetGridDecimalPolicyCache } from '../src/shared/services/gridDecimalPolicy.service';
import type { F1GridColumn } from '../src/shared/components/f1-grid/types/grid.types';
import { createSalesOrderDetailColumns, createSalesOrderDetailRow } from '../src/pages/sales/order/create/data/salesOrderDetail';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/services/apiClient', () => ({ apiGet }));

type Row = { id: number; policyQty: number; fixedQty: number; price: number };
const columns: F1GridColumn<Row>[] = [
  { field: 'policyQty', headerName: '정책수량', type: 'decimal', width: 120 },
  { field: 'fixedQty', headerName: '고정수량', type: 'decimal', decimalPlaces: 1, width: 120 },
  { field: 'price', headerName: '단가', type: 'currency', width: 120 },
];
const rows: Row[] = [{ id: 1, policyQty: 1.2, fixedQty: 1.25, price: 700 }];

function renderGrid(moduleCode?: string) {
  const grid = <F1Grid ariaLabel="테스트" columns={columns} rows={rows} rowKey="id" />;
  return render(moduleCode ? <GridDecimalModuleProvider moduleCode={moduleCode}>{grid}</GridDecimalModuleProvider> : grid);
}

const rule = (places: number, trailingZeros: 'FIXED' | 'AUTO', rounding: 'HALF_UP' | 'UP' | 'DOWN') => ({
  places, trailingZeros, rounding,
});

describe('F1Grid module decimal policy', () => {
  beforeEach(() => {
    apiGet.mockReset();
    resetGridDecimalPolicyCache();
  });

  it('preserves significant digits while formatting large values and 6-place fractions', () => {
    expect(roundGridNumber(1234567890123.123, 3, 'HALF_UP')).toBe(1234567890123.123);
    expect(roundGridNumber(1234567890123.1006, 3, 'UP')).toBe(1234567890123.101);
    expect(roundGridNumber(0.123456, 6, 'HALF_UP')).toBe(0.123456);
    expect(roundGridNumber(3.3000000000000003, 3, 'UP')).toBe(3.3);
  });

  it('clears the rule before the context-free commit and ignores a late response after reentry', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    const commits: Array<{ phase: string; places: number | undefined }> = [];
    function Probe({ phase }: { phase: string }) {
      const policy = usePolicyDecimalRule();
      const places = policy && 'places' in policy ? policy.places : undefined;
      useLayoutEffect(() => {
        commits.push({ phase, places });
      }, [phase, places]);
      return <output aria-label="정책 자리수">{places ?? 'default'}</output>;
    }
    const view = (moduleCode: string) => (
      <GridDecimalModuleProvider moduleCode={moduleCode}><Probe phase={moduleCode} /></GridDecimalModuleProvider>
    );
    const { rerender } = render(view('SALES'));
    await waitFor(() => expect(screen.getByLabelText('정책 자리수')).toHaveTextContent('3'));
    commits.length = 0;
    rerender(view(' '));
    expect(commits.map((value) => value.places)).toEqual([undefined]);
    expect(apiGet).toHaveBeenCalledTimes(1);
    let resolvePolicy!: (value: { item: Record<string, ReturnType<typeof rule>> }) => void;
    const pending = new Promise<{ item: Record<string, ReturnType<typeof rule>> }>((resolve) => {
      resolvePolicy = resolve;
    });
    resetGridDecimalPolicyCache();
    apiGet.mockReturnValueOnce(pending);
    rerender(view('SALES'));
    expect(screen.getByLabelText('정책 자리수')).toHaveTextContent('default');
    expect(apiGet).toHaveBeenCalledTimes(2);
    rerender(view(''));
    await act(async () => { resolvePolicy({ item: { SALES: rule(4, 'FIXED', 'UP') } }); });
    expect(screen.getByLabelText('정책 자리수')).toHaveTextContent('default');
    expect(commits.every((value) => value.places === undefined)).toBe(true);
  });

  it('does not expose the previous module rule while another module loads', async () => {
    apiGet.mockResolvedValueOnce({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    const commits: Array<{ module: string; places: number | undefined }> = [];
    function Probe({ module }: { module: string }) {
      const current = usePolicyDecimalRule();
      const places = current && 'places' in current ? current.places : undefined;
      useLayoutEffect(() => { commits.push({ module, places }); }, [module, places]);
      return <output>{module}:{places ?? '-'}</output>;
    }
    const view = (module: string) => <GridDecimalModuleProvider moduleCode={module}>
      <Probe module={module} />
    </GridDecimalModuleProvider>;
    const { rerender } = render(view('SALES'));
    expect(await screen.findByText('SALES:3')).toBeInTheDocument();
    let resolve!: (value: { item: Record<string, ReturnType<typeof rule>> }) => void;
    apiGet.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    act(() => resetGridDecimalPolicyCache());
    commits.length = 0;
    rerender(view('PURCHASE'));
    expect(screen.getByText('PURCHASE:-')).toBeInTheDocument();
    expect(commits[0]).toEqual({ module: 'PURCHASE', places: undefined });
    await act(async () => { resolve({ item: { PURCHASE: rule(6, 'FIXED', 'DOWN') } }); });
    expect(await screen.findByText('PURCHASE:6')).toBeInTheDocument();
  });

  it('applies the module policy only to columns without decimalPlaces', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    renderGrid('sales');
    expect(await screen.findByText('1.200')).toBeTruthy();
    expect(screen.getByText('1.3')).toBeTruthy();
    expect(screen.getByText('700.000')).toBeTruthy();
  });

  it('applies separate module rules for number, decimal and currency columns', async () => {
    apiGet.mockResolvedValue({
      item: {
        SALES: {
          number: rule(0, 'FIXED', 'HALF_UP'),
          decimal: rule(3, 'FIXED', 'HALF_UP'),
          currency: rule(2, 'FIXED', 'HALF_UP'),
        },
      },
    });
    render(
      <GridDecimalModuleProvider moduleCode="SALES">
        <F1Grid
          ariaLabel="타입별 정책"
          columns={[
            { field: 'quantity', headerName: '수량', type: 'number' },
            { field: 'price', headerName: '단가', type: 'decimal' },
            { field: 'amount', headerName: '금액', type: 'currency' },
          ]}
          rows={[{ id: 1, quantity: 2.2, price: 1.2, amount: 2.4 }]}
          rowKey="id"
        />
      </GridDecimalModuleProvider>,
    );
    expect(await screen.findByText('1.200')).toBeTruthy();
    expect(screen.getByText('2.40')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('limits exact cell editing to the loaded type-specific policy', async () => {
    apiGet.mockResolvedValue({ item: { SALES: {
      number: rule(0, 'FIXED', 'HALF_UP'),
      decimal: rule(3, 'FIXED', 'HALF_UP'),
      currency: rule(3, 'FIXED', 'HALF_UP'),
    } } });
    render(<GridDecimalModuleProvider moduleCode="SALES">
      <F1Grid rowKey="id" rows={[{ id: 1, quantity: '1', price: '1.2' }]} columns={[
        { field: 'quantity', headerName: '수량', type: 'number', exactDecimal: true, editable: true },
        { field: 'price', headerName: '단가', type: 'decimal', exactDecimal: true, editable: true },
      ]} />
    </GridDecimalModuleProvider>);
    const price = await screen.findByRole('gridcell', { name: '1.200' });
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '1' }));
    let editor = screen.getByRole('spinbutton');
    fireEvent.change(editor, { target: { value: '1.2' } });
    expect(editor).toHaveValue(1);
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.doubleClick(price);
    editor = screen.getByRole('spinbutton');
    fireEvent.change(editor, { target: { value: '1.234' } });
    fireEvent.change(editor, { target: { value: '1.2345' } });
    expect(editor).toHaveValue(1.234);
    fireEvent.change(editor, { target: { value: '1.235' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(screen.getByRole('gridcell', { name: '1.235' })).toBeInTheDocument();
  });

  it('uses the sales defaults when that module has no saved policy', async () => {
    apiGet.mockResolvedValue({ item: {} });
    render(
      <GridDecimalModuleProvider moduleCode="SALES">
        <F1Grid ariaLabel="기본 정책"
          columns={[
            { field: 'quantity', headerName: '수량', type: 'number' },
            { field: 'price', headerName: '단가', type: 'decimal' },
            { field: 'amount', headerName: '금액', type: 'currency' },
          ]}
          rows={[{ id: 1, quantity: 2, price: 1.2, amount: 2.4 }]} rowKey="id" />
      </GridDecimalModuleProvider>,
    );
    expect(await screen.findByText('1.200')).toBeTruthy();
    expect(screen.getByText('2.400')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('refreshes an already mounted grid after the policy cache is invalidated', async () => {
    apiGet.mockResolvedValueOnce({ item: { SALES: rule(2, 'FIXED', 'HALF_UP') } });
    renderGrid('SALES');
    expect(await screen.findByText('1.20')).toBeTruthy();
    apiGet.mockResolvedValueOnce({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    act(() => resetGridDecimalPolicyCache());
    expect(await screen.findByText('1.200')).toBeTruthy();
  });

  it('uses the updated currency policy for later sales calculations without changing the price rule', async () => {
    const number = rule(3, 'FIXED', 'HALF_UP');
    const decimal = rule(3, 'FIXED', 'DOWN');
    apiGet.mockResolvedValueOnce({ item: { SALES: { number, decimal, currency: rule(2, 'FIXED', 'HALF_UP') } } });
    const row = { ...createSalesOrderDetailRow(), rowId: 'policy-test', orderQty: '1.234',
      unitPrice: '1.000', supplyAmount: '1.23', vatAmount: '0.12', totalAmount: '1.35' };
    function SalesGrid() {
      const policy = usePolicyDecimalRule();
      const amountRule = policy && ('places' in policy ? policy : policy.currency);
      const salesColumns = useMemo(() => createSalesOrderDetailColumns(() => {}, false, [], undefined, amountRule), [amountRule]);
      return <F1Grid ariaLabel="수주 정책 검증" columns={salesColumns} rows={[row]} rowKey="rowId" />;
    }
    render(<GridDecimalModuleProvider moduleCode="SALES"><SalesGrid /></GridDecimalModuleProvider>);
    const grid = screen.getByRole('grid', { name: '수주 정책 검증' });
    const editPrice = (text: string) => {
      const price = within(grid).getAllByRole('gridcell')[4];
      fireEvent.doubleClick(price);
      const editor = within(grid).getByRole('spinbutton');
      fireEvent.change(editor, { target: { value: text } });
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    };
    await within(grid).findByText('1.000');
    editPrice('1.235');
    expect(within(grid).getByRole('gridcell', { name: '1.52' })).toBeInTheDocument();

    apiGet.mockResolvedValueOnce({ item: { SALES: { number, decimal, currency: rule(0, 'FIXED', 'DOWN') } } });
    act(() => resetGridDecimalPolicyCache());
    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(within(grid).getAllByRole('gridcell')[5]).toHaveTextContent(/^1$/));
    editPrice('2.234');
    expect(within(grid).getAllByRole('gridcell')[4]).toHaveTextContent('2.234');
    expect(within(grid).getAllByRole('gridcell')[5]).toHaveTextContent('2');
  });

  it('shows zeros only when present with AUTO and keeps them with FIXED', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(3, 'AUTO', 'HALF_UP') } });
    renderGrid('sales');
    expect(await screen.findByText('1.2')).toBeTruthy();
    expect(screen.getByText('700')).toBeTruthy();
  });

  it.each([
    ['HALF_UP', '1.24'], ['UP', '1.24'], ['DOWN', '1.23'],
  ] as const)('rounds with %s', async (mode, expected) => {
    apiGet.mockResolvedValue({ item: { SALES: rule(2, 'FIXED', mode) } });
    render(
      <GridDecimalModuleProvider moduleCode="SALES">
        <F1Grid
          ariaLabel="반올림"
          columns={[{ field: 'qty', headerName: '수량', type: 'decimal', width: 120 }]}
          rows={[{ id: 1, qty: mode === 'HALF_UP' ? 1.236 : 1.2349 }]}
          rowKey="id"
        />
      </GridDecimalModuleProvider>,
    );
    expect(await screen.findByText(expected)).toBeTruthy();
  });

  it('lets a column override trailingZeros and rounding', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(2, 'FIXED', 'UP') } });
    render(
      <GridDecimalModuleProvider moduleCode="SALES">
        <F1Grid
          ariaLabel="개별"
          columns={[{ field: 'qty', headerName: '수량', type: 'decimal', trailingZeros: 'AUTO', rounding: 'DOWN', width: 120 }]}
          rows={[{ id: 1, qty: 1.239 }]}
          rowKey="id"
        />
      </GridDecimalModuleProvider>,
    );
    expect(await screen.findByText('1.23')).toBeTruthy();
  });

  it('lets a column set everything with the decimal object and keeps the policy for omitted items', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(2, 'FIXED', 'UP') } });
    render(
      <GridDecimalModuleProvider moduleCode="SALES">
        <F1Grid
          ariaLabel="객체"
          columns={[
            { field: 'qty', headerName: '수량', type: 'decimal', decimal: { places: 3, trailingZeros: 'AUTO', rounding: 'DOWN' }, width: 120 },
            { field: 'price', headerName: '단가', type: 'decimal', decimal: { places: 1 }, width: 120 },
          ]}
          rows={[{ id: 1, qty: 1.2399, price: 5.01 }]}
          rowKey="id"
        />
      </GridDecimalModuleProvider>,
    );
    expect(await screen.findByText('1.239')).toBeTruthy();
    // places만 지정: 0 표시/반올림은 정책(FIXED, UP)을 따른다.
    expect(screen.getByText('5.1')).toBeTruthy();
  });

  it('keeps the grid default when the request fails', async () => {
    apiGet.mockRejectedValue(new Error('403'));
    renderGrid('production');
    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(await screen.findByText('1.2')).toBeTruthy();
  });

  it('distinguishes a failed policy lookup from a missing policy and retries after invalidation', async () => {
    apiGet.mockRejectedValueOnce(new Error('403')).mockResolvedValueOnce({ item: {} });
    function Probe() {
      const { status, rule: current } = usePolicyDecimalStatus();
      const places = current && !('places' in current) ? current.decimal.places : undefined;
      return <output aria-label="저장 정책 상태">{status}:{places ?? '-'}</output>;
    }
    render(<GridDecimalModuleProvider moduleCode="SALES"><Probe /></GridDecimalModuleProvider>);
    expect(await screen.findByText('error:-')).toBeInTheDocument();
    act(() => resetGridDecimalPolicyCache());
    expect(await screen.findByText('ready:3')).toBeInTheDocument();
  });

  it('does not request the policy outside a module context', () => {
    renderGrid();
    expect(apiGet).not.toHaveBeenCalled();
  });
});

