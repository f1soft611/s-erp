import { describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import { searchSalesDestinations } from '../src/pages/sales/master/destination/services/salesDestination.service';

vi.mock('../src/shared/services/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('sales destinations', () => {
  it('searches only the selected customer and maps picker options', async () => {
    vi.mocked(apiGet).mockResolvedValue({
      resultList: [
        { salesDestinationId: 1, customerId: 10, destinationCode: '000001', destinationName: '본점' },
        { salesDestinationId: 2, customerId: 10, destinationCode: '000002', destinationName: '물류센터' },
      ],
    });
    await expect(searchSalesDestinations(10, '물류')).resolves.toEqual([
      { id: 2, code: '000002', name: '물류센터' },
    ]);
    expect(apiGet).toHaveBeenCalledWith('/api/v1/sales/destinations?customerId=10');
  });
});
