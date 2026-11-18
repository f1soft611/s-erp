# 매입마감 재조회 상태 초기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 새 매입마감 조회 결과 commit에 이전 구매처 필터·선택·편집값을 노출하지 않는다.

**Architecture:** rows/suppliers의 마지막 적용 참조를 state로 추적하고 최초 적용 또는 참조 변경에만 같은 컴포넌트의 bounded render reset을 수행한다. 기존 effect의 다섯 상태 갱신과 Grid key 증가를 그대로 옮긴다.

**Tech Stack:** React/TypeScript, Vitest/Testing Library, Oxc, 기존 Orca 브라우저.

**범위:** `frontend/src/pages/materials/receipt/closing/MaterialReceiptClosingPage.tsx`와 기존 `frontend/tests/material-receipt-closing.test.tsx`, 날짜별 문서/결과. 원 화면 사양은 `docs/spec/20261117/20261117_007_매입마감처리_화면_상세사양서.md`.

**대안:** 서비스 응답에서 페이지 상태를 지우면 계층 간 결합이 생기므로 제외한다. 지연/억제는 원인을 해결하지 않는다. 화면 전체 key 재생성은 검색과 Splitter 상태를 잃을 수 있어 제외한다.

## 실행

- [x] 변경 없는 기존 매입마감 테스트 1파일 13개를 기준선으로 확인했다.
- [x] 실제 페이지/서비스 경계를 사용하는 기존 테스트에 Profiler 회귀 한 개를 추가했다. 구매처 선택·단가 수정·입고 행 체크 후 같은 데이터의 검색어 편집에는 상태를 유지하고, 새 조회 결과 첫 commit에는 이전 구매처 칩·선택·편집값이 없어야 한다. 구현 전 첫 새 결과 commit의 구매처 필터 true RED를 확인했다.
- [x] 기존 effect를 아래 bounded guard로 교체하고 쓰이지 않는 useEffect import만 제거했다.

```tsx
const [previousData, setPreviousData] = useState<{
  rows: typeof list.rows;
  suppliers: typeof list.suppliers;
} | null>(null);

if (previousData === null || previousData.rows !== list.rows || previousData.suppliers !== list.suppliers) {
  setPreviousData({ rows: list.rows, suppliers: list.suppliers });
  setEdits({});
  setSelectedRowIds([]);
  setSelectedSupplierId(null);
  setSupplierGridKey((key) => key + 1);
  setRowsEpoch((epoch) => epoch + 1);
}
```

- [x] `vitest run --pool=threads --maxWorkers=2 tests/material-receipt-closing.test.tsx tests/material-receipt-create.test.tsx tests/material-receipt-status.test.tsx` 3파일 53개와 `tsc -b`, `vite build`, `oxlint --format=json`을 격리 검증 workspace에서 확인했다. Oxc 79 → 78, 제거1/추가0이며 다른 진단은 label까지 동일하다. 기존 테스트 본문 byte 보존·frontend source 891파일 parity를 확인했다.
- [x] 실제 페이지/Profiler 375/768/1280px에서 native 구매처/행 선택·조회 → 새 결과의 첫 commit 초기화를 확인했다. 합성 GET 응답과 메모리 저장소만 사용하고 POST/다른 transport를 차단했다. 단가 편집은 단위 회귀가 확인한다. 요청 이탈/문서 넘침 0, 소유 탭을 닫았다.
- [ ] 결과/스크린샷·작은 전체 diff 리뷰·정확한 063 CI를 보관한다. allowlist 커밋·비강제 푸시·원격 일치와 정확한 064 CI를 확인한다.
