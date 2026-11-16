import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  buildPurchaseRequestPayload,
  createPurchaseRequest,
  deletePurchaseRequest,
  getPurchaseRequest,
  purchaseRequestStatusLabel,
  searchPurchaseMaterials,
  toPurchaseRequestRows,
  updatePurchaseRequest,
  validatePurchaseRequestInput,
} from '../src/pages/materials/request/create/services/purchaseRequest.service';
import type { PurchaseRequestDetailRow } from '../src/pages/materials/request/create/data/purchaseRequestDetail';
import type { PurchaseRequestItem } from '../src/pages/materials/request/create/types/purchaseRequest.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);
const apiDeleteMock = vi.mocked(apiDelete);

function row(overrides: Partial<PurchaseRequestDetailRow> = {}): PurchaseRequestDetailRow {
  return {
    rowId: 'r1',
    purchaseRequestDetailId: null,
    materialId: 101,
    materialCode: 'M-101',
    materialName: '품목 101',
    materialSpec: '',
    unit: 'EA',
    requestQty: 10,
    requestDeliveryDt: '2026-11-20',
    useType: 'PRODUCTION',
    requestRemark: '',
    confirmQty: null,
    ...overrides,
  };
}

function item(): PurchaseRequestItem {
  return {
    purchaseRequestId: 300,
    requestNo: 'MR-20261112-0001',
    requestDt: '2026-11-12',
    requesterName: '홍길동',
    requestDeptName: '생산지원팀',
    status: 'REQUESTED',
    remark: null,
    createdByName: '홍길동',
    createdAt: '2026-11-12 08:38',
    updatedByName: null,
    updatedAt: null,
    details: [
      {
        purchaseRequestDetailId: 400,
        lineNo: 1,
        materialId: 101,
        materialCode: 'M-101',
        materialName: '품목 101',
        materialSpec: null,
        unit: 'EA',
        requestQty: 10,
        requestDeliveryDt: '2026-11-20',
        useType: 'PRODUCTION',
        useTypeName: '생산',
        requestRemark: null,
        confirmQty: null,
      },
    ],
  };
}

describe('purchase request create API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires request date, at least one row and complete detail values', () => {
    expect(validatePurchaseRequestInput({ requestDt: '', details: [] }).messages).toEqual([
      '요청일을 입력해 주세요.',
      '품목 상세를 1건 이상 입력해 주세요.',
    ]);
    const messages = validatePurchaseRequestInput({
      requestDt: '2026-11-12',
      details: [row({ materialId: null, requestQty: 0, requestDeliveryDt: '', useType: '' })],
    }).messages;
    expect(messages).toEqual([
      '품목을 선택해 주세요.',
      '요청수량은 0보다 커야 합니다.',
      '요청납기일을 입력해 주세요.',
      '사용용도를 선택해 주세요.',
    ]);
    expect(validatePurchaseRequestInput({ requestDt: '2026-11-12', details: [row()] }).messages).toEqual([]);
  });

  it('builds a payload with detail ids and without requester fields', () => {
    const payload = buildPurchaseRequestPayload({
      requestDt: '2026-11-12',
      remark: '  ',
      details: [row({ purchaseRequestDetailId: 400, requestRemark: ' 메모 ' })],
    });
    expect(payload).toEqual({
      requestDt: '2026-11-12',
      remark: null,
      details: [{
        purchaseRequestDetailId: 400,
        materialId: 101,
        requestQty: 10,
        requestDeliveryDt: '2026-11-20',
        useType: 'PRODUCTION',
        requestRemark: '메모',
      }],
    });
    expect(payload).not.toHaveProperty('requesterId');
  });

  it('calls the purchase request endpoints', async () => {
    apiPostMock.mockResolvedValue({ item: item() });
    apiGetMock.mockResolvedValue({ item: item() });
    apiPutMock.mockResolvedValue({ item: item() });
    apiDeleteMock.mockResolvedValue({});
    const payload = buildPurchaseRequestPayload({ requestDt: '2026-11-12', remark: '', details: [row()] });

    await expect(createPurchaseRequest(payload)).resolves.toMatchObject({ requestNo: 'MR-20261112-0001' });
    await getPurchaseRequest(300);
    await updatePurchaseRequest(300, payload);
    await deletePurchaseRequest(300);

    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/materials/purchase-requests', payload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/materials/purchase-requests/300');
    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/materials/purchase-requests/300', payload);
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/materials/purchase-requests/300');
  });

  it('maps loaded details to grid rows and status codes to Korean labels', () => {
    expect(toPurchaseRequestRows(item())[0]).toMatchObject({
      rowId: 'purchase-request-line-400',
      purchaseRequestDetailId: 400,
      materialCode: 'M-101',
      requestQty: 10,
      useType: 'PRODUCTION',
      requestRemark: '',
    });
    expect(purchaseRequestStatusLabel('REQUESTED')).toBe('요청');
    expect(purchaseRequestStatusLabel('CONFIRMED')).toBe('확정');
  });

  it('offers only raw, sub and supply materials for purchase requests', async () => {
    apiGetMock.mockResolvedValue({
      resultList: [
        { materialId: 1, materialCode: 'P-1', materialName: '제품', materialTypeCode: 'PRODUCT', expiryedStatus: 'NONE' },
        { materialId: 2, materialCode: 'R-1', materialName: '원재료 품목', materialTypeCode: 'RAW', expiryedStatus: 'NONE', unit: 'KG' },
        { materialId: 3, materialCode: 'G-1', materialName: '상품', materialTypeCode: 'GOODS', expiryedStatus: 'NONE' },
        { materialId: 4, materialCode: 'S-1', materialName: '부재료 품목', materialTypeCode: 'SUB', expiryedStatus: 'NONE' },
        { materialId: 5, materialCode: 'C-1', materialName: '소모품 품목', materialTypeCode: 'SUPPLY', expiryedStatus: 'NONE' },
        { materialId: 6, materialCode: 'H-1', materialName: '반제품', materialTypeCode: 'SEMI', expiryedStatus: 'NONE' },
      ],
    });
    const options = await searchPurchaseMaterials('품목');
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/co/master/materials?keyword=%ED%92%88%EB%AA%A9');
    expect(options.map((option) => option.code)).toEqual(['R-1', 'S-1', 'C-1']);
    expect(options.map((option) => option.details?.[0])).toEqual([
      { label: '품목계정', value: '원재료' },
      { label: '품목계정', value: '부재료' },
      { label: '품목계정', value: '소모품' },
    ]);
  });
});
