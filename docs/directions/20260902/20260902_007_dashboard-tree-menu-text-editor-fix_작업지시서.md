# 작업지시서: 대시보드 트리 반복 렌더링 및 메뉴 텍스트 에디터 높이 보정

## 요청

- 대시보드에서 `TreeItemProvider`의 `Maximum update depth exceeded` 오류로 화면 렌더링이 중단되는 문제를 수정한다.
- 메뉴관리 F1-Tree의 일반 텍스트 셀 편집 시 `TextEditor`가 compact 행 높이를 채우지 않아 하단 border와 어긋나는 문제를 수정한다.
- `number`, `currency`, `decimal`, `autocomplete`, `select`, `code` 타입도 compact 행에서 에디터가 셀 콘텐츠 영역을 벗어나지 않는지 점검하고, 같은 누락이 있으면 보정한다.

## 범위

- 프론트엔드: `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`
- 프론트엔드: `frontend/src/shared/components/f1-grid/editing/TextEditor.tsx`
- 프론트엔드: `frontend/src/shared/components/f1-grid/editing/` 하위 비체크박스 에디터
- 검증: `frontend/tests/dashboard-sidebar.test.tsx`, `frontend/tests/f1-grid.test.tsx`, 실제 브라우저

## 완료 기준

- 대시보드 트리의 확장/메뉴 선택이 동작하며 반복 업데이트 오류가 발생하지 않는다.
- 메뉴관리 일반 텍스트 에디터가 편집 셀의 전체 높이를 사용하고 셀 하단 border를 넘지 않는다.
- 모든 비체크박스 F1-Grid 에디터가 compact 행의 셀 콘텐츠 영역 높이를 넘지 않는다.
- 관련 Vitest 및 프론트엔드 빌드가 통과한다.
