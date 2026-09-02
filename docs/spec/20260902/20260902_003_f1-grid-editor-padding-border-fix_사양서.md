# 상세 사양서: F1-GRID 에디터 여백/테두리 및 date·time 수직정렬 보정

## 화면 동작

- 셀이 편집 모드로 전환되어도 padding은 일반 셀과 동일하게 유지된다 (텍스트/숫자 셀: `theme.spacing(0.5)`, checkbox 셀: `theme.spacing(0.25)`).
- 포커스/편집 중인 셀은 `outline: 2px solid` (primary 색상)만 보이고, 기존 회색 grid border는 해당 셀에서 투명하게 처리되어 이중 테두리가 나타나지 않는다.
- 편집을 종료하면 다시 기존 grid border(divider 색상)가 정상적으로 보인다.
- `date`, `time` 타입 에디터의 입력 텍스트는 셀 높이 기준 수직 중앙에 위치한다 (row height를 줄인 compact 상태 포함).

## 상세 변경 사항

### GridCell.tsx

- `sx.p`: `editing` 조건 제거, `column.type === 'checkbox' ? 0.25 : 0.5` 로 통일.
- `activeHighlight`가 true인 셀은 `borderLeftColor`/`borderColor`를 `transparent`로 처리(기존 `hideRangeStartBorder` 처리 방식과 동일한 패턴 적용).
- `borderBottom`에서 `editing ? 1` 분기를 제거하고 `isLastRow ? 1 : merged ? 0 : undefined` 로 단순화한다(outline이 편집 셀의 시각적 경계를 담당).

### DateEditor.tsx / TimeEditor.tsx / DateTimeEditor.tsx

- `MuiInputBase-input`에서 `display:flex/alignItems/justifyContent` 조합 제거.
- 대신 `height: '100%'`를 제거하고 `line-height`를 셀 컨텐츠 높이에 맞춰 `normal`로 두어, 부모(`MuiInputBase-root`, flex + `align-items:center`)가 자연스럽게 입력 요소를 수직 중앙 정렬하도록 한다.
- `MuiInputBase-root`는 기존 `display:flex; alignItems:center` 유지.

## 검증 기준

- `npm run test -- tests/f1-grid.test.tsx` 전체 통과.
- `date`/`time` 셀 편집 진입 시 `outline: 2px solid` 스타일이 유지된다 (기존 회귀 테스트 `keeps the active edit border visible for date and time editors`).
- 편집 모드 셀의 padding이 0이 아님을 확인하는 회귀 테스트 추가.
