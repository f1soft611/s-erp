# 상세 사양서: 대시보드 트리 반복 렌더링 및 메뉴 텍스트 에디터 높이 보정

## 대시보드 트리

- 선택 메뉴의 상위 항목은 현재 라우트에 맞춰 초기 확장된다.
- 사용자가 트리 항목을 확장하거나 축소하면 TreeView 내부 상태가 이를 유지한다.
- 메뉴 또는 모듈 전환으로 확장 또는 선택 대상이 바뀌면 TreeView는 새 초기 상태로 다시 생성된다.
- `expandedItems`/`selectedItems` 제어 prop과 TreeView 이벤트 기반 state 저장의 순환을 사용하지 않는다.

## F1-Grid 에디터 높이

- `TextEditor`, `NumberEditor`(currency/decimal 포함), `AutocompleteEditor`의 `InputBase`와 내부 `.MuiInputBase-input`은 부모 `GridCell`의 높이를 `100%`로 사용한다.
- `SelectEditor`의 root와 select 표시 영역, `CodePickerEditor`의 button은 셀 콘텐츠 영역 높이를 넘지 않는다.
- 내부 input은 `box-sizing: border-box`, `min-height: 0`, 상하 padding `0`으로 compact row 안에서 수직 중앙 정렬된다.
- 모든 비체크박스 에디터는 셀 외부로 overflow하지 않는다.

## 검증 기준

- 메뉴 전환 및 트리 확장 관련 회귀 테스트가 통과한다.
- 각 비체크박스 타입 셀을 더블클릭한 뒤 렌더러와 내부 input/select/button이 셀 높이를 상속하는지 확인한다.
- 실제 브라우저에서 콘솔 반복 업데이트 오류 없이 대시보드와 메뉴관리 페이지가 렌더링된다.
