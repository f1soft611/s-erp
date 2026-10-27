# F1-Grid 셀 범위 초기화 및 드래그 성능 상세사양서

- 작업지시서: [019](../../directions/20261027/20261027_019_f1grid-range-reset-and-drag-performance_작업지시서.md)
- 계획서: [019](../../plan/20261027/20261027_019_f1grid-range-reset-and-drag-performance_계획서.md)

## 동작 계약

1. Grid가 비로딩 상태에서 외부 `loading`, 내부 query 또는 data-source loading 상태로 진입하면 셀 범위 드래그와 복사 범위를 초기화한다.
2. 위 초기화는 데이터 행 checkbox 선택, 기존 데이터 및 편집 값을 변경하지 않는다.
3. pointer-up은 진행 중 드래그만 종료하고, 완료된 셀 범위 선택은 기존 Escape/명시적 해제 정책을 유지한다.
4. 포인터 hit 테스트와 선택 오버레이 계산은 기존 `rowIndexById` 맵으로 행을 찾는다. 전체 `visibleRows` 선형 탐색을 포인터 이벤트마다 반복하지 않는다.
5. 기존 경계 근처의 다음 행/열 이동, 가상 행, pinned 열, overlay 위치와 일반 셀 선택 동작은 유지한다.

## 회귀 검증

- 드래그 범위가 표시된 상태에서 `loading`을 켜면 drag overlay와 선택 범위가 사라지고 행 선택은 유지된다.
- 복사 범위 표시도 로딩 시 해제되며, 진행 중 RAF/pointer 드래그는 이후 범위를 다시 만들지 않는다.
- 10,000행에서 멀리 떨어진 셀로 pointer 이동 시 row ID 조회 횟수가 행 수에 비례해 증가하지 않는다.
- 인접 셀/경계 드래그, 스크롤 중 드래그, 가상화 및 overlay 좌표 회귀가 통과한다.
- Chromium 브라우저 375/768/1280px와 결과 스크린샷을 확인한다.
- 프론트엔드 빌드/lint를 수행한다. 백엔드/API/DB 변경은 없다.
