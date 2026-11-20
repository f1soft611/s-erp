import type { F1GridColumn } from '../../../../shared/components/f1-grid';
import type {
  OrderCodeOptions,
  OrderEmployee,
  OrderHistoryRow,
  OrderProcessPayload,
  OrderTargetRow,
  OrderTypeDef,
} from '../types/order.types';

/** 오늘(브라우저 로컬 날짜) yyyy-MM-dd. 명령일 기본값과 상한이다. */
export function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** 오늘로부터 일수만큼 이전 날짜(yyyy-MM-dd). 처리 내역 기본 조회 기간에 쓴다. */
export function daysAgoString(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const STATUS_LABELS: Record<string, string> = { ACTIVE: '재직', LEAVE: '휴직', RETIRED: '퇴직' };

/** 사원의 현재 값 중 이 명령이 바꾸는 항목의 표시 이름(명령 전 값). 날짜 명령은 현재 재직 상태를 보여 준다. */
export function currentLabelOf(type: OrderTypeDef, employee: OrderEmployee): string {
  switch (type.fieldCode) {
    case 'DEPARTMENT': return employee.departmentNm;
    case 'POSITION': return employee.positionNm;
    case 'LEVEL': return employee.levelNm;
    case 'EMPLOYMENT_TYPE': return employee.employmentTypeNm;
    default: {
      const status = STATUS_LABELS[employee.employmentStatus] ?? '';
      return employee.employmentStatus === 'LEAVE' && employee.suspendDt ? `${status} (${employee.suspendDt}~)` : status;
    }
  }
}

export type OrderPost = { value: string; label: string };

export function createTargetRow(type: OrderTypeDef, employee: OrderEmployee, post: OrderPost): OrderTargetRow {
  return {
    userId: employee.userId,
    departmentNm: employee.departmentNm,
    positionNm: employee.positionNm,
    employeeNo: employee.employeeNo,
    userNm: employee.userNm,
    currentLabel: currentLabelOf(type, employee),
    postValue: post.value,
    postLabel: post.label,
  };
}

type TargetColumnHandlers = {
  /** 부서 선택 버튼을 누르면 호출된다. 페이지가 부서 선택 도움창을 열고 결과를 applyPatch로 적용한다. */
  onOpenDepartmentPicker?: (applyPatch: (patch: Partial<OrderTargetRow>) => void) => void;
};

/**
 * 대상 사원 표의 열. 명령 후 값 열은 유형의 입력 방식에 따라 부서 선택(code)·공통코드(select)·날짜(date)가 된다.
 * 사원 정보와 명령 전 값은 읽기 전용이다.
 */
export function createTargetColumns(
  type: OrderTypeDef | undefined,
  options: OrderCodeOptions,
  canEdit: boolean,
  handlers: TargetColumnHandlers = {},
): F1GridColumn<OrderTargetRow>[] {
  const readOnly = (field: keyof OrderTargetRow, headerName: string, width: number, extra: Partial<F1GridColumn<OrderTargetRow>> = {}) => ({
    field, headerName, width, editable: false, search: { hidden: true }, ...extra,
  }) as F1GridColumn<OrderTargetRow>;
  const postHeader = `${type?.fieldName ?? '값'}(명령 후)`;

  let post: F1GridColumn<OrderTargetRow>;
  if (type?.inputKind === 'department') {
    post = {
      field: 'postValue', headerName: postHeader, width: 180, type: 'code', editable: canEdit, required: true,
      getValue: (row) => row.postLabel,
      onOpenCodePicker: (_row, applyPatch) => {
        handlers.onOpenDepartmentPicker?.(applyPatch);
        return undefined;
      },
      onValueChange: () => {
        throw new Error('부서 선택 버튼으로 부서를 선택해 주세요.');
      },
      search: { hidden: true },
    };
  } else if (type?.inputKind === 'code') {
    post = {
      field: 'postValue', headerName: postHeader, width: 160, type: 'select', editable: canEdit, required: true,
      options: (options[type.codeGroup] ?? []).map((option) => ({ value: option.value, label: option.label })),
      search: { hidden: true },
    };
  } else {
    post = {
      field: 'postValue', headerName: postHeader, width: 150, type: 'date', align: 'center', editable: canEdit, required: true,
      search: { hidden: true },
    };
  }

  return [
    readOnly('userId', 'No', 56, { type: 'rownumber', align: 'center' }),
    readOnly('departmentNm', '부서', 140),
    readOnly('positionNm', '직위', 90, { align: 'center' }),
    readOnly('employeeNo', '사번', 100, { align: 'center' }),
    readOnly('userNm', '이름', 120),
    readOnly('currentLabel', `${type?.fieldName ?? '값'}(명령 전)`, 180),
    post,
    readOnly('postLabel', '명령 후 이름', 120, { hidden: true }),
  ];
}

/** 처리 요청. 부서 이동·코드 명령은 postValue(ID·코드), 날짜 명령은 날짜를 보낸다. 날짜 명령은 비어 있으면 명령일이 쓰인다. */
export function buildProcessPayload(
  type: OrderTypeDef,
  orderDt: string,
  remark: string,
  rows: OrderTargetRow[],
): OrderProcessPayload {
  return {
    orderType: type.code,
    orderDt,
    remark: remark.trim(),
    items: rows.map((row) => ({ userId: row.userId, postValue: String(row.postValue ?? '').trim() })),
  };
}

/** 처리 전에 화면에서 확인하는 입력 오류(서버가 다시 검증한다). 문제가 없으면 null. */
export function validateOrderInput(
  type: OrderTypeDef | undefined,
  orderDt: string,
  rows: OrderTargetRow[],
): string | null {
  if (!type) return '명령 유형을 선택해 주세요.';
  if (!orderDt) return '명령일을 입력해 주세요.';
  if (orderDt > todayString()) return '명령일은 오늘 이후로 입력할 수 없습니다.';
  if (rows.length === 0) return '대상 사원을 선택해 주세요.';
  const missing = rows.filter((row) => !String(row.postValue ?? '').trim());
  if (missing.length > 0) {
    return `${missing.map((row) => row.userNm).join(', ')}: 명령 후 ${type.fieldName} 값을 입력해 주세요.`;
  }
  return null;
}

const SOURCE_LABELS: Record<string, string> = { ORDER: '인사명령', DIRECT: '직접 수정', JOIN: '신규 등록' };

export function sourceLabelOf(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export const SOURCE_OPTIONS = [
  { value: 'ORDER', label: '인사명령' },
  { value: 'DIRECT', label: '직접 수정' },
  { value: 'JOIN', label: '신규 등록' },
];

/** 처리 내역 표(읽기 전용). */
export function createHistoryColumns(): F1GridColumn<OrderHistoryRow>[] {
  const col = (
    field: keyof OrderHistoryRow, headerName: string, width: number, extra: Partial<F1GridColumn<OrderHistoryRow>> = {},
  ) => ({ field, headerName, width, editable: false, search: { hidden: true }, ...extra }) as F1GridColumn<OrderHistoryRow>;
  return [
    col('orderDtId', 'No', 56, { type: 'rownumber', align: 'center' }),
    col('createdAt', '처리일시', 140, { align: 'center' }),
    col('orderDt', '명령일', 100, { align: 'center' }),
    col('userNm', '사원', 110, { highlightSearch: true }),
    col('employeeNo', '사번', 90, { align: 'center', highlightSearch: true }),
    col('orderTypeName', '명령 유형', 110, { align: 'center' }),
    col('fieldName', '변경항목', 100, { align: 'center' }),
    col('preName', '명령 전', 150),
    col('postName', '명령 후', 150),
    col('source', '출처', 90, { align: 'center', getValue: (row) => sourceLabelOf(row.source) }),
    col('createdByName', '처리자', 100, { align: 'center' }),
    col('remark', '비고', 200),
  ];
}
