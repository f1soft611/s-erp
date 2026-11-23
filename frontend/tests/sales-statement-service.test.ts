import { beforeEach, expect, it, vi } from 'vitest';
import { apiPost } from '../src/shared/services/apiClient';
import { createStatement } from '../src/pages/sales/shipment/statement/services/salesStatement.service';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

it('allows 100 distinct details and rejects 101 before posting', async () => {
  const ids = Array.from({ length: 101 }, (_, index) => index + 1);
  const payload = { salesDeliveryId: 1, salesDeliveryDetailIds: ids.slice(0, 100), statementDt: '2026-11-20', remark: '' };
  vi.mocked(apiPost).mockResolvedValue({ item: { salesStatementId: 1 } });
  await expect(createStatement(payload)).resolves.toMatchObject({ salesStatementId: 1 });
  vi.mocked(apiPost).mockClear();
  await expect(createStatement({ ...payload, salesDeliveryDetailIds: ids })).rejects.toThrow(/100건/);
  expect(apiPost).not.toHaveBeenCalled();
});
