import { getCellDisplayValue, type F1GridCellRenderContext } from '../../../../../shared/components/f1-grid';

/**
 * 값이 없는(null) 숫자 칸을 0이 아니라 빈 칸으로 그린다. 그리드 숫자 서식은 null을 0으로 표시하므로
 * 이 화면의 단가·외화단가·최소주문수량처럼 "없음"과 0이 다른 칸에만 쓴다. 값이 있으면 그리드 서식(소수점 정책)을 그대로 쓴다.
 */
export function renderBlankWhenEmpty<T extends object>({ column, value }: F1GridCellRenderContext<T>) {
  return value === null || value === undefined || value === ''
    ? null
    : getCellDisplayValue(column, value as T[keyof T]);
}
