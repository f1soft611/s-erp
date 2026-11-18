# 영업 현황 목록 요청 시작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 현황 목록 요청 시작 첫 commit의 로딩/결과 알림/오류 상태를 일치시키되 조용한 갱신을 보존한다.

**Architecture:** 두 훅에서 마지막 filters/retryRequest 참조와 마지막 실제 시작 version을 state로 기록한다. bounded guard가 기존 start/hasLoaded/loading/error를 게시하고 effect는 서비스 요청/응답/취소만 담당한다. 기존 quiet version ref는 제거하며 render에서 ref를 읽지 않는다.

**Tech Stack:** React/TypeScript, 기존 useInitialLoadState, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/sales/order/status/hooks/useSalesOrderStatusList.ts`, `frontend/src/pages/sales/quotation/status/hooks/useQuotationStatusList.ts`; 기존 `frontend/tests/sales-order-status-page.test.tsx`, `frontend/tests/quotation-status-page.test.tsx`; 날짜별 문서/결과.

**대안:** retry 이벤트만 변경하면 props 조건 변경/최초 조회를 놓친다. quiet 플래그만 사용하면 quiet 이후 조건 변경까지 일반 로딩이 사라진다. ref의 render 이동·타이머·경고 억제는 제외한다.

## 실행

- [x] 066과 동일한 변경 없는 검증 source의 실제 현황 2파일 26개·891파일 parity를 기준선으로 재사용한다.
- [x] 실제 목록 훅/layout commit의 null→조회 첫 commit loading/initialLoad.loading=false RED2를 구현 전에 확인했다. 최초부터 조건이 있는 경우까지 parameter4개로 보강한 뒤 정확한 기준선의 두 훅만 격리 workspace에 적용해 RED4를 확인했고 finally에서 현재 소스로 복원했다. 일반 retry·quiet 행 유지·quiet 다음 일반 조건 변경·늦은 응답 무시·null 중 대기한 quiet retry까지 통과했다.
- [x] useRef/previousRetryVersion을 아래 local state/guard로 교체하고 effect의 start/hasLoaded/loading/error 시작 처리만 제거했다. 나머지 요청/응답·cancelled/active cleanup은 그대로다.

```tsx
const [previousRequest, setPreviousRequest] = useState<{
  filters: typeof filters | undefined;
  retryRequest: typeof retryRequest;
  retryVersion: number;
}>({ filters: undefined, retryRequest, retryVersion: 0 });
const { start, succeed, fail, ...initialLoad } = useInitialLoadState();
if (previousRequest.filters !== filters || previousRequest.retryRequest !== retryRequest) {
  const quiet = retryRequest.quiet && retryRequest.version !== previousRequest.retryVersion;
  setPreviousRequest({
    filters, retryRequest,
    retryVersion: filters ? retryRequest.version : previousRequest.retryVersion,
  });
  if (filters) {
    start();
    setHasLoaded(false);
    if (!quiet) setLoading(true);
    setError('');
  }
}
```

- [x] 같은 실제 현황2파일30개·tsc -b·Vite build를 확인했다. Oxc75→73 제거2/추가0이며 제거 소스 token은 setHasLoaded 두 개, 다른 진단은 전체 label까지 동일하다. 기존 테스트 본문 보존·source891파일 byte parity를 확인했다.
- [x] 375/768/1280px 실제 두 목록 훅/layout observer의 합성 probe에서 native 첫 조회/실패/retry/quiet/조건 변경/취소/중단·재개를 확인했다. 일반/quiet/재개 첫 commit이 일치하며 quiet 행 유지·조건 변경 일반 로딩·이전 응답 무시를 확인했다. 전체 업무 화면 검증이 아니다. GET만 합성하고 영구 저장소·쓰기/기타 transport를 차단했다. 오류/이탈/문서 넘침0, PNG6, 소유 탭을 닫았다.
- [ ] 결과/PNG6·직접 작은 diff 리뷰·선행 066 정확 CI를 보관한다. allowlist 별도 커밋/비강제 푸시와 정확한 067 CI를 확인한다.
