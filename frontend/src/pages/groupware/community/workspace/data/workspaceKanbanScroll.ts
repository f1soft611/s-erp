/** 가로로 스크롤되는 칸반 보드에서 어느 쪽에 아직 볼 내용이 남았는지 알려 준다(가장자리 흐림 표시용). */
export function scrollEdges(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
  threshold = 2,
): { left: boolean; right: boolean } {
  return {
    left: scrollLeft > threshold,
    right: scrollLeft + clientWidth < scrollWidth - threshold,
  };
}

const EDGE_ZONE = 56;
const MAX_STEP = 28;

/**
 * 카드를 끌고 있을 때 보드를 얼마나 가로로 스크롤할지 정한다. 포인터가 보드의 왼쪽·오른쪽 가장자리
 * 56px 안으로 들어오면 가까울수록 빠르게(최대 28px) 움직이고, 가운데에서는 움직이지 않는다.
 * 브라우저 기본 자동 스크롤에 기대지 않고 어디서나 같게 동작하도록 직접 계산한다.
 */
export function edgeScrollStep(clientX: number, left: number, right: number): number {
  const fromLeft = clientX - left;
  const fromRight = right - clientX;
  if (fromLeft < EDGE_ZONE) {
    const closeness = Math.min(1, (EDGE_ZONE - Math.max(0, fromLeft)) / EDGE_ZONE);
    return -Math.max(1, Math.round(MAX_STEP * closeness));
  }
  if (fromRight < EDGE_ZONE) {
    const closeness = Math.min(1, (EDGE_ZONE - Math.max(0, fromRight)) / EDGE_ZONE);
    return Math.max(1, Math.round(MAX_STEP * closeness));
  }
  return 0;
}
