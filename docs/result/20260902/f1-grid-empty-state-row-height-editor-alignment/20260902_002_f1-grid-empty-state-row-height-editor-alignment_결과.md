# F1-GRID 빈 데이터, 컴팩트 행 높이, 에디터 정렬 보정 결과

## 변경 내용

- `F1Grid`에서 `visibleRows.length === 0` 일 때 `데이터가 없습니다` 메시지를 표시하도록 수정했다.
- 기본 `rowHeight`를 더 compact한 값으로 조정했다.
- 활성 셀/편집 셀 테두리는 2px solid primary outline을 유지하고, 선택 범위 오버레이와는 별도 계층으로 동작하도록 보정했다.
- `date`, `time`, `datetime` 에디터 입력 영역의 텍스트 정렬을 가운데 정렬로 보정했다.

## 영향 파일

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridBody.tsx`
- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateTimeEditor.tsx`
- `frontend/tests/f1-grid.test.tsx`

## 검증

- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- 결과: 1개 파일 통과, 92개 테스트 통과

> 참고: Vitest는 canvas API 미설치 경고를 출력하지만, 테스트 자체는 정상적으로 통과했다.
