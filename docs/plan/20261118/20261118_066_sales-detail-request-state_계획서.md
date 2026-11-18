# 영업 상세 요청 시작 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 수주/견적 상세 요청이 시작되는 첫 commit에 이전 비로딩/오류 상태를 노출하지 않는다.

**Architecture:** 각 훅의 마지막 ID/token 쌍을 local state로 추적한다. 쌍이 달라지면 bounded render guard에서 기록하고, ID가 null이 아닐 때만 기존 loading=true/error 초기화를 게시한다. effect는 기존 서비스 요청과 active cleanup만 담당한다.

**Tech Stack:** React/TypeScript, Vitest/Testing Library, Oxc, 기존 Orca 브라우저.

**Files:** `frontend/src/pages/sales/order/status/hooks/useSalesOrderStatusDetail.ts`, `frontend/src/pages/sales/quotation/status/hooks/useQuotationStatusDetail.ts`; 기존 `frontend/tests/sales-order-status-page.test.tsx`, `frontend/tests/quotation-status-page.test.tsx`; 날짜별 문서/결과.

**대안:** openDetail에서 무조건 loading을 켜면 같은 ID 무요청 시 loading이 고착된다. 이벤트마다 전체 요청 상태를 합치는 재작성은 제외한다. 지연/억제나 effect 종류만 바꾸는 방식도 사용하지 않는다.

## 실행

- [x] 변경 없는 두 실제 현황 페이지 2파일 24개를 기준선으로 확인했다.
- [x] 기존 테스트에 실제 상세 훅/layout commit 관찰 회귀 두 개를 추가했다. 첫 open commit의 loading=false RED2를 먼저 확인했다. 최초/실패 후 재조회·로딩 중 기존 데이터 유지·같은 ID 무요청·다른 ID/닫기/재열기·늦은 응답 무시·닫힌 상태 재조회를 확인했다.
- [x] 아래 guard를 추가하고 각 effect의 `setLoading(true); setError('');` 두 줄만 제거했다. 수주는 selectedOrderId, 견적은 selectedQuotationId를 그대로 사용한다.

```tsx
const [previousRequest, setPreviousRequest] = useState({ id: selectedOrderId, token: refreshToken });
if (previousRequest.id !== selectedOrderId || previousRequest.token !== refreshToken) {
  setPreviousRequest({ id: selectedOrderId, token: refreshToken });
  if (selectedOrderId !== null) {
    setLoading(true);
    setError('');
  }
}
```

- [x] `vitest run --pool=threads --maxWorkers=2 tests/sales-order-status-page.test.tsx tests/quotation-status-page.test.tsx` 2파일 26개, `tsc -b`, `vite build`, `oxlint --format=json`을 격리 검증 workspace에서 확인했다. Oxc 77 → 75, 제거2/추가0이며 제거 소스 token은 모두 setLoading이다. 다른 진단은 전체 label까지 동일하다. 기존 테스트 byte 보존/source891파일 byte parity를 확인했다.
- [x] 실제 두 훅/layout observer의 375/768/1280px 합성 probe에서 native 열기/실패/재조회/닫기/재열기·늦은 응답 무시를 확인했다. 실제 현황 전체 화면은 기존 통합 테스트가 검증하며 probe 검증을 전체 화면으로 확대 표현하지 않는다. GET 경계와 메모리 저장소만 합성하고 모든 쓰기/기타 transport를 차단했다. 오류/이탈/문서 넘침0, PNG6, 소유 탭을 닫았다.
- [x] 결과/스크린샷·작은 전체 diff 리뷰·정확한 065 CI를 보관했다. allowlist19파일 커밋 `c57e80e57771c322e8847db3c00eec29d0fef376`를 비강제 푸시하고 원격 일치를 확인했다. 정확한 CI44378959885는 마지막 집계227파일2,706개와 네 job 모두 성공했다.
