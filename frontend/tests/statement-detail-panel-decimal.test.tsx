import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StatementDetailPanel } from '../src/pages/sales/shipment/statement/status/components/StatementDetailPanel';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import * as decimalPolicyService from '../src/shared/services/gridDecimalPolicy.service';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';
import type { StatementItem } from '../src/pages/sales/shipment/statement/types/salesStatement.types';

const rule = { trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const };
const rules = { SALES: {
  number: { ...rule, places: 2 }, decimal: { ...rule, places: 2 }, currency: { ...rule, places: 2 },
} };
const item = { statementNo: 'ST-1', totalAmt: '1234.5678', details: [], deliveryType: 'ORDER' } as unknown as StatementItem;
const renderPanel = () => render(<GridDecimalModuleProvider moduleCode="SALES">
  <StatementDetailPanel item={item} loading={false} error="" canEdit={false}
    onClose={vi.fn()} onView={vi.fn()} onEdit={vi.fn()} onPrint={vi.fn()} />
</GridDecimalModuleProvider>);

it('shows the statement total with the contract rule of the delivery total column, not the type policy', async () => {
  const strict = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
  const standard = vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
  const contract = vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    deliveryQty: { type: 'number' }, unitPrice: { type: 'decimal' }, totalAmt: { type: 'currency' },
    deliveryTotal: { type: 'currency', places: 1, rounding: 'DOWN' },
  });
  try {
    renderPanel();
    await waitFor(() => expect(screen.getByText('1,234.5')).toBeInTheDocument());
  } finally { strict.mockRestore(); standard.mockRestore(); contract.mockRestore(); }
});

it('does not show the total with a fixed two places before a policy rule exists', () => {
  render(<StatementDetailPanel item={item} loading={false} error="" canEdit={false}
    onClose={vi.fn()} onView={vi.fn()} onEdit={vi.fn()} onPrint={vi.fn()} />);
  expect(screen.queryByText('1,234.57')).not.toBeInTheDocument();
});
