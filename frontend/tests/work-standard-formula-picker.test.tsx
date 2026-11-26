import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkStandardFormulaTab } from '../src/pages/co/work-standard/recipe/components/WorkStandardFormulaTab';
import { SAMPLE_WORK_STANDARDS } from '../src/pages/co/work-standard/recipe/data/workStandard.data';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import * as decimalPolicyService from '../src/shared/services/gridDecimalPolicy.service';

vi.mock('../src/pages/co/work-standard/recipe/services/workStandard.service', () => ({
  searchWorkStandardMaterials: vi.fn(async () => [{
    id: 9001,
    code: 'OWNED-9001',
    name: 'Owned test material',
    details: [
      { label: '품목규격', value: 'Owned spec' },
      { label: '단위', value: 'kg' },
    ],
  }]),
}));

const rows = SAMPLE_WORK_STANDARDS[0].formula.slice(0, 2);

function renderFormulaTab() {
  const rule = { trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const };
  const rules = {
    COMMON: {
      number: { ...rule, places: 0 },
      decimal: { ...rule, places: 3 },
      currency: { ...rule, places: 3 },
    },
  };
  decimalPolicyService.resetGridDecimalPolicyCache();
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
  return render(
    <GridDecimalModuleProvider moduleCode="COMMON">
      <WorkStandardFormulaTab rows={rows} baseQty={40} />
    </GridDecimalModuleProvider>,
  );
}

async function chooseMaterial() {
  const dialog = await screen.findByRole('dialog', { name: '품목 선택' });
  fireEvent.click(within(dialog).getByRole('button', { name: '검색' }));
  fireEvent.click(await within(dialog).findByRole('button', {
    name: 'OWNED-9001 Owned test material 선택',
  }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('work standard formula picker targets', () => {
  it('applies the cell code picker patch without changing quantity or totals', async () => {
    renderFormulaTab();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '000112' }));
    fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));
    await chooseMaterial();
    const updated = screen.getByRole('gridcell', { name: 'OWNED-9001' }).closest('[role="row"]')!;
    expect(within(updated).getByText('Owned test material')).toBeInTheDocument();
    expect(within(updated).getByText('Owned spec')).toBeInTheDocument();
    expect(within(updated).getByText('18.000')).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '000131' })).toBeInTheDocument();
    expect(screen.getByLabelText('배합비 합계')).toHaveTextContent('30.000');
  }, 15000);

  it('clears a cancelled cell target before selecting another row from the toolbar', async () => {
    render(<WorkStandardFormulaTab rows={rows} baseQty={40} />);
    fireEvent.doubleClick(screen.getByRole('gridcell', { name: '000112' }));
    fireEvent.click(screen.getByRole('button', { name: '코드 선택' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('gridcell', { name: '000131' }));
    const select = screen.getByRole('button', { name: '원료 선택' });
    await waitFor(() => expect(select).toBeEnabled());
    fireEvent.click(select);
    await chooseMaterial();
    expect(screen.getByRole('gridcell', { name: '000112' })).toBeInTheDocument();
    expect(screen.queryByRole('gridcell', { name: '000131' })).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'OWNED-9001' })).toBeInTheDocument();
  }, 15000);

  it('preserves the open target while disabled and restores it when enabled', async () => {
    const view = (disabled = false) => (
      <WorkStandardFormulaTab rows={rows} baseQty={40} disabled={disabled} />
    );
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole('gridcell', { name: '000131' }));
    fireEvent.click(screen.getByRole('button', { name: '원료 선택' }));
    await screen.findByRole('dialog');
    rerender(view(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '원료 선택' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '원료 추가' })).toBeDisabled();
    rerender(view());
    await chooseMaterial();
    expect(screen.getByRole('gridcell', { name: '000112' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'OWNED-9001' })).toBeInTheDocument();
  }, 15000);
});
