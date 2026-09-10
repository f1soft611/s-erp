# F1-Grid 현재 구현 기준 문서 동기화 결과

## 작업 목적

- F1-Grid 공용 컴포넌트의 현재 구현 계약과 문서 포털의 설명이 어긋나지 않도록 정리한다.
- 기능/옵션에 대한 설명이 빠져 있으면 실제 샘플과 함께 보완한다.

## 반영 내용

- `F1GridProps` 문서에 `minHeight`, `loading`, `allowAddRowInContextMenu`, `allowDuplicateRowInContextMenu`, `allowDeleteRowInContextMenu`를 반영했다.
- 컨텍스트 메뉴 문서에 실제 동작하는 `canExportExcel`, `createDuplicate`, `excelFileName`, `treeContextMenu` 흐름을 추가했다.
- `F1GridPlayground`에 우클릭 메뉴 샘플을 추가하고, 토글 버튼으로 export/행 액션 노출 여부를 바로 확인할 수 있게 했다.
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`에도 실제 구현 기준 요약과 샘플 코드가 반영되도록 보강했다.

## 검증

- `cd frontend ; npx vitest run tests/f1-grid-docs.test.tsx`
- 결과: 1개 파일, 15개 테스트 통과

## 관련 파일

- [frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts](../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts)
- [frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx](../../../frontend/src/pages/f1-grid-docs/components/F1GridPlayground.tsx)
- [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)
- [frontend/tests/f1-grid-docs.test.tsx](../../../frontend/tests/f1-grid-docs.test.tsx)
