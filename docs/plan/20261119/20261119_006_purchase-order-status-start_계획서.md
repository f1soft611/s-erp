# 발주현황 시작 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 정상 기본값/version2 세션·수정/취소/마감/출력 정책을 유지하면서 search/list/detail 첫 eligible commit을 일치시킨다.

**Architecture:** 같은 owner의 search 초기화 wrapper, 목록 filters/retryRequest/마지막 실제 시작 version guard, 상세 ID/token guard만 변경한다. 기존 useMemo 정상 기본값과 Promise/취소·passive 저장 경계는 유지한다.

**Tech Stack:** React/TypeScript, 기존 session/initialLoad 훅, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/materials/order/status/hooks/usePurchaseOrderStatus.ts`, `frontend/tests/purchase-order-status.test.tsx`, 날짜별 문서/결과. 원 화면 사양20261113_002의 공유 폼과 기존 정상 기본값/출력 구현을 유지한다.

**대안:** 이벤트만 바꾸면 최초/props 조건 변경이 빠진다. 타이머/억제·render ref/IO 이동은 제외하고 앞 단위와 같은 bounded own-state guard를 사용한다.

## 실행

- [x] 변경 없는 현황1파일21개 기준선 통과. 요청현황과 달리 기본 status=ACTIVE, session version2, 실제 get 서비스의 HTTP item wrapper, view/edit/close 모드가 있음을 확인했다.
- [x] nullable loaded defaults 제어와 실제 search/list 최초/지연2개씩 및 detail1개를 추가했다. 첫 layout의 기본값 비초기화2/list 비로딩2/detail 비로딩1 RED5를 구현 전에 확인했다. version2/passive 저장·입력/적용·복원/최신 기간+정상 초기화·quiet/취소/중단 version·같은 ID/refresh/재열기/view/edit/close 상태를 포함한다.
- [x] search effect wrapper만 다음 코드로 바꿨다. 위 loadedDefaultValues/status useMemo는 보존했다.

```tsx
if (defaultValues && searchSession === null) {
  const snapshot = { keyword: '', detailValues: clonePurchaseOrderStatusSearchValues(defaultValues) };
  setKeyword('');
  setDetailValues(snapshot.detailValues);
  applySnapshot(snapshot);
}
```

- [x] 사용처가 없는 useRef import와 previousRetryVersion ref를 제거하고 아래 코드로 기존 시작 setter만 옮겼다. effect의 null `return undefined`·비동기 결과/cleanup은 유지했다.

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

- [x] 상세에 아래 guard를 추가하고 effect의 loading=true/error 초기화만 제거했다. 나머지 요청/active cleanup/이벤트/editor mode는 유지했다.

```tsx
const [previousRequest, setPreviousRequest] = useState({ id: selectedId, token: refreshToken });
if (previousRequest.id !== selectedId || previousRequest.token !== refreshToken) {
  setPreviousRequest({ id: selectedId, token: refreshToken });
  if (selectedId !== null) {
    setLoading(true); setError('');
  }
}
```

- [ ] owned frontend에서 관련 Vitest3파일52개(현황26개), `tsc -b`, `vite build`, `oxlint --format=json` exit0과 실제 진단63→60을 확인했다. **아직 기존21개 본문·세 guard 외 소스·다른 진단 label·891파일 parity audit는 미실행**이므로 이 단계는 완료 처리하지 않았다.
- [ ] 375/768/1280px 실제 독립 search/list/detail/session 훅의 합성 probe에서 첫 commit·passive 저장·quiet/취소/세션/재열기를 native 검증한다. 합성 default/deferred GET와 메모리 저장소만 사용, 모든 쓰기/기타 transport와 영구 저장소 차단, PNG6/소유 탭 닫힘. 실제 업무 화면으로 표현하지 않는다.
- [ ] 결과/직접 작은 diff 리뷰·선행072 정확 CI 보관 후 allowlist 별도 커밋/비강제 푸시·원격 일치/정확073 CI를 확인한다.

## 사용자 요청 중단 / 재개

토큰 잔량으로 기록 후 나중에 이어가라는 요청에 따라 여기서 중단했다. 구현/집중 테스트/정적 검증까지이며 native/audit/커밋/푸시/073 CI는 아직 없다. 재개할 때 [073 인계 결과](../../result/20261119/repository-remediation/20261119_006_purchase-order-status-start_결과.md)를 먼저 읽는다. 변경을 되돌리거나 완료로 표시하지 않는다.
