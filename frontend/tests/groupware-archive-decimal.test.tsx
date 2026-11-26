import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { F1Grid } from '../src/shared/components/f1-grid';
import { GridDecimalModuleProvider } from '../src/shared/components/f1-grid/core/GridDecimalPolicy';
import { createArchivePostColumns } from '../src/pages/groupware/community/archive/data/archivePostGridData';
import type { ArchivePost } from '../src/pages/groupware/community/archive/types/archive.types';
import * as decimalPolicyService from '../src/shared/services/gridDecimalPolicy.service';
import * as decimalColumns from '../src/shared/services/decimalColumnContract';

afterEach(() => vi.restoreAllMocks());

const attachmentColumn = () => createArchivePostColumns([], vi.fn()).find((column) => column.field === 'attachmentCount');

it('follows the groupware contract for the attachment count without setting places directly', () => {
  expect(attachmentColumn()).toMatchObject({ type: 'number', decimal: {} });
  expect(attachmentColumn()?.decimalPlaces).toBeUndefined();
  expect(attachmentColumn()?.rounding).toBeUndefined();
});

it('passes a contract exception of the attachment count to the grid when one is added later', () => {
  vi.spyOn(decimalColumns, 'getDecimalColumnContract').mockReturnValue({
    attachmentCount: { type: 'number', places: 1 },
  });
  expect(attachmentColumn()).toMatchObject({ decimal: { places: 1 } });
});

it('shows the attachment count as an integer with the groupware number policy (0 places)', async () => {
  const rule = { trailingZeros: 'FIXED' as const, rounding: 'HALF_UP' as const };
  const rules = { GROUPWARE: {
    number: { ...rule, places: 0 }, decimal: { ...rule, places: 2 }, currency: { ...rule, places: 2 },
  } };
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicy').mockResolvedValue(rules);
  vi.spyOn(decimalPolicyService, 'fetchGridDecimalPolicyStrict').mockResolvedValue(rules);
  const columns = createArchivePostColumns([], vi.fn()).filter((column) => column.field === 'attachmentCount');
  render(
    <GridDecimalModuleProvider moduleCode="groupware">
      <F1Grid<ArchivePost> ariaLabel="자료실" rowKey="postId" columns={columns} height={200}
        rows={[{ postId: 1, attachmentCount: 3 } as unknown as ArchivePost]} />
    </GridDecimalModuleProvider>,
  );
  const grid = await screen.findByRole('grid', { name: '자료실' });
  await waitFor(() => expect(within(grid).getByRole('gridcell', { name: '3' })).toBeInTheDocument());
  expect(within(grid).queryByRole('gridcell', { name: '3.00' })).not.toBeInTheDocument();
});
