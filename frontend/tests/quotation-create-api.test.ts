import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPost, apiPut } from '../src/shared/services/apiClient';
import {
  buildQuotationPayload,
  createQuotation,
  deleteQuotation,
  getQuotation,
  toQuotationForm,
  updateQuotation,
  validateQuotationInput,
} from '../src/pages/sales/quotation/create/services/quotation.service';
import type {
  QuotationCreatePayload,
  QuotationItem,
} from '../src/pages/sales/quotation/create/types/quotation.types';
import type { QuotationDetailRow } from '../src/pages/sales/quotation/create/data/quotationDetail';
import { createQuotationDetailColumns } from '../src/pages/sales/quotation/create/data/quotationDetail';
import {
  searchQuotationCustomers,
  searchQuotationMaterials,
} from '../src/pages/sales/quotation/create/services/quotationMaster.service';
import { fetchCustomers } from '../src/pages/co/master/customers/services/customerManagement.service';
import { fetchMaterials } from '../src/pages/co/master/materials/services/materialManagement.service';
import type { CustomerRow } from '../src/pages/co/master/customers/types/customerManagement.types';
import type { MaterialRow } from '../src/pages/co/master/materials/types/materialManagement.types';

vi.mock('../src/shared/services/apiClient', () => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));
vi.mock('../src/pages/co/master/customers/services/customerManagement.service', () => ({
  fetchCustomers: vi.fn(),
}));
vi.mock('../src/pages/co/master/materials/services/materialManagement.service', () => ({
  fetchMaterials: vi.fn(),
}));

const apiDeleteMock = vi.mocked(apiDelete);
const apiGetMock = vi.mocked(apiGet);
const apiPostMock = vi.mocked(apiPost);
const apiPutMock = vi.mocked(apiPut);
const fetchCustomersMock = vi.mocked(fetchCustomers);
const fetchMaterialsMock = vi.mocked(fetchMaterials);

describe('quotation create API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a manually entered line without a material ID but validates name, quantity, and price', () => {
    const errors = validateQuotationInput({
      quotationDt: '2026-11-16',
      customerId: 10,
      details: [
        detailRow({
          materialId: null,
          materialCode: '',
          materialName: '직접 입력 품목',
          materialSpec: '',
          unit: '',
          quotationQty: 2,
          unitPrice: 0,
        }),
      ],
    });
    expect(errors).toEqual({ detailRows: {}, detailMessages: [] });

    const invalid = validateQuotationInput({
      quotationDt: '2026-11-16',
      customerId: 10,
      details: [
        detailRow({
          materialId: null,
          materialCode: '',
          materialName: '',
          materialSpec: '',
          unit: '',
          quotationQty: 0,
          unitPrice: -1,
        }),
      ],
    });
    expect(invalid.detailRows['line-1']).toContain('품목명을 입력');
    expect(invalid.detailRows['line-1']).toContain('수량');
    expect(invalid.detailRows['line-1']).toContain('단가');
  });

  it('maps manual and master-selected details to snapshots without client totals', () => {
    const payload = buildQuotationPayload({
      quotationDt: '2026-11-16',
      submitDt: '',
      customerId: 10,
      customerReference: ' 담당자 ',
      incoterms: '',
      paymentTerm: '월말',
      validTerm: '',
      currencyCode: 'KRW',
      remark: '',
      details: [
        detailRow({ materialId: null, materialCode: '', materialName: '직접 품목' }),
        detailRow({
          rowId: 'line-2',
          materialId: 20,
          materialCode: 'M-20',
          materialName: '마스터 품목',
          materialSpec: '규격',
          unit: 'EA',
        }),
      ],
    });

    expect(payload.details).toEqual([
      expect.objectContaining({
        materialId: null,
        materialCode: null,
        materialSpec: null,
        unit: null,
        materialName: '직접 품목',
      }),
      expect.objectContaining({
        materialId: 20,
        materialCode: 'M-20',
        materialName: '마스터 품목',
      }),
    ]);
    expect(payload.details[0]).not.toHaveProperty('lineAmt');
    expect(payload).not.toHaveProperty('supplyAmt');
    expect(payload).not.toHaveProperty('vatAmt');
    expect(payload).not.toHaveProperty('totalAmt');
    expect(payload).not.toHaveProperty('tenantId');
    expect(payload.customerReference).toBe('담당자');
    expect(payload.submitDt).toBeNull();
  });

  it('requires master selection for item codes and allows only manual item-name entry', () => {
    const openMaterialPicker = vi.fn();
    const columns = createQuotationDetailColumns(openMaterialPicker);
    const code = columns.find((column) => column.field === 'materialCode')!;
    const name = columns.find((column) => column.field === 'materialName')!;
    const spec = columns.find((column) => column.field === 'materialSpec')!;
    const unit = columns.find((column) => column.field === 'unit')!;
    const row = detailRow();

    expect(code.type).toBe('code');
    expect(code.editable).toBe(true);
    const applyPatch = vi.fn();
    code.onOpenCodePicker?.(row, applyPatch);
    expect(openMaterialPicker).toHaveBeenCalledWith(applyPatch);
    expect(spec.editable).toBe(false);
    expect(unit.editable).toBe(false);
    expect(name.editable).toBe(true);
    expect(name.onValueChange?.(row, '직접 입력 품목')).toEqual({
      materialId: null,
      materialCode: '',
      materialName: '직접 입력 품목',
      materialSpec: '',
      unit: '',
    });

    expect(code.onValueChange?.(row, {
      id: 45,
      code: 'M-45',
      name: '마스터 품목',
      details: [
        { label: '품목규격', value: 'R-1' },
        { label: '단위', value: 'EA' },
      ],
    })).toEqual({
      materialId: 45,
      materialCode: 'M-45',
      materialName: '마스터 품목',
      materialSpec: 'R-1',
      unit: 'EA',
    });
  });

  it('searches existing active masters and returns picker snapshot details without writing masters', async () => {
    fetchCustomersMock.mockResolvedValue([{
      customerId: 10,
      customerCode: 'C-10',
      customerName: '고객 10',
      businessNo: '123',
      presidentName: '대표',
    } as CustomerRow]);
    fetchMaterialsMock.mockResolvedValue([{
      materialId: 20,
      materialCode: 'M-20',
      materialName: '품목 20',
      materialSpec: '규격',
      unit: 'EA',
    } as MaterialRow]);

    await expect(searchQuotationCustomers(' 고객 ')).resolves.toEqual([
      { id: 10, code: 'C-10', name: '고객 10', details: [
        { label: '사업자번호', value: '123' }, { label: '대표자명', value: '대표' },
      ] },
    ]);
    await expect(searchQuotationMaterials(' 품목 ')).resolves.toEqual([
      { id: 20, code: 'M-20', name: '품목 20', details: [
        { label: '품목규격', value: '규격' }, { label: '단위', value: 'EA' },
      ] },
    ]);
    expect(fetchCustomersMock).toHaveBeenCalledWith({ keyword: ' 고객 ', useAt: 'Y' });
    expect(fetchMaterialsMock).toHaveBeenCalledWith({ keyword: ' 품목 ' });
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it('creates, reads, updates, and deletes quotations through the documented endpoints', async () => {
    const item = quotationItem();
    const payload: QuotationCreatePayload = {
      quotationDt: '2026-11-16',
      submitDt: null,
      customerId: 10,
      customerReference: null,
      incoterms: null,
      paymentTerm: null,
      validTerm: null,
      currencyCode: null,
      remark: null,
      details: [],
    };
    apiPostMock.mockResolvedValue({ item });
    apiGetMock.mockResolvedValue({ item });
    apiPutMock.mockResolvedValue({ item });
    apiDeleteMock.mockResolvedValue({});

    await expect(createQuotation(payload)).resolves.toEqual(item);
    expect(apiPostMock).toHaveBeenCalledWith('/api/v1/sales/quotations', payload);
    await expect(getQuotation(21)).resolves.toEqual(item);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v1/sales/quotations/21');
    await expect(updateQuotation(21, payload)).resolves.toEqual(item);
    expect(apiPutMock).toHaveBeenCalledWith('/api/v1/sales/quotations/21', payload);
    await deleteQuotation(21);
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/v1/sales/quotations/21');
  });

  it('maps a saved quotation into the reusable registration form', () => {
    const form = toQuotationForm(quotationItem());
    expect(form.customer).toEqual({ id: 10, code: 'C-10', name: '고객 10' });
    expect(form.rows[0]).toEqual(expect.objectContaining({
      materialId: null,
      materialCode: 'CUSTOM',
      materialName: '직접 품목',
      quotationQty: 2,
      unitPrice: 5,
      lineAmt: 10,
    }));
  });
});

function detailRow(overrides: Partial<QuotationDetailRow> = {}): QuotationDetailRow {
  return {
    rowId: 'line-1',
    materialId: 20,
    materialCode: 'M-20',
    materialName: '품목',
    materialSpec: '',
    unit: '',
    quotationQty: 2,
    unitPrice: 3,
    lineAmt: 6,
    remark: '',
    ...overrides,
  };
}

function quotationItem(): QuotationItem {
  return {
    quotationId: 21,
    quotationNo: 'QT-20261116-0001',
    quotationDt: '2026-11-16',
    submitDt: null,
    customerId: 10,
    customerCode: 'C-10',
    customerName: '고객 10',
    customerReference: null,
    incoterms: null,
    paymentTerm: null,
    validTerm: null,
    currencyCode: null,
    remark: null,
    supplyAmt: 10,
    vatAmt: 1,
    totalAmt: 11,
    createdBy: 'writer',
    createdByName: '작성자',
    createdAt: '2026-11-16 10:00',
    writer: true,
    details: [{
      quotationDetailId: 31,
      lineNo: 1,
      materialId: null,
      materialCode: 'CUSTOM',
      materialName: '직접 품목',
      materialSpec: null,
      unit: null,
      quotationQty: 2,
      unitPrice: 5,
      lineAmt: 10,
      remark: null,
    }],
  };
}
