# 거래명세서 현황 요청 시작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 목록/상세 요청 첫 commit의 로딩·오류 상태를 일치시키고 기존 현황/수정/출력을 보존한다.

**Architecture:** 같은 훅의 목록(canRead/applied/appliedKeyword/refresh)과 상세(selectedId/detailRefresh) identity를 각각 local state로 추적한다. 기존 요청 가능 조건일 때만 guard에서 시작 setter를 게시하며 ref/서비스 호출은 기존 effect에 둔다.

**Tech Stack:** React/TypeScript, 실제 현황/F1Grid/상세 패널, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/sales/shipment/statement/status/hooks/useSalesStatementStatus.ts`, 기존 `frontend/tests/sales-statement-page.test.tsx`, 날짜별 문서/결과. 원 화면 사양은20261109_006이며20261117_011 자동 발행/DB 정책은 이번 대상이 아니다.

**대안:** 검색 이벤트에서만 시작하면 최초 진입/권한 변경을 놓친다. 요청 token ref를 render로 옮기거나 layout effect/타이머/억제로 진단을 숨기지 않는다.

## 실행

- [x] 변경 없는 등록/현황/상세/수정/출력1파일9개 기준선 통과.
- [x] 실제 Page/Profiler 회귀3개에서 최초/권한 허용 목록 첫 버튼 disabled=false 두 개와 상세 첫 로딩 status 누락 RED 한 개를 구현 전에 확인했다. 일반 재조회·권한 변경 취소·상세 오류 후 닫기/재열기·이전 응답 무시를 검증했다.
- [x] 아래 두 guard/state를 추가하고 effect의 시작 setter 두 쌍만 제거했다. 나머지 코드/의존성은 보존했다.

```tsx
const [previousListRequest, setPreviousListRequest] = useState<{
  canRead: boolean; applied: Values; appliedKeyword: string; refresh: number;
} | null>(null);
const [previousDetailRequest, setPreviousDetailRequest] = useState({
  id: selectedId, refresh: detailRefresh,
});
if (!previousListRequest || previousListRequest.canRead !== canRead ||
  previousListRequest.applied !== applied || previousListRequest.appliedKeyword !== appliedKeyword ||
  previousListRequest.refresh !== refresh) {
  setPreviousListRequest({ canRead, applied, appliedKeyword, refresh });
  const period = applied.statementDt;
  if (canRead && typeof period === 'object' && period) {
    setLoading(true);
    setError('');
  }
}
if (previousDetailRequest.id !== selectedId || previousDetailRequest.refresh !== detailRefresh) {
  setPreviousDetailRequest({ id: selectedId, refresh: detailRefresh });
  if (selectedId) {
    setDetailLoading(true);
    setDetailError('');
  }
}
```

- [x] `vitest run --pool=threads --maxWorkers=2 tests/sales-statement-page.test.tsx`1파일12개·tsc -b·Vite build를 확인했다. Oxc73→71 제거2/추가0, 제거 source token setLoading/setDetailLoading이다. 다른 진단은 전체 label까지 동일하며 기존 테스트 본문 보존·source891파일 byte parity를 확인했다.
- [x] 375/768/1280px 실제 Page/Grid/상세 패널/Profiler를 native 조작했다. 첫 목록/재조회/권한 허용 및 상세/재열기 commit의 상태 일치, 검색어 입력만으로 무요청, 권한 취소 목록/닫힌 상세의 이전 응답 무시, 실제 상세 표와 닫기를 확인했다. GET만 합성하고 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6, 소유 탭을 닫았다.
- [x] 결과/직접 작은 diff 리뷰·선행067 정확 CI를 보관했다.17파일 allowlist로 `aa3b694b421f973f61d4a771723f2d7ad4cbb643`을 별도 커밋/비강제 푸시하고 원격 일치를 확인했다. 정확한 CI44415048096은 마지막 집계227파일2,713개와 build/tests/lint/required 네 job 모두 성공했다. 최종 근거는 후속069 커밋에 포함한다.
