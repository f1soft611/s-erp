# 입고현황 요청 시작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 목록/상세 첫 요청 commit의 로딩·오류·결과 알림을 일치시키고 기존 정상/취소/마감 보호를 유지한다.

**Architecture:** 기존에 검증한 목록 filters/retryRequest/마지막 실제 시작 version guard와 상세 ID/token guard를 각 소유 훅에 적용한다. 요청/응답/취소는 effect에 남기며 search/default/session 훅은 그대로다.

**Tech Stack:** React/TypeScript, 기존 useInitialLoadState, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/materials/receipt/status/hooks/useMaterialReceiptStatus.ts`, 기존 `frontend/tests/material-receipt-status.test.tsx`, 날짜별 문서/결과.

**대안:** 이벤트만 변경하면 최초/props 조건 변경을 놓치며, quiet 플래그만 쓰면 이후 일반 검색도 quiet가 된다. ref의 render 이동·타이머·경고 억제는 제외한다.

## 실행

- [x] 변경 없는 현황 서비스/화면1파일11개 기준선 통과.
- [x] 실제 목록 훅의 최초/지연 조건 parameter2개와 상세 훅 첫 commit 회귀1개에서 RED3를 확인했다. 일반/quiet/조건 변경·null 중 대기 version·늦은 응답과 같은 ID/닫기/재열기·로드 데이터 유지·editor 상태 회귀를 포함했다.
- [x] 목록의 previousRetryVersion ref를 아래 state/guard로 교체하고 effect의 기존 시작 처리만 제거했다. 다른 사용처가 없는 useRef import만 제거했다.

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
    start(); setHasLoaded(false);
    if (!quiet) setLoading(true);
    setError('');
  }
}
```

- [x] 상세에는 아래 guard를 추가하고 effect의 loading=true/error 초기화만 제거했다. 이벤트 함수/성공/오류/finally/active cleanup을 유지했다.

```tsx
const [previousRequest, setPreviousRequest] = useState({ id: selectedId, token: refreshToken });
if (previousRequest.id !== selectedId || previousRequest.token !== refreshToken) {
  setPreviousRequest({ id: selectedId, token: refreshToken });
  if (selectedId !== null) {
    setLoading(true); setError('');
  }
}
```

- [x] 입고현황/등록/매입마감3파일56개(현황14개)·tsc -b·Vite build가 통과했다. Oxc71→69 제거2/추가0이며 같은 파일의 search 초기화 기존 진단1개는 그대로다. source token/다른 진단 label·기존 테스트·search 함수 보존과891파일 byte parity0을 확인했다.
- [x] 375/768/1280px 실제 두 훅/layout observer의 합성 probe에서 native 목록 일반/quiet/취소/중단과 상세 열기/재조회/같은 ID/닫기/재열기/늦은 응답·editor 상태를 검증했다. GET만 합성하고 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6, 소유 탭을 닫았다. 전체 업무 화면 브라우저 검증이 아니다.
- [ ] 결과/직접 작은 diff 리뷰·선행068 정확 CI를 보관한다. allowlist 별도 커밋/비강제 푸시·원격 일치 및 정확한069 CI를 확인한다.
