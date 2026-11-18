# 입고현황 검색 기본값 commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 최초/지연 기본값을 첫 eligible commit부터 일관되게 적용하고 세션 복원/편집/적용/초기화를 보존한다.

**Architecture:** 기존 초기화의 조건을 `defaultValues && searchSession === null` bounded local-state guard로 전환한다. applySnapshot의 setSearchSession은 같은 owner의 React 원본 setter다. 공통 훅의 passive storage effect와 기존 검증/version/persistWhen은 그대로 둔다.

**Tech Stack:** React/TypeScript, 기존 usePageSessionState, Vitest/Testing Library, Oxc, Orca.

**Files:** `frontend/src/pages/materials/receipt/status/hooks/useMaterialReceiptStatus.ts`의 search 초기화 구간, 기존 `frontend/tests/material-receipt-status.test.tsx`, 날짜별 문서/결과.

**대안/결정:** 같은 소유 state guard가 최소 변경이다. 표시만 fallback하는 방식은 실제 appliedFilters/저장 snapshot을 따로 남겨 계약이 분리되고, layout effect/타이머는 중간 commit이나 경고를 숨긴다. 모두 제외한다. UI/시각 디자인 변경은 없다.

## 실행

- [x] 변경 없는 현황1파일14개 기준선 통과. `usePageSessionState`는 원본 setState를 반환하고 저장은 effect라는 경계를 확인했다.
- [x] 기존 default mock에 nullable 값 제어만 추가하고 최초/지연 parameter2개에서 첫 eligible commit의 `defaultsInitialized=false` RED2를 확인했다. Storage.prototype.setItem spy로 첫 layout의 해당 키 write0과 commit 뒤 version2 snapshot을 확인했다.

```tsx
const defaultSearchControl = vi.hoisted(() => ({
  values: { receiptDt: { from: '2026-11-01', to: '2026-11-30' } } as
    { receiptDt: { from: string; to: string } } | null,
}));
// 기존 usePageSearchDefaults mock의 values를 defaultSearchControl.values로 바꾼다.
// 기존 beforeEach에서 같은 기본 기간으로 복구한다.
```

첫 commit은 `{initialized:true, keyword:'', detailValues:{receiptDt:{from:'2026-11-01',to:'2026-11-30'},status:'ACTIVE'}, filters:{receiptDtFrom:'2026-11-01',receiptDtTo:'2026-11-30',status:'ACTIVE'}, writes:0}`를 포함해야 한다. 입력만 변경하면 적용/저장 snapshot은 그대로이고, applySearch는 새 snapshot을 저장한다. 기본값이 바뀌거나 재열어도 유효 세션이 우선이며 resetSearch만 최신 기본 기간/정상으로 돌아간다.

- [x] 아래 guard로 기존 effect wrapper만 바꿨다. 목록/상세와 공통 세션 훅을 byte 보존했다.

```tsx
if (defaultValues && searchSession === null) {
  const snapshot = { keyword: '', detailValues: cloneMaterialReceiptStatusSearchValues(defaultValues) };
  setKeyword('');
  setDetailValues(snapshot.detailValues);
  applySnapshot(snapshot);
}
```

- [x] owned frontend에서 관련 Vitest3파일58개(현황16개)·tsc -b·Vite build가 통과했다. Oxc69→68 제거1/추가0, 같은 파일 진단0/다른 진단 전체 label 동일이다. nullable default 제어 외 기존14개 본문·초기화 wrapper 외 소스 보존과891파일 byte parity0을 확인했다.
- [x] 375/768/1280px 실제 search/session 훅/layout observer의 합성 probe에서 지연 기본값 첫 commit·첫 layout write0/commit 뒤 저장·입력/적용·default 변경/재열기 세션 우선·최신 default 초기화를 native 검증했다. 메모리 Storage와 합성 default provider만 사용하고 모든 API/기타 transport와 영구 저장소를 차단했다. 오류/이탈/문서 가로 넘침0, PNG6, 소유 탭을 닫았다. 전체 업무 화면 검증이 아니다.
- [ ] 결과/직접 작은 diff 리뷰·선행069 정확 CI를 보관한다. allowlist 별도 커밋/비강제 푸시·원격 일치와 정확한070 CI를 확인한다.
