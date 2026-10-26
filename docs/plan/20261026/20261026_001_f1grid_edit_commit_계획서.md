# F1-Grid Edit Commit Implementation Plan

**Goal:** 일반 셀 편집 확정 시 비수정 행의 불필요한 본문 실행을 제거한다.

**Architecture:** 기존 GridRow memo 비교를 실제 행 표시 영향 기준으로 좁힌다. dirty는 현재 행의 컬럼별 boolean으로 비교하고 일반 행의 전체 목록 의존은 마지막 행 여부로 비교한다. 병합 열은 기존 전체 목록/병합 정보 비교를 유지한다. 공개 API나 상태 저장 구조는 바꾸지 않는다.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, Vite.

## 근거 및 대안

- [작업지시서](../../directions/20261026/20261026_001_f1grid_edit_commit_작업지시서.md)
- 권장: 기존 comparator에서 행에 필요한 값만 비교한다. 수정 범위가 작고 현재 최신 이벤트 전달 구조를 재사용한다.
- 대안: 부모에서 행별 dirty/merge props를 새로 도입한다. 전달 계층과 캐시가 늘어나 이번 원인에 비해 변경 범위가 크다.
- 병합 전체 최적화는 별도 과제로 남긴다. 이번에는 병합 정확성을 우선한다.

## 실행 단계

1. `frontend/tests/f1-grid-render-performance.test.tsx`에 값 변경 후 Enter/Tab/외부 클릭 확정 시 비수정 행 방문 0회 테스트를 추가하고 실패를 확인한다.
2. `frontend/src/shared/components/f1-grid/core/GridRow.tsx`의 비교를 변경한다.
   - dirty boolean을 현재 행/컬럼 기준으로 비교한다.
   - 일반 행은 `prev.visibleRows.length === next.visibleRows.length`를 비교한다.
   - 병합 열이 있으면 전체 목록과 병합 정보 참조를 계속 비교한다.
3. 같은 테스트 파일에서 변경 복구 시 dirty 제거, 편집 후 비수정 행의 최신 이벤트, 마지막 행 경계 및 정렬/필터를 검증한다.
4. 성능·병합·고정열·폼 관련 테스트를 실행하고 `frontend`에서 `npm run build`를 실행한다.
5. 4173의 기존 S-ERP 서버를 재사용해 합성 100행 × 2열을 React Profiler로 측정하고 375/768/1280px에서 편집/내부 스크롤을 확인한다.
6. `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 `docs/result/20261026/f1grid-edit-commit`에 원인, 수정, 측정 한계, 검증 및 스크린샷을 기록한다.

## 검증 명령

`frontend`에서 실행:

```powershell
npm run test -- tests\f1-grid-render-performance.test.tsx
npm run build
```

시간은 시스템 부하 영향을 받는다. 결정적 완료 기준은 일반 행 편집 확정 후 비수정 행 본문 방문 0회이며 정렬/필터/병합의 실제 표시 변경은 생략하면 안 된다.
