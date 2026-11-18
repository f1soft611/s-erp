import { act, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import { usePolicyDecimalRule } from '../src/shared/components/f1-grid/core/gridDecimalPolicyContext';
import { resetGridDecimalPolicyCache } from '../src/shared/services/gridDecimalPolicy.service';
import type { F1GridColumn } from '../src/shared/components/f1-grid/types/grid.types';

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

  it('clears the rule before the context-free commit and ignores a late response after reentry', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    const commits: Array<{ phase: string; places: number | undefined }> = [];
    function Probe({ phase }: { phase: string }) {
      const policy = usePolicyDecimalRule();
      useLayoutEffect(() => {
        commits.push({ phase, places: policy?.places });
      }, [phase, policy]);
      return <output aria-label="정책 자리수">{policy?.places ?? 'default'}</output>;
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

  it('applies the module policy only to columns without decimalPlaces', async () => {
    apiGet.mockResolvedValue({ item: { SALES: rule(3, 'FIXED', 'HALF_UP') } });
    renderGrid('sales');
    expect(await screen.findByText('1.200')).toBeTruthy();
    expect(screen.getByText('1.3')).toBeTruthy();
    expect(screen.getByText('700.000')).toBeTruthy();
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

  it('does not request the policy outside a module context', () => {
    renderGrid();
    expect(apiGet).not.toHaveBeenCalled();
  });
});

