# F1Grid 사용자 편집 anchor 상세 사양

## 계약

- 최초부터 사용자 편집인 셀도 DOM 연결 후 현재 셀 기준 popup inset을 계산한다. 기존 요청 폭 공식 `max(0, min(320, viewportWidth - cellLeft - 8))`과 선택·오류·키보드 계약은 변경하지 않는다. MUI가 지정하는 실제 inline 폭을 이 공식의 값과 동일하다고 가정하지 않는다.
- callback ref에서 user editing일 때만 `HTMLElement | null` state를 게시한다. 비사용자/비편집 셀의 DOM 연결은 기존 등록 호출만 수행한다.
- ref detach도 기존 `onCellRef(null)`을 호출한다. user editing ref detach 시 anchor state도 null로 게시한다. 같은 DOM의 재연결은 React state 동등성/배치 규칙을 따른다.
- CellEditor/UserSelectEditor의 props와 구현, outer 이벤트 wrapper와 memo comparator, Row/그리드 등록 로직은 변경하지 않는다.

## 재현과 검증

- 현재 구현은 최초 user editing render에 ref가 null이며 DOM 연결이 재렌더를 일으키지 않아 popup에 셀 inset이 반영되지 않을 수 있다.
- 실제 GridCell + 실제 MUI editor를 mount한 테스트로 viewport 375, 셀 left 100/입력 left 104에서 popup x=100을 확인한다. 측정값만 테스트 fixture에서 제공하며 editor/선택 로직은 mock하지 않는다. jsdom의 MUI inline 폭 0 실패는 위치 결함의 근거로 사용하지 않는다.
- 일반 셀의 추가 mount render를 만들지 않도록 DOM state 게시 조건을 제한한다. 기존 통합/성능 회귀를 함께 확인한다.
- 실제 브라우저 3폭에서는 최초 편집·옵션 선택·재진입과 셀 기준 popup 위치/문서 경계를 확인한다. 합성 사용자 옵션만 사용하며 네트워크/영구 저장소 접근은 차단한다.
- 기존 이벤트 refs 진단 2개를 이번 작업 완료로 계산하지 않는다. 백엔드/API/DB/의존성 변경 없음.
