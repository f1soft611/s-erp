# F1Grid 로컬 레이아웃 callback 의존성 상세사양서

[작업지시서](../../directions/20261118/20261118_040_grid-layout-deps_작업지시서.md)와 [계획](../../plan/20261118/20261118_040_grid-layout-deps_계획서.md)에 따른 의존성 정합성 변경이다. 공개 props/ref API, 편집·선택/복사·가상화 옵션, 행 높이 계산, 표시 CSS/DOM은 변경하지 않는다.

| 조건 | 기대 동작 |
|---|---|
| drag 중 같은 rows + 가시 컬럼 1→2 | window pointer handler는 현재 길이 2를 사용; 경계 fallback이 새 두 번째 셀까지 범위를 확장 |
| 같은 가시 컬럼 수/행의 부모 재렌더 | pending pointer RAF가 불필요하게 취소되지 않음 |
| rowKey/visibleRows/rowIndexById 변경 | 기존처럼 최신 hit-test closure와 listener lifecycle 사용 |
| 범위/행 맵 변경, scroll/resize | 기존 overlay 측정/동일 geometry state 재사용/scroll 좌표 계산 유지 |
| rowHeights 변경 | 이미 파생 Map으로 관찰하던 가상화 계산을 직접 의존성으로도 명시; 계산식은 동일 |

hit-test helper는 events/effect에서만 ref/DOM을 읽는다. 새 memoization은 render에서 helper를 실행하거나 ref를 읽지 않는다. 불필요한 callback prop capture, rule disable, 요청·저장·선택 계약 변경은 금지한다.

TDD는 기존 테스트와 같은 DOM rect/hit-test 재현으로 실제 window handler와 RAF를 확인한다. 실제 브라우저는 실제 F1Grid/테마의 3폭·native pointer/키보드/scroll/높이 동작을 검증한다. 브라우저가 자동으로 같은 합성 hit-test 실패를 재현했다고 주장하지 않는다.

운영 데이터/API/DB 계약은 변경하지 않아 DB MCP·SQL 대상이 아니다. 데이터 source 요청 effect와 기존 동기식 state effect는 별도 잔여 항목이다.
