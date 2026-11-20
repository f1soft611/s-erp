import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWarehouseColumns, createWarehouseRow } from '../src/pages/co/master/warehouse/data/warehouseGridData';
import {
  DEFAULT_WAREHOUSE_FILTERS,
  WAREHOUSE_USE_FILTER_FIELD,
  toWarehouseSearchFilters,
} from '../src/pages/co/master/warehouse/data/warehouseSearch';
import { fetchWarehouses, normalizeWarehouseRow } from '../src/pages/co/master/warehouse/services/warehouseManagement.service';

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => ({ apiGet: mocks.apiGet, apiPost: vi.fn(), apiPut: vi.fn() }));

const apiRow = {
  warehouseId: 1, warehouseCode: '001', warehouseName: '자재창고', warehouseType: '',
  deleteLockAt: 'N', disuseAt: 'N', useAt: 'N', stockQtyDispAt: 'Y', stockIoAt: 'Y', safetyStockAlertAt: 'N', stockDefaultAt: 'N',
};

describe('창고 미사용(사용여부)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('새 창고는 사용 상태로 시작하고 사용여부는 불용창고와 별개의 열이다', () => {
    expect(createWarehouseRow().useAt).toBe('Y');
    const columns = createWarehouseColumns(true, []);
    const use = columns.find((column) => column.field === 'useAt')!;
    expect(use).toMatchObject({ headerName: '사용', type: 'checkbox' });
    expect(use.form).toMatchObject({ group: '운영설정', order: 0 });
    expect(columns.find((column) => column.field === 'disuseAt')?.headerName).toBe('불용창고');
    expect(use.onValueChange?.(createWarehouseRow(), false)).toEqual({ useAt: 'N' });
  });

  it('미사용 창고는 코드·이름이 흐리게 보인다', () => {
    const name = createWarehouseColumns(true, []).find((column) => column.field === 'warehouseName')!;
    const context = (useAt: 'Y' | 'N') => ({ row: { ...createWarehouseRow(), useAt } }) as never;
    expect(name.getCellStyle?.(context('N'))).toEqual({ opacity: 0.5 });
    expect(name.getCellStyle?.(context('Y'))).toBeUndefined();
  });

  it('기본 조회는 사용 중인 창고만이고 상세검색에서 미사용·전체로 바꾼다', () => {
    expect(DEFAULT_WAREHOUSE_FILTERS).toEqual({ useAt: 'Y' });
    expect(WAREHOUSE_USE_FILTER_FIELD).toMatchObject({ field: 'useFilter', allowEmpty: false });
    const filters = (useFilter?: string) => toWarehouseSearchFilters({
      keyword: ' 자재 ', detailValues: useFilter === undefined ? {} : { useFilter },
    });
    expect(filters()).toEqual({ keyword: '자재', warehouseType: undefined, useAt: 'Y' });
    expect(filters('Y').useAt).toBe('Y');
    expect(filters('N').useAt).toBe('N');
    expect(filters('ALL').useAt).toBeUndefined();
  });

  it('API 응답의 사용여부를 읽고 조회 조건을 useAt으로 보낸다', async () => {
    expect(normalizeWarehouseRow(apiRow).useAt).toBe('N');
    expect(() => normalizeWarehouseRow({ ...apiRow, useAt: undefined })).toThrow('사용여부');
    mocks.apiGet.mockResolvedValue({ resultList: [apiRow] });
    await fetchWarehouses({ disuseAt: 'N', useAt: 'Y' });
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/v1/co/master/warehouses?disuseAt=N&useAt=Y');
  });
});
