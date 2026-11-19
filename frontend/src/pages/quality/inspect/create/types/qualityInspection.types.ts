/** 검사 대기 가입고 행(불러오기 창). waitQty는 가입고량에서 유효 검사의 (합격+불합격)을 뺀 값이다. */
export type QualityInspectionCandidate = {
  purchaseArrivalDetailId: number;
  purchaseArrivalId: number;
  arrivalNo: string;
  arrivalDt: string;
  supplierName: string | null;
  purchaseOrderDetailId: number;
  orderNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  arrivalQty: number;
  inspectedQty: number;
  passQty: number;
  failQty: number;
  waitQty: number;
};

export type QualityInspectionCandidateResult = {
  rows: QualityInspectionCandidate[];
  /** 조회 조건과 무관한 전체 검사 대기 건수. */
  total: number;
};

export type QualityInspectionPayload = {
  inspectionDt: string;
  /** 등록은 생략하면 로그인 사용자가 검사자다. 수정은 기존 검사자를 그대로 보낸다. */
  inspectorId?: number | null;
  remark: string | null;
  details: {
    /** 수정 요청에서 기존 검사 행을 가리킨다. 요청에 없는 기존 행은 삭제된다. */
    qualityInspectionDetailId?: number;
    /** 등록 요청에서 검사할 가입고 행을 가리킨다. */
    purchaseArrivalDetailId?: number;
    passQty: number;
    failQty: number;
    remark: string | null;
  }[];
};

/**
 * 저장된 검사 상세 행. maxQty는 이 행에 입력할 수 있는 최대 검사량(가입고량 − 이 검사를 제외한 유효 검사 합)이다.
 */
export type QualityInspectionDetailItem = {
  qualityInspectionDetailId: number;
  lineNo: number;
  purchaseArrivalDetailId: number | null;
  purchaseArrivalId: number | null;
  arrivalLinked: boolean | null;
  arrivalNo: string | null;
  supplierName: string | null;
  purchaseOrderDetailId: number;
  orderNo: string | null;
  materialId: number;
  materialCode: string | null;
  materialName: string | null;
  materialSpec: string | null;
  unit: string | null;
  arrivalQty: number | null;
  otherInspectedQty: number;
  maxQty: number | null;
  passQty: number;
  failQty: number;
  inspectQty: number;
  /** 이 검사 행의 합격분을 입고한 유효 입고수량 합. 0보다 크면 취소·행 빼기·합격량 축소가 제한된다. */
  receivedQty?: number | null;
  /** 가장 최근 유효 입고번호. 입고가 없으면 null이다. */
  receiptNo?: string | null;
  remark: string | null;
};

export type QualityInspectionItem = {
  qualityInspectionId: number;
  inspectionNo: string;
  inspectionDt: string;
  inspectorId?: number | null;
  inspectorName?: string | null;
  remark?: string | null;
  useAt?: 'Y' | 'N';
  status?: 'ACTIVE' | 'CANCELED';
  createdBy?: string | null;
  createdAt?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
  details?: QualityInspectionDetailItem[];
};
