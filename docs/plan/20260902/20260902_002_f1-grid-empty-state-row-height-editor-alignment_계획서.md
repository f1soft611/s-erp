# 계획서: F1-GRID 빈 데이터, 컴팩트 행 높이, 에디터 정렬 보정

## 목표

- 빈 행 데이터가 있을 때 그리드에 `데이터가 없습니다` 상태를 노출한다.
- 기본 행 높이를 더 컴팩트하게 조정하되, 편집 상태와 셀 선택 상태의 테두리를 깨지 않게 유지한다.
- `date`/`time` 타입 에디터 입력값의 세로 정렬 문제를 해결한다.

## 작업 단위

1. `F1Grid` 루트에서 `visibleRows.length === 0` 조건에 대한 빈 상태 렌더링 추가
2. 기본 `rowHeight` 값을 compact 기준으로 조정하고, `GridCell`/`GridRow`의 테두리/아웃라인 로직 점검
3. `DateEditor`, `TimeEditor`, `DateTimeEditor`의 MUI 입력 래퍼 정렬 스타일 수정
4. 회귀 확인용 Vitest 케이스 추가 및 검증
