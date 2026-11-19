# 그리드 선택 모드 전환 상세 사양

## 계약

- [F1-GRID 선택 모드](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)의 `selectionMode` 기본 cell/선택·복사 단위와 기존 전환 시 범위 초기화를 유지한다.
- 모드 변경을 감지하는 state guard가 이전 셀 선택·복사 범위·드래그 여부와 남아 있는 기하 overlay를 commit 전에 비운다. 각 변경에 한 번만 실행하며 ref를 render에서 읽거나 수정하지 않는다.
- 같은 모드 render와 셀 선택/복사/편집 이벤트에는 guard가 실행되지 않는다. 행 선택·포커스·편집값·Grid 변경 데이터는 유지한다.
- 기존 effect의 cellSelectionRef/copiedCellRangeRef/cellRangeDragRef/dragSelectionStateRef 초기화 순서를 유지한다. 비동기 포인터 frame과 기하 측정/scroll 처리, data source와 worker 등 다른 effect는 이번 범위가 아니다.

## 검증

- 실제 Grid에 범위를 만든 후 같은 모드 부모 render의 layout 관찰자는 overlay를 관찰한다. row 전환과 cell 재진입의 layout 관찰자는 overlay를 관찰하지 않는다.
- drag/copy 두 경우를 기존 테스트 파일에서 확인한다. 기존 구현이 전환 첫 commit에 overlay를 노출하는 실제 RED를 기록한다.
- 같은 회귀에서 편집 변경과 행 checkbox 선택 보존을 확인한다. 외부 loading reset 등 기존 회귀는 그대로 유지한다.
- 브라우저는 실제 Grid와 합성 행으로 375/768/1280px native 범위를 만든 뒤 모드 전환/재진입·행 선택을 확인한다. OS clipboard나 실제 API/테넌트 데이터를 사용하지 않는다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다. 80개는 목표 잔여 수치이며 검증 전 완료 수치로 간주하지 않는다.
