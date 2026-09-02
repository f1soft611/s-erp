# 계획서: F1-GRID 에디터 여백/테두리 및 date·time 수직정렬 보정

## 배경

- `20260902_002` 작업에서 compact row height와 editor border를 보정했으나, 편집 모드에서 여전히 다음 문제가 남아있다.
  1. `GridCell`에서 `editing` 상태일 때 padding을 0으로 강제하여 에디터가 셀 가장자리에 붙는다.
  2. `editing`/`focused` 상태에서 `outline(2px, offset -2)`과 grid 구분용 회색 `border`가 동시에 그려져 border가 겹쳐 보인다.
  3. `DateEditor`/`TimeEditor`/`DateTimeEditor`의 input에 `display:flex` 기반 정렬을 적용했지만, 네이티브 `<input>` 내부 텍스트 정렬에는 실질적으로 적용되지 않아 수직 중앙정렬이 되지 않는다.

## 구현 단위

1. **GridCell 여백 복구**: `editing` 여부와 무관하게 기존 padding(0.5 / checkbox 0.25)을 적용한다.
2. **GridCell 테두리 정리**: `activeHighlight`(focused 또는 editing)일 때는 회색 grid border 색상을 투명 처리하여 outline만 보이도록 하고, editing 전용으로 강제하던 `borderBottom: 1`을 제거해 outline과 중복되지 않게 한다.
3. **날짜/시간 에디터 수직정렬**: `MuiInputBase-input`에 대한 `display:flex` 기반 정렬 대신, 실제로 텍스트 렌더링에 반영되는 `line-height`/`padding` 조합으로 수직 중앙 정렬을 적용한다.

## 검증 계획

- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
