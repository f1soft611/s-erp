# 계획서: 대시보드 트리 반복 렌더링 및 메뉴 텍스트 에디터 높이 보정

## 원인 가설

- `DashboardMenuTree`가 `expandedItems`를 제어 prop으로 전달하고 `onExpandedItemsChange`에서 받은 새 배열을 매번 state에 저장한다. MUI TreeView 내부 상태 갱신이 같은 제어 상태를 다시 갱신하면서 `TreeItemProvider`의 반복 렌더링을 유발한다.
- `TextEditor`의 `InputBase`는 폭만 `100%`이며 높이와 내부 input의 box sizing/수직 정렬이 지정되지 않아 compact row에서 콘텐츠 높이만 사용한다.

## 구현 단위

1. `DashboardMenuTree`의 확장 및 선택 상태를 라우트 경로 기반 key와 `defaultExpandedItems`/`defaultSelectedItems`로 초기화하는 비제어 상태로 바꿔 TreeView 내부 상태와 React 제어 prop의 순환을 제거한다.
2. `TextEditor`와 같은 `InputBase` 기반의 `NumberEditor`/`AutocompleteEditor`, `SelectEditor`, `CodePickerEditor`에 셀 높이 상속과 내부 컨트롤의 높이 제약을 적용한다. `CurrencyEditor`/`DecimalEditor`는 `NumberEditor`를 재사용하므로 별도 수정하지 않는다.
3. 대시보드 메뉴 전환과 모든 비체크박스 편집기의 높이 스타일을 회귀 테스트로 고정한다.

## 검증 계획

- `cd frontend && npm run test -- tests/dashboard-sidebar.test.tsx tests/f1-grid.test.tsx`
- `cd frontend && npm run build`
- 로그인 후 대시보드 트리 및 메뉴관리 편집 셀을 실제 브라우저에서 확인한다.
