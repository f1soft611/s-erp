# 그리드 빈 범위 표시 초기화 상세 사양

## 계약과 변경

- Escape의 기존 셀/복사 범위 해제와 행 선택·편집 데이터 보존을 유지한다.
- 셀 선택과 복사 범위가 모두 없고 rangeOverlay만 남아 있으면 같은 컴포넌트의 bounded render reset으로 null을 게시한 뒤 commit한다. ref를 render에서 읽거나 수정하지 않는다.
- 기존 effect의 범위 부재 분기는 setter 없이 return한다. 유효 범위·단일 셀·유효하지 않은 row ID/DOM·scroll/resize의 기하 측정 경로는 그대로 둔다. 이벤트나 frame 취소 동작도 변경하지 않는다.

## 검증

- 실제 React Profiler onRender로 각 Grid commit 직후 DOM을 관찰한다. drag/copy 범위를 만든 뒤 Escape 첫 commit에 overlay가 없고 후속 commit에도 없어야 한다. 최종 DOM만 확인하지 않는다.
- 실제 RED는 첫 commit의 이전 drag/copy overlay 노출이다. 같은 회귀에서 행 선택/변경 데이터가 유지되고 새 범위도 생성되는지 확인한다.
- 브라우저 3폭은 실제 Grid/Profiler와 native pointer/키보드 Escape를 사용한다. copy 범위는 단위 회귀로 확인하고 OS clipboard는 사용하지 않는다.
- backend/API/DB/의존성 변경 없음. DB MCP·스키마 스크립트 대상이 아니다.
- Oxc 검증에서 기존 범위 부재 setter 대신 동일 effect의 기존 `updateRangeOverlay()` 호출 진단이 드러났다. 잔여는 78개 예상과 달리 79개이며, DOM 측정 경로는 이번 범위에서 변경하지 않는다. 진단 수뿐 아니라 label의 소스 위치도 대조한다.
