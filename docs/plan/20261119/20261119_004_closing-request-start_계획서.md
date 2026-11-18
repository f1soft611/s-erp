# 매입마감 검색/조회 시작 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 검색 기본값과 구매처/행 동시 조회의 첫 commit을 일치시키고 기존 마감/해제·금액/선택 보호를 유지한다.

**Architecture:** 검색 초기화 effect wrapper만 session=null/defaults 준비 guard로 전환한다. 데이터 훅은 filters/retryRequest/마지막 실제 시작 version state guard에서 기존 시작 setter만 게시하며 Promise.all/cleanup은 effect에 둔다.

**Tech Stack:** React/TypeScript, 기존 session/initialLoad 훅, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/materials/receipt/closing/hooks/useMaterialReceiptClosing.ts`, 기존 `frontend/tests/material-receipt-closing.test.tsx`, 날짜별 문서/결과. 원 화면 사양20261117_007의 UI/조회 기준이며 DB/API 작업은 아니다.

**대안:** query 이벤트만 바꾸면 최초/조건 변경을 놓치며, 두 GET 결과를 나누어 게시하면 요약/행이 다른 요청 결과가 될 수 있다. 타이머/억제·render ref/IO 이동은 제외한다.

## 실행

- [x] 변경 없는 매입마감 서비스/컬럼/Page1파일14개 기준선 통과.
- [x] nullable default 제어로 실제 search 훅 최초/지연 첫 eligible commit RED2를 확인했다. 첫 layout write0·version1 저장·서버 월/전체 기본값·입력/적용 분리·복원/최신 default 초기화 회귀를 포함했다.
- [x] 실제 data 훅 최초/지연 parameter2개에서 첫 commit 비로딩 RED2를 확인했다. pair 한 GET 완료 시 미게시, 양쪽 완료 시 원자적 게시, 오류/재조회/quiet/조건 변경/취소/null 중 대기 version을 검증했다.
- [x] 검색 effect wrapper를 다음 코드로 바꿨다. clone/snapshot/applySnapshot과 session 공통 훅은 유지했다.

```tsx
if (defaultValues && searchSession === null) {
  const snapshot = { keyword: '', detailValues: cloneMaterialReceiptClosingSearchValues(defaultValues) };
  setKeyword('');
  setDetailValues(snapshot.detailValues);
  applySnapshot(snapshot);
}
```

- [x] 데이터의 previousRetryVersion ref를 아래 state/guard로 교체하고 effect의 quiet 계산/start/setHasLoaded/loading/error 처리만 제거했다. 다른 사용처가 없는 useRef import를 제거했다.

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

- [x] owned frontend에서 관련 Vitest3파일62개(매입마감18개)·tsc -b·Vite build가 통과했다. Oxc68→66 제거2/추가0, 같은 파일 진단0/다른 진단 전체 label 동일이다. nullable default 제어 외 기존14개 본문/두 guard 외 소스 보존과891파일 byte parity0을 확인했다.
- [x] 375/768/1280px 실제 search/data/session 훅 조합/layout observer의 합성 probe에서 첫 기본값/조회 commit·passive 저장·동시 조회/half-pair·quiet/취소/중단 version·세션 복원/초기화를 native 검증했다. 합성 default/deferred GET와 메모리 저장소만 사용하고 쓰기/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6, 소유 탭을 닫았다. 전체 업무 화면 검증이 아니다.
- [ ] 결과/직접 작은 diff 리뷰·선행070 정확 CI를 보관한다. allowlist 별도 커밋/비강제 푸시·원격 일치와 정확한071 CI를 확인한다.
