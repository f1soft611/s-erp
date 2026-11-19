import { describe, expect, it } from 'vitest';
import {
  convertUnitPriceForCurrency,
  createPurchaseRequestConfirmColumns,
  type PurchaseRequestConfirmRow,
} from '../src/pages/materials/request/confirm/data/purchaseRequestConfirmColumns';
import {
  buildConfirmPayload,
  toConfirmRows,
  validateConfirmInput,
} from '../src/pages/materials/request/confirm/services/purchaseRequestConfirm.service';
import { distinctCandidateTaxSettings } from '../src/pages/materials/order/create/services/purchaseOrder.service';
import type { PurchaseOrderCandidate } from '../src/pages/materials/order/create/types/purchaseOrder.types';
import type { PurchaseRequestConfirmDetail } from '../src/pages/materials/request/confirm/types/purchaseRequestConfirm.types';

function row(overrides: Partial<PurchaseRequestConfirmRow> = {}): PurchaseRequestConfirmRow {
  return {
    rowId: '51', purchaseRequestId: 5, requestNo: 'MR-1', requestDt: '2026-11-18', requesterName: '요청자',
    purchaseRequestDetailId: 51, lineNo: 1, materialId: 1, materialCode: 'A', materialName: '품목A',
    materialSpec: '', unit: 'EA', requestQty: 10, requestDeliveryDt: '2026-11-25', useTypeName: '일반',
    confirmQty: 10, confirmDeliveryDt: '2026-11-25', warehouseId: '1', orderType: 'GEN', supplierId: 4,
    supplierCode: 'S', supplierName: '구매처', unitPrice: 1000, currencyCode: 'KRW', taxType: 'TAXABLE',
    vatIncludedAt: 'N', wonUnitPrice: 1000, foreignUnitPrice: 0.9, foreignCurrency: 'USD', amount: 10000,
    confirmRemark: '', orderClosed: false, ...overrides,
  };
}

describe('확정 행: 통화를 바꿀 때 단가', () => {
  it('외화통화로 바꾸면 외화단가, KRW로 되돌리면 원화단가를 채운다', () => {
    expect(convertUnitPriceForCurrency(row(), 'USD')).toBe(0.9);
    expect(convertUnitPriceForCurrency({ ...row(), currencyCode: 'USD', unitPrice: 0.9 }, 'KRW')).toBe(1000);
  });

  it('그 밖의 통화이면 단가를 비운다(외화단가만 있는 단가는 KRW로 바꿔도 비움)', () => {
    expect(convertUnitPriceForCurrency(row(), 'EUR')).toBeNull();
    const foreignOnly = row({ unitPrice: 7.25, currencyCode: 'USD', wonUnitPrice: null, foreignUnitPrice: 7.25 });
    expect(convertUnitPriceForCurrency(foreignOnly, 'KRW')).toBeNull();
    expect(convertUnitPriceForCurrency(foreignOnly, 'USD')).toBe(7.25);
  });

  it('단가를 조회한 적이 없으면(직접 입력) 기존 단가를 그대로 둔다', () => {
    const manual = row({ wonUnitPrice: null, foreignUnitPrice: null, foreignCurrency: '', unitPrice: 555 });
    expect(convertUnitPriceForCurrency(manual, 'USD')).toBe(555);
  });

  it('통화 컬럼의 값 변경이 단가·금액을 함께 바꾼다', () => {
    const columns = createPurchaseRequestConfirmColumns({
      confirmEditable: true, closeEditable: false, warehouseOptions: [], orderTypeOptions: [],
      onOpenSupplierPicker: () => undefined,
    });
    const currency = columns.find((column) => column.field === 'currencyCode');
    const patch = currency?.onValueChange?.(row(), 'USD') as Partial<PurchaseRequestConfirmRow>;
    expect(patch).toMatchObject({ currencyCode: 'USD', unitPrice: 0.9, amount: 9 });
  });

  it('부가세구분이 과세가 아니면 부가세포함을 미포함으로 되돌린다', () => {
    const columns = createPurchaseRequestConfirmColumns({
      confirmEditable: true, closeEditable: false, warehouseOptions: [], orderTypeOptions: [],
      onOpenSupplierPicker: () => undefined,
    });
    const tax = columns.find((column) => column.field === 'taxType');
    expect(tax?.onValueChange?.(row({ vatIncludedAt: 'Y' }), 'EXEMPT')).toEqual({ taxType: 'EXEMPT', vatIncludedAt: 'N' });
    expect(tax?.onValueChange?.(row(), 'TAXABLE')).toEqual({ taxType: 'TAXABLE' });
  });
});

describe('확정 저장·조회: 부가세구분·포함', () => {
  it('payload에 부가세구분·포함이 들어가고 비어 있으면 과세·미포함이다', () => {
    const payload = buildConfirmPayload('2026-11-18', '', [
      row({ taxType: 'TAXABLE', vatIncludedAt: 'Y' }),
      row({ rowId: '61', purchaseRequestDetailId: 61, taxType: '', vatIncludedAt: 'N' }),
    ]);
    expect(payload.details[0]).toMatchObject({ taxType: 'TAXABLE', vatIncludedAt: 'Y' });
    expect(payload.details[1]).toMatchObject({ taxType: 'TAXABLE', vatIncludedAt: 'N' });
  });

  it('과세 외 부가세구분에 부가세포함이면 검증 메시지를 낸다', () => {
    const messages = validateConfirmInput('2026-11-18', [row({ taxType: 'EXEMPT', vatIncludedAt: 'Y' })]);
    expect(messages).toContain('부가세 포함은 과세일 때만 선택할 수 있습니다.');
    expect(validateConfirmInput('2026-11-18', [row()])).toEqual([]);
  });

  it('저장된 확정 행은 값이 없으면(기존 데이터) 과세·미포함으로 읽는다', () => {
    const detail = {
      purchaseRequestId: 5, requestNo: 'MR-1', requestDt: '2026-11-18', requesterName: null, requestDeptName: null,
      purchaseRequestDetailId: 51, lineNo: 1, materialId: 1, materialCode: 'A', materialName: 'A', materialSpec: null,
      unit: null, requestQty: 1, requestDeliveryDt: '2026-11-25', useType: 'X', useTypeName: null, requestRemark: null,
      confirmQty: 1, confirmDeliveryDt: '2026-11-25', warehouseId: 1, warehouseName: null, orderType: 'G',
      orderTypeName: null, supplierId: 4, supplierCode: 'S', supplierName: 'S', unitPrice: 1, currencyCode: 'KRW',
      amount: 1, confirmRemark: null, orderCloseAt: 'N',
    } as PurchaseRequestConfirmDetail;
    expect(toConfirmRows([detail], false)[0]).toMatchObject({ taxType: 'TAXABLE', vatIncludedAt: 'N' });
    expect(toConfirmRows([{ ...detail, taxType: 'ZERO_RATED', vatIncludedAt: 'N' }], false)[0])
      .toMatchObject({ taxType: 'ZERO_RATED', vatIncludedAt: 'N' });
  });
});

describe('발주: 확정 후보의 부가세 설정', () => {
  const candidate = (overrides: Partial<PurchaseOrderCandidate> = {}) => ({
    purchaseRequestDetailId: 1, taxType: 'TAXABLE', vatIncludedAt: 'N', currencyCode: 'KRW', ...overrides,
  }) as PurchaseOrderCandidate;

  it('같은 설정이면 하나, 다르면 여러 개를 돌려준다(없으면 과세·미포함, 과세 외는 포함 불가)', () => {
    expect(distinctCandidateTaxSettings([candidate(), candidate({ taxType: undefined, vatIncludedAt: undefined })]))
      .toEqual([{ taxType: 'TAXABLE', vatIncluded: false }]);
    expect(distinctCandidateTaxSettings([candidate({ vatIncludedAt: 'Y' }), candidate()])).toHaveLength(2);
    expect(distinctCandidateTaxSettings([candidate({ taxType: 'EXEMPT', vatIncludedAt: 'Y' })]))
      .toEqual([{ taxType: 'EXEMPT', vatIncluded: false }]);
  });
});
