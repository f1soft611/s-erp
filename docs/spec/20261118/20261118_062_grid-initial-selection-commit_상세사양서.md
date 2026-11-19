# 그리드 초기 행 선택 commit 상세 사양

## 계약과 변경

- 기존 [선택 계약](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)을 유지한다. initialSelectedRowIds를 문자열로 정규화해 현재 visibleRowIds 표시 순서로 일치시킨다. multiSelect=false이면 첫 유효 행만 적용한다.
- 기존 `map(String).join('|')` 복원 key를 state로 추적한다. 빈 입력, 같은 key, 현재 유효 ID 없음에는 변경하지 않는다. 유효 ID가 있을 때만 기존 F1GridRowSelection 형태와 key를 같은 render에서 게시해 commit 전에 일치시킨다.
- 같은 key는 사용자 해제 뒤에도 다시 복원하지 않는다. 새로운 key가 적용될 때만 기존 선택을 교체한다. 배열 참조만 바뀐 것은 새로운 복원 요청이 아니다.
- 부분적으로만 보이는 초기 ID, 나중에 유효 행이 생기는 경우와 key 문자열 형식은 기존 정책을 변경하지 않는다. 다른 효과·행 데이터·편집·JSX/CSS·공개 props/ref 타입은 그대로 둔다.

## 검증

- 부모 layout 관찰자가 초기 commit의 ref 선택을 관찰한다. 초기 배열이 역순이어도 표시 순서와 단일/다중 제한을 사용한다.
- 기존 구현의 빈 선택 첫 commit을 두 parameter 회귀에서 RED로 확인한다. 사용자 실제 checkbox 해제 후 같은 ID 배열 render에 복원되지 않고 새 key에는 복원되는지 확인한다.
- 실제 브라우저 3폭은 합성 행의 실제 Grid/checkbox를 사용한다. API나 실제 테넌트 데이터/저장은 사용하지 않는다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 잔여 79개는 계획 수치이며 검증 전에 완료로 표시하지 않는다.
