import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../src/shared/services/apiClient';
import {
  isQuotationStatusSearchSession,
  searchQuotationStatus,
  toQuotationStatusFilters,
  validateQuotationStatusRange,
} from '../src/pages/sales/quotation/status/services/quotationStatus.service';
import type { QuotationStatusRow } from '../src/pages/sales/quotation/status/types/quotationStatus.types';

vi.mock('../src/shared/services/apiClient', () => {
  const apiGet = vi.fn();
  return { apiGet, apiGetWithExactDecimals: (path: string) => apiGet(path) };
});
const apiGetMock = vi.mocked(apiGet);

describe('quotation status service', () => {
  beforeEach(() => apiGetMock.mockReset());

  it('maps required quote date range and optional quote, customer, item, and submit filters', () => {
    expect(toQuotationStatusFilters({
      quotationDt: { from: '2026-10-16', to: '2026-11-16' },
      quotationNo: ' QT-1 ',
      customerName: ' 고객 ',
      materialName: ' 볼트 ',
      submitDt: { from: '', to: '2026-11-30' },
    })).toEqual({
      quotationDtFrom: '2026-10-16',
      quotationDtTo: '2026-11-16',
      quotationNo: 'QT-1',
      customerKeyword: '고객',
      materialKeyword: '볼트',
      submitDtTo: '2026-11-30',
    });
  });

  it('requires both valid quotation date boundaries in ascending order', () => {
    expect(validateQuotationStatusRange({})).toBe('견적작성일 시작일과 종료일을 입력해 주세요.');
    expect(validateQuotationStatusRange({
      quotationDt: { from: '2026-11-16', to: '2026-10-16' },
    })).toBe('견적작성일 시작일은 종료일보다 늦을 수 없습니다.');
    expect(validateQuotationStatusRange({
      quotationDt: { from: '2026-10-16', to: '2026-11-16' },
    })).toBe('');
  });

  it('includes a trimmed integrated keyword without changing detailed filters', () => {
    expect(toQuotationStatusFilters({
      quotationDt: { from: '2026-11-01', to: '2026-11-17' }, quotationNo: 'QT',
    }, ' bolt ')).toEqual({
      quotationDtFrom: '2026-11-01', quotationDtTo: '2026-11-17',
      quotationNo: 'QT', keyword: 'bolt',
    });
    expect(isQuotationStatusSearchSession({
      keyword: 123, detailValues: { quotationDt: { from: '2026-11-01', to: '2026-11-17' } },
    })).toBe(false);
  });

  it('rejects restored search sessions with a missing or invalid required date range', () => {
    expect(isQuotationStatusSearchSession({
      detailValues: { quotationDt: { from: '', to: '' } },
    })).toBe(false);
    expect(isQuotationStatusSearchSession({
      detailValues: { quotationDt: { from: '2026-10-16', to: '2026-11-16' } },
    })).toBe(true);
  });

  it('queries the status endpoint with API filters and returns detail rows', async () => {
    const row = { quotationId: 21, quotationDetailId: 31, quotationNo: 'QT-1' } as QuotationStatusRow;
    apiGetMock.mockResolvedValue({ resultList: [row], resultCnt: 1 });

    await expect(searchQuotationStatus({
      quotationDtFrom: '2026-10-16',
      quotationDtTo: '2026-11-16',
      quotationNo: 'QT 1',
    })).resolves.toEqual([row]);
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v1/sales/quotation-status?quotationDtFrom=2026-10-16&quotationDtTo=2026-11-16&quotationNo=QT+1',
    );
  });
});
