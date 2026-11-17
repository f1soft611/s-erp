import type { F1GridColumn } from '../../../../../shared/components/f1-grid';

/**
 * 검사 그리드 행. maxQty는 이 행에 입력할 수 있는 최대 검사량(검사 대기량)이고
 * otherInspectedQty는 이 검사를 제외한 유효 검사의 (합격+불합격) 합이다. 검사량은 합격량 + 불합격량이다.
 */
export type MaterialInspectionRow = {
  rowId: string;
  materialInspectionDetailId: number | null;
  materialArrivalDetailId: number;
  arrivalNo: string;
  supplierName: string;
  orderNo: string;
  materialCode: string;
  materialName: string;
  materialSpec: string;
  unit: string;
  arrivalQty: number;
  otherInspectedQty: number;
  maxQty: number;
  passQty: number | null;
  failQty: number | null;
  inspectQty: number;
  /** 이 행의 합격분이 입고된 유효 입고수량 합(0이면 제한 없음). */
  receivedQty: number;
  /** 가장 최근 유효 입고번호. 없으면 빈 문자열. */
  receiptNo: string;
  remark: string;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** 합격량·불합격량으로 검사량을 다시 계산한다(소수 둘째 자리 오차 방지). */
export function calculateInspectQty(passQty: number | null, failQty: number | null): number {
  return Math.round(((Number(passQty) || 0) + (Number(failQty) || 0)) * 100) / 100;
}

type ColumnOptions = { editable: boolean };

export function createMaterialInspectionColumns({ editable }: ColumnOptions): F1GridColumn<MaterialInspectionRow>[] {
  const readOnly = { editable: false } as const;
  const patch = (row: MaterialInspectionRow, changes: Partial<MaterialInspectionRow>): Partial<MaterialInspectionRow> => {
    const merged = { ...row, ...changes };
    return { ...changes, inspectQty: calculateInspectQty(merged.passQty, merged.failQty) };
  };
  return [
    { field: 'arrivalNo', headerName: '가입고번호', type: 'text', width: 150, align: 'center', pinned: 'left', ...readOnly },
    { field: 'supplierName', headerName: '구매처', type: 'text', width: 140, ...readOnly },
    { field: 'orderNo', headerName: '발주번호', type: 'text', width: 150, align: 'center', ...readOnly },
    { field: 'materialCode', headerName: '품목코드', type: 'text', width: 110, ...readOnly },
    { field: 'materialName', headerName: '품목명', type: 'text', width: 170, ...readOnly },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, ...readOnly },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', ...readOnly },
    { field: 'arrivalQty', headerName: '가입고량', type: 'decimal', decimalPlaces: 2, width: 96, align: 'right', ...readOnly },
    { field: 'otherInspectedQty', headerName: '기검사량', type: 'decimal', decimalPlaces: 2, width: 96, align: 'right', ...readOnly },
    { field: 'maxQty', headerName: '검사 대기량', type: 'decimal', decimalPlaces: 2, width: 104, align: 'right', ...readOnly },
    {
      field: 'passQty',
      headerName: '합격량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 100,
      align: 'right',
      editable,
      required: true,
      min: 0,
      validate: (value, row) => {
        if (value === null || value === undefined || String(value) === '') return '합격량을 입력해 주세요.';
        if (Number(value) < 0) return '합격량은 0 이상이어야 합니다.';
        if (row.receivedQty > 0 && Number(value) < row.receivedQty) {
          return `입고된 수량 ${row.receivedQty}보다 합격량을 줄일 수 없습니다.`;
        }
        const total = calculateInspectQty(Number(value), row.failQty);
        if (total <= 0) return '합격량과 불합격량의 합은 0보다 커야 합니다.';
        return total <= row.maxQty ? true : `검사량이 검사 대기량 ${row.maxQty}을(를) 초과했습니다.`;
      },
      onValueChange: (row, value) => patch(row, { passQty: toNullableNumber(value) }),
    },
    {
      field: 'failQty',
      headerName: '불합격량',
      type: 'decimal',
      decimalPlaces: 2,
      width: 100,
      align: 'right',
      editable,
      required: true,
      min: 0,
      validate: (value, row) => {
        if (value === null || value === undefined || String(value) === '') return '불합격량을 입력해 주세요.';
        if (Number(value) < 0) return '불합격량은 0 이상이어야 합니다.';
        const total = calculateInspectQty(row.passQty, Number(value));
        return total <= row.maxQty ? true : `검사량이 검사 대기량 ${row.maxQty}을(를) 초과했습니다.`;
      },
      onValueChange: (row, value) => patch(row, { failQty: toNullableNumber(value) }),
    },
    { field: 'inspectQty', headerName: '검사량', type: 'decimal', decimalPlaces: 2, width: 96, align: 'right', ...readOnly },
    { field: 'receivedQty', headerName: '입고량', type: 'decimal', decimalPlaces: 2, width: 90, align: 'right', ...readOnly },
    {
      field: 'remark',
      headerName: '비고',
      type: 'text',
      width: 200,
      editable,
      validate: (value) => (String(value ?? '').trim().length <= 500 ? true : '비고는 500자 이내로 입력해 주세요.'),
    },
  ];
}
