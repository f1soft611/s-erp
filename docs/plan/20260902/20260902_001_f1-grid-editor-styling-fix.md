# F1 Grid editor styling fix

## 목적

- 메뉴 관리 페이지와 F1 Grid 테스트 페이지에서 동일한 기본 행 높이를 유지한다.
- 편집 중인 셀에서 선택 상태와 동일한 border 표현을 유지한다.
- date/time 컬럼 편집 시 외곽선과 텍스트 정렬이 안정적으로 보이도록 한다.

## 구현 범위

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- 관련 Vitest 회귀 테스트

## 검증 기준

- 기본 rowHeight/row line-height가 화면 간 동일하게 표시된다.
- 편집 중인 date/time 셀에 active focus outline이 유지된다.
- date/time 입력값이 셀 중앙에 배치되고 하단 border가 유지된다.
- 기존 F1 Grid 테스트 파일을 실행하여 회귀가 없음을 확인한다.
