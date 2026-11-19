# F1Grid 로컬 레이아웃 callback 의존성 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 가시 컬럼 수가 바뀐 드래그의 현재 hit-test와 기존 pending frame 보존을 함께 보장하며 로컬 의존성 경고 4개를 제거한다.

**Architecture:** 기존 선언형 helper 본문은 유지한다. hoisted hit-test 함수를 실제 capture 값으로 memoize하여 listener에 전달하고, overlay helper는 useCallback으로 identity와 capture 의존성을 함께 표현한다. rowHeights는 이미 rowHeightsById로 반영되지만 memo의 직접 참조도 명시한다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 변경 파일과 조사

- 운영: `frontend\src\shared\components\f1-grid\core\F1Grid.tsx`.
- 회귀: 기존 `frontend\tests\f1-grid.test.tsx`.
- 계약: `frontend\src\pages\f1-grid-docs\F1-GRID.md`.
- 원래 drag effect는 rowIndexById/rowKey/visibleRows를 관찰하지만 resolvePointerCell은 visibleColumns.length도 읽는다. disableFiltering/disableSorting에서 rows를 유지하고 컬럼 수만 늘리면 기존 effect가 과거 길이를 캡처한다.
- 전체 visibleColumns 배열을 key로 삼으면 동일 내용의 새 컬럼 배열에도 listener cleanup이 pending frame을 취소하므로 길이 primitive만 사용한다.

## 실행

- [x] 실제 window pointer listener와 제어한 RAF로 컬럼 1→2 변경 후 경계 이동의 RED를 추가한다. 동일 컬럼 수/행의 부모 재렌더 전후 pending frame 보존도 같은 회귀에 포함한다.
- [x] 테스트만 검증 workspace에 복사해 신규 컬럼 수 회귀만 실패하고 기존/동일 수 보존 회귀가 통과하는지 확인한다.
- [x] 기존 helper를 다음처럼 memoize하고 drag effect가 resolveDraggedCell을 사용·관찰하게 한다. 원래 capture dependency도 유지한다.

```tsx
const resolveDraggedCell = useCallback(resolvePointerCell, [
  rowIndexById,
  rowKey,
  visibleColumns.length,
  visibleRows,
]);
```

- [x] updateRangeOverlay의 선언을 `const updateRangeOverlay = useCallback(() => {`로 바꾸고 기존 본문 뒤를 `}, [cellSelection, copiedCellRange, rowIndexById, rowKey, visibleRows]);`로 닫는다. 두 effect의 기존 dependency 배열에 updateRangeOverlay만 추가하며 조건/계산/비교/setter는 변경하지 않는다.
- [x] rowVirtualState memo에 이미 간접 반영되던 rowHeights를 직접 추가한다. 새 행 높이 동작을 만들지 않으므로 언어/구현을 반복하는 테스트는 추가하지 않고 기존 높이/가상화 회귀를 실행한다.
- [x] 관련 grid/tree/docs/performance 회귀와 typecheck/build/lint를 확인한다. 대상 의존성 4개 외 진단은 동일해야 한다.
- [x] AST로 공개 props/JSX/전체 기존 helper·상태·관계없는 effect·기존 테스트 보존을 확인하고 root/검증 workspace 소스 byte를 비교한다.
- [x] 실제 그리드 375/768/1280px, native 범위 선택·copy/해제·스크롤·행 높이/가상화를 확인한다. 첫 hit-test 경계의 합성 DOM 재현과 실제 브라우저 범위를 구분한다.
- [x] F1-GRID/결과·스크린샷과 이전 039 CI를 구분해 별도 커밋 단위로 정리한다. 비강제 푸시와 정확한 SHA의 CI는 Git/원격 실행 이력으로 확인한다.
