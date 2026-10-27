import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createClassification,
  fetchClassifications,
  updateClassification,
} from '../src/pages/co/master/classification/services/classification.service';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

const row = { id: '12', name: 'Root', level: '1', parentId: null, sortSeq: '0', useAt: 'Y' };

beforeEach(() => vi.resetAllMocks());

describe('classification service', () => {
  it.each(['item', 'partner'] as const)('loads and normalizes %s classifications', async (kind) => {
    api.apiGet.mockResolvedValue({ resultList: [row] });
    await expect(fetchClassifications(kind)).resolves.toEqual([
      { ...row, id: 12, level: 1, sortSeq: 0 },
    ]);
    expect(api.apiGet).toHaveBeenCalledWith(
      `/api/v1/co/master/classifications/${kind === 'item' ? 'items' : 'partners'}`,
    );
  });

  it('creates roots and children but only sends mutable fields on update', async () => {
    api.apiPost.mockResolvedValue({ item: row });
    api.apiPut.mockResolvedValue({ item: row });
    const root = { name: 'Root', sortSeq: 0, useAt: 'Y' as const };
    await createClassification('item', root);
    await createClassification('partner', { ...root, parentId: 7 });
    await updateClassification('item', 12, { ...root, parentId: 99 });
    expect(api.apiPost).toHaveBeenNthCalledWith(1, '/api/v1/co/master/classifications/items', root);
    expect(api.apiPost).toHaveBeenNthCalledWith(2, '/api/v1/co/master/classifications/partners', { ...root, parentId: 7 });
    expect(api.apiPut).toHaveBeenCalledWith('/api/v1/co/master/classifications/items/12', root);
  });

  it('preserves API errors and rejects incomplete or malformed success responses', async () => {
    api.apiGet.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(fetchClassifications('item')).rejects.toThrow('Permission denied');
    api.apiGet.mockResolvedValueOnce({});
    await expect(fetchClassifications('item')).rejects.toThrow('분류 목록 응답');
    api.apiGet.mockResolvedValueOnce({ resultList: [{ ...row, id: '' }] });
    await expect(fetchClassifications('item')).rejects.toThrow('분류 응답');
    api.apiGet.mockResolvedValueOnce({ resultList: [{ ...row, useAt: 'X' }] });
    await expect(fetchClassifications('partner')).rejects.toThrow('분류 응답');
    api.apiPost.mockResolvedValue({});
    await expect(createClassification('item', { name: 'Root' })).rejects.toThrow('분류 저장 응답');
  });
});
