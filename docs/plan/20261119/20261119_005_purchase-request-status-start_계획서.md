# 구매요청현황 시작 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 검색 기본값/목록/상세 첫 eligible commit부터 상태를 일치시키고 기존 요청/확정·편집 보호와 세션을 유지한다.

**Architecture:** search의 기존 초기화 wrapper만 bounded own-state guard로 전환한다. 목록의 ref를 filters/retryRequest/마지막 실제 시작 version local state로 바꾸고 상세에 ID/token guard를 추가한다. 서비스/취소/응답/저장은 기존 effect 경계를 유지한다.

**Tech Stack:** React/TypeScript, 기존 session/initialLoad 훅, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/materials/request/status/hooks/usePurchaseRequestStatus.ts`, 기존 `frontend/tests/purchase-request-status.test.tsx`, 날짜별 문서/결과. 원 화면 사양20261112_003의 UI 흐름을 보존한다.

**대안:** 이벤트만 바꾸면 최초/props 조건 변경이 빠진다. 직접 IO/ref를 render로 옮기거나 타이머/억제로 진단을 숨기지 않는다. 추가 리팩터링 없이 검증된 같은 owner guard로 한정한다.

## 실행

- [x] 변경 없는 현황 서비스/Page1파일3개 기준선 통과.
- [x] nullable default 제어와 실제 search/list/layout observer parameter2개씩 및 detail 회귀1개를 추가했다. search 비초기화2/list 비로딩2/detail 비로딩1 RED5를 구현 전에 확인했다. 저장 version1/passive·입력/적용/복원/초기화, quiet/중단 version·취소, 같은 ID/닫기/재열기·editor 상태를 검증했다.
- [x] search effect wrapper만 다음 코드로 바꿨다. 공통 session setter는 원본 React setter이며 저장 effect를 그대로 둔다.

```tsx
if (defaultValues && searchSession === null) {
  const snapshot = { keyword: '', detailValues: clonePurchaseRequestStatusSearchValues(defaultValues) };
  setKeyword('');
  setDetailValues(snapshot.detailValues);
  applySnapshot(snapshot);
}
```

- [x] 목록의 previousRetryVersion ref를 아래 코드로 교체하고 effect의 기존 시작 처리만 제거했다. 다른 사용처가 없는 useRef import를 제거했다.

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

- [x] 상세에 아래 guard를 추가하고 effect의 loading=true/error 초기화만 제거했다. 이벤트 함수/active cleanup/성공/오류/finally는 유지했다.

```tsx
const [previousRequest, setPreviousRequest] = useState({ id: selectedId, token: refreshToken });
if (previousRequest.id !== selectedId || previousRequest.token !== refreshToken) {
  setPreviousRequest({ id: selectedId, token: refreshToken });
  if (selectedId !== null) {
    setLoading(true); setError('');
  }
}
```

- [x] owned frontend에서 관련 Vitest3파일25개(현황8개)·tsc -b·Vite build가 통과했다. Oxc66→63 제거3/추가0, 같은 파일 진단0/다른 진단 전체 label 동일이다. nullable default 제어 외 기존3개 본문·세 guard 외 소스 보존과891파일 byte parity0을 확인했다.
- [x] 375/768/1280px 실제 search/list/detail/session 독립 훅/layout observer의 합성 probe에서 첫 commit·passive 저장·편집/적용/세션 복원/최신 기간 초기화·quiet/취소/중단 version·같은 ID/닫기/재열기/editor 상태를 native 검증했다. 합성 default/deferred GET와 메모리 저장소만 사용하고 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, 목록/상세 PNG6과 소유 탭 닫힘을 확인했다. 전체 업무 화면 검증이 아니다.
- [x] 결과/직접 작은 diff 리뷰·선행071 정확 CI를 보관했다.17파일 allowlist로 `225d7f761b5cc838cdce59f93d42d984ecd6d667`을 별도 커밋/비강제 푸시·원격 일치했다. 정확한 CI44422062406은 마지막 집계227파일2,727개와 네 job 모두 성공했다. 최종 판정은 후속073 문서와 함께 보관하며, 사용자 중단 요청 시점에는 해당 문서가 미커밋 상태다.
