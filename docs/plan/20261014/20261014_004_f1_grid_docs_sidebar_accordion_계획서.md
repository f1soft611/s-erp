# F1-Grid 문서 사이드 메뉴 아코디언 계획서

## 목표

기존 12개 기능 그룹과 검색을 보존하면서, 기본 사이드 메뉴에서 현재 선택 문서의 그룹 하나만 펼쳐 보인다.

## 구현 원칙

- 선택된 문서의 `group`을 펼친 그룹의 단일 기준으로 사용하고 별도 확장 상태는 추가하지 않는다.
- 그룹 제목을 누르면 해당 그룹의 첫 문서를 선택한다.
- 검색 상태에서는 필터 결과가 있는 모든 그룹 및 문서를 계속 표시한다.
- 기존 문서 메뉴/검색/API 이동, 테마와 반응형 레이아웃을 유지한다.

## 작업 순서

1. [20261014_004_f1_grid_docs_sidebar_accordion_작업지시서.md](../../directions/20261014/20261014_004_f1_grid_docs_sidebar_accordion_작업지시서.md)와 [상세 사양서](../../spec/20261014/20261014_004_f1_grid_docs_sidebar_accordion_상세사양서.md)에 따라 메뉴 동작을 확인한다.
2. [F1GridDocsPage.tsx](../../../frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx)의 기존 탐색 테스트에 초기 그룹, 그룹 이동, 단일 펼침, 검색 중 전체 결과 표시 테스트를 추가해 동작 요구를 고정한다.
3. 해당 테스트를 먼저 실행해 새 아코디언 요구에서 실패하는지 확인한다.
4. 문서 그룹 반복 렌더링을 검색 모드와 일반 모드로 분리해 일반 모드의 그룹 제목 버튼, 현재 그룹 문서만 표시 및 그룹 첫 문서 이동을 구현한다.
5. [F1GridDocsPage.css](../../../frontend/src/pages/f1-grid-docs/F1GridDocsPage.css)에서 그룹 제목 버튼의 시각적 계층, 상호작용 상태 및 좁은 화면 스타일을 기존 메뉴와 조화시킨다.
6. [F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)에 접이식 탐색과 검색 중 표시 규칙을 기록한다.
7. 관련 테스트와 `npm run build`를 실행하고 1280px/375px 실제 브라우저에서 탐색·검색·가로 넘침을 확인한다.
8. 결과 문서와 필요한 스크린샷을 `docs/result/20261014/f1-grid-docs-overhaul`에 기록한다.

## 변경 파일

- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.tsx`
- `frontend/src/pages/f1-grid-docs/F1GridDocsPage.css`
- `frontend/tests/f1-grid-docs.test.tsx`
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- `docs/result/20261014/f1-grid-docs-overhaul/20261014_004_f1_grid_docs_sidebar_accordion_작업결과.md`
- `docs/result/20261014/f1-grid-docs-overhaul/screenshots/`
