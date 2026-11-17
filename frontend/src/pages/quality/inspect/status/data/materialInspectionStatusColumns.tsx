import { Link } from '@mui/material';
import type { F1GridColumn } from '../../../../../shared/components/f1-grid/types/grid.types';
import { MATERIAL_INSPECTION_STATUS_OPTIONS } from '../services/materialInspectionStatus.service';
import type { MaterialInspectionStatusRow } from '../types/materialInspectionStatus.types';
import { F1GridHighlightText } from '../../../../../shared/components/f1-grid';

export type MaterialInspectionStatusColumnOptions = {
  onOpenInspection?: (row: MaterialInspectionStatusRow) => void;
  /** 연결된 가입고가 정상일 때만 가입고번호를 링크로 연다. */
  onOpenArrival?: (row: MaterialInspectionStatusRow) => void;
};

const qtyColumn = (
  field: keyof MaterialInspectionStatusRow,
  headerName: string,
  width = 100,
): F1GridColumn<MaterialInspectionStatusRow> => ({
  field,
  headerName,
  type: 'decimal',
  decimalPlaces: 2,
  width,
  align: 'right',
  editable: false,
  search: { hidden: true },
});

const linkSx = {
  position: 'relative',
  zIndex: 1,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 600,
  fontSize: 'inherit',
  verticalAlign: 'baseline',
} as const;

export function createMaterialInspectionStatusColumns({
  onOpenInspection,
  onOpenArrival,
}: MaterialInspectionStatusColumnOptions = {}): F1GridColumn<MaterialInspectionStatusRow>[] {
  return [
    {
      field: 'materialInspectionDetailId',
      headerName: 'No',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      search: { hidden: true },
      form: { hidden: true },
    },
    {
      type: 'text',
      field: 'inspectionNo',
      highlightSearch: true,
      headerName: '검사번호',
      width: 160,
      editable: false,
      mergeRows: true,
      align: 'center',
      search: { label: '검사번호', order: 2, span: 1, group: '텍스트' },
      renderCell: onOpenInspection
        ? ({ row, highlightKeyword }) => (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.inspectionNo} 상세 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenInspection(row);
              }}
              // 병합 영역에서는 후속 행 셀이 위에 겹치므로 링크만 위로 올려 클릭을 받는다.
              sx={linkSx}
            >
              {highlightKeyword ? <F1GridHighlightText text={row.inspectionNo} keyword={highlightKeyword} /> : row.inspectionNo}
            </Link>
          )
        : undefined,
    },
    {
      field: 'inspectionDt',
      headerName: '검사일',
      type: 'date',
      width: 100,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: {
        required: true,
        label: '검사일',
        order: 1,
        span: 2,
        group: '검사일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        },
      },
    },
    {
      field: 'inspectorName',
      highlightSearch: true,
      headerName: '검사자',
      type: 'text',
      width: 90,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '검사자', order: 3, span: 1, group: '텍스트' },
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'select',
      options: MATERIAL_INSPECTION_STATUS_OPTIONS,
      width: 70,
      align: 'center',
      editable: false,
      mergeRows: true,
      search: { label: '상태', order: 8, span: 1, group: '선택', required: true, allowEmpty: false },
    },
    { field: 'lineNo', headerName: '행', type: 'number', width: 50, align: 'center', editable: false, search: { hidden: true } },
    {
      field: 'arrivalNo',
      highlightSearch: true,
      headerName: '가입고번호',
      type: 'text',
      width: 150,
      align: 'center',
      editable: false,
      search: { label: '가입고번호', order: 4, span: 1, group: '텍스트' },
      renderCell: onOpenArrival
        ? ({ row, highlightKeyword }) => (row.arrivalLinked && row.materialArrivalId != null && row.arrivalNo ? (
            <Link
              component="button"
              type="button"
              underline="hover"
              aria-label={`${row.arrivalNo} 가입고 보기`}
              onClick={(event) => {
                event.stopPropagation();
                onOpenArrival(row);
              }}
              sx={linkSx}
            >
              {highlightKeyword ? <F1GridHighlightText text={row.arrivalNo} keyword={highlightKeyword} /> : row.arrivalNo}
            </Link>
          ) : (
            <span>{highlightKeyword ? <F1GridHighlightText text={row.arrivalNo ?? ''} keyword={highlightKeyword} /> : (row.arrivalNo ?? '')}</span>
          ))
        : undefined,
    },
    {
      field: 'supplierName',
      highlightSearch: true,
      headerName: '구매처',
      type: 'text',
      width: 150,
      editable: false,
      search: { label: '구매처', order: 5, span: 1, group: '텍스트' },
    },
    {
      field: 'orderNo',
      headerName: '발주번호',
      type: 'text',
      width: 150,
      align: 'center',
      editable: false,
      search: { label: '발주번호', order: 6, span: 1, group: '텍스트' },
    },
    {
      field: 'materialCode',
      highlightSearch: true,
      headerName: '품목코드',
      type: 'text',
      width: 110,
      align: 'center',
      editable: false,
      search: { label: '품목', order: 7, span: 1, group: '텍스트' },
    },
    { field: 'materialName', highlightSearch: true, headerName: '품목명', type: 'text', width: 180, editable: false, search: { hidden: true } },
    { field: 'materialSpec', headerName: '규격', type: 'text', width: 110, editable: false, search: { hidden: true } },
    { field: 'unit', headerName: '단위', type: 'text', width: 60, align: 'center', editable: false, search: { hidden: true } },
    qtyColumn('arrivalQty', '가입고량', 96),
    qtyColumn('inspectQty', '검사량', 96),
    qtyColumn('passQty', '합격량', 96),
    qtyColumn('failQty', '불합격량', 96),
    {
      field: 'passRate',
      headerName: '합격률(%)',
      type: 'decimal',
      decimalPlaces: 1,
      width: 90,
      align: 'right',
      editable: false,
      search: { hidden: true },
    },
    { field: 'remark', headerName: '비고', type: 'text', width: 180, editable: false, search: { hidden: true } },
    { field: 'createdByName', headerName: '등록자', type: 'text', width: 90, align: 'center', editable: false, search: { hidden: true } },
  ];
}
