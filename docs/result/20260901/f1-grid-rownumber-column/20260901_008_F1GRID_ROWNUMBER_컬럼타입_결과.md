# F1-GRID rownumber 컬럼 타입 결과

## 구현 내용

- `F1GridEditorType`에 `'rownumber'` 추가
- `isCellEditable`에서 `column.type === 'rownumber'`이면 무조건 읽기 전용 처리(편집 시작/Tab 이동/붙여넣기 등 공용 판정 경로에 자동 적용)
- `GridCell`에서 `rownumber` 컬럼은 실제 데이터 대신 `rowIndex + 1`(현재 표시 순서)을 표시, 정렬은 숫자 컬럼과 동일하게 기본 오른쪽 정렬

## 검증 결과

```text
npm run test -- tests/f1-grid.test.tsx
PASS: 1 file, 78 tests
```

## 알려진 제한사항 / 별도 이슈

- `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`에 이전 세션(검색영역 UX 개선) 작업에서 남은 미완료 TypeScript 오류 2건(`InputLabel` 미사용, `selected === ''` 타입 비교)이 있어 `npm run build` 전체 실행이 실패한다. 이번 F1-Grid rownumber 작업과 무관한 파일이며, 그리드 관련 파일은 `get_errors` 진단 결과 오류 없음을 확인했다. 해당 파일은 별도로 수정이 필요하다.
