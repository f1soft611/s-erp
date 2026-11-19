import type { PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';

export type QualityInspectionStatusRow = {
  qualityInspectionId: number;
  qualityInspectionDetailId: number;
  inspectionNo: string;
  inspectionDt: string;
  inspectorName: string | null;
  status: 'ACTIVE' | 'CANCELED';
  headerRemark: string | null;
  lineNo: number;
  arrivalNo: string | null;
  /** 연결된 가입고 헤더 ID. 가입고 행이 삭제돼 연결이 끊기면 null이다. */
  purchaseArrivalId: number | null;
  /** 연결된 가입고가 정상이면 true. 링크 활성화 기준이다. */
  arrivalLinked: boolean | null;
  supplierName: string | null;
  orderNo: string | null;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  arrivalQty: number | null;
  inspectQty: number;
  passQty: number;
  failQty: number;
  /** 합격량/검사량(%), 소수 첫째 자리. */
  passRate: number | null;
  remark: string | null;
  createdByName: string | null;
};

export type QualityInspectionStatusFilters = {
  keyword?: string;
  inspectionNo?: string;
  inspectionDtFrom?: string;
  inspectionDtTo?: string;
  supplierKeyword?: string;
  /** ACTIVE 정상(기본), CANCELED 취소, ALL 전체(취소 포함) */
  status?: string;
  materialKeyword?: string;
  orderNo?: string;
  arrivalNo?: string;
  inspectorKeyword?: string;
};

export type QualityInspectionStatusSearchValues = Record<string, PageSearchFieldValue>;

export type QualityInspectionStatusSearchSession = {
  keyword: string;
  detailValues: QualityInspectionStatusSearchValues;
};

export type QualityInspectionStatusListResponse = {
  resultList?: QualityInspectionStatusRow[];
  resultCnt?: number;
};
