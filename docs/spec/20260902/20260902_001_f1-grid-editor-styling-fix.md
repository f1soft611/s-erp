# F1 Grid editor styling fix 사양

## 문제 요약

1. 메뉴 관리 페이지와 F1 Grid 테스트 페이지가 동일한 컴포넌트를 사용하지만 기본 row height 값이 달라 셀 높이가 다르게 보인다.
2. 편집 모드에서 선택 상태와 다른 border 스타일이 적용되어 bottom border가 사라진다.
3. date/time 컬럼 편집 시 입력 영역의 border가 사라지고 텍스트가 아래로 쏠리는 현상이 발생한다.

## 요구사항

- 기본 `F1Grid` row height는 ERP 기본 라인 높이로 통일한다.
- 편집 중인 셀은 focus outline을 유지하고 bottom border가 보이도록 스타일을 정렬한다.
- date/time editor는 셀 영역에 맞게 수직 중앙 정렬되며 입력값이 셀 상단으로 밀리지 않도록 처리한다.
- 기존 기능과 테스트를 유지하면서 입력/선택 상태의 시각적 일관성을 확보한다.

## 수용 기준

- `F1Grid` 사용 시 기본 rowHeight가 40px 또는 동일 기준으로 렌더링된다.
- date/time 편집 화면에서 cell selection outline이 보이며 하단 경계선이 유지된다.
- input text는 셀 중앙에 위치하고 줄 정렬이 안정적이다.
- `npx vitest run tests/f1-grid.test.tsx` 성공 기준을 만족한다.
