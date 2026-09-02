# F1-GRID 에디터 여백/테두리 및 date·time 수직정렬 보정 결과

## 원인 분석

- `GridCell.tsx`가 `editing` 상태에서 `p: 0`을 강제해 에디터가 셀 가장자리에 그대로 붙어 여백이 사라졌다.
- `editing` 상태는 `borderBottom: 1`(회색 divider)과 `outline: 2px solid`(offset -2)가 동시에 그려졌는데, padding이 0이라 두 border가 에디터 콘텐츠 바로 위에 겹쳐 보여 "border 이상" 현상이 발생했다.
- `DateEditor`/`TimeEditor`/`DateTimeEditor`의 `MuiInputBase-input`에 적용한 `display:flex; alignItems:center` 조합은 네이티브 `<input>` 내부 텍스트 렌더링에는 적용되지 않아(브라우저가 form control 내부 레이아웃을 별도로 처리) 실제로는 수직 중앙 정렬이 되지 않았다.

## 변경 내용

- `GridCell.tsx`
  - padding을 `editing` 여부와 무관하게 `column.type === 'checkbox' ? 0.25 : 0.5`로 통일.
  - `activeHighlight`(focused 또는 editing)일 때 grid 회색 border 색상을 `transparent` 처리하여 outline만 보이도록 정리.
  - editing 전용 `borderBottom: 1` 강제 분기를 제거(outline이 편집 셀의 경계를 담당).
- `DateEditor.tsx`, `TimeEditor.tsx`, `DateTimeEditor.tsx`
  - `MuiInputBase-input`의 `display:flex/alignItems/justifyContent/verticalAlign` 제거.
  - `height:'100%'` 대신 `height:'auto'`, `lineHeight:'normal'`로 변경해 부모(`MuiInputBase-root`)의 `display:flex; alignItems:center`가 입력 요소를 실제로 수직 중앙 정렬하도록 수정.

## 영향 파일

- `frontend/src/shared/components/f1-grid/core/GridCell.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateTimeEditor.tsx`
- `frontend/tests/f1-grid.test.tsx` (편집 모드 padding 회귀 테스트 추가)

## 검증

- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- 결과: 1개 파일 통과, 93개 테스트 통과 (신규 회귀 테스트 1건 포함)

> 참고: Vitest는 canvas API 미설치 경고를 출력하지만, 테스트 자체는 정상적으로 통과했다.

## 실제 브라우저 검증

- `frontend/scripts/capture-f1-grid-editor-fix-verify.js` (Playwright)로 로컬 dev 서버(`http://127.0.0.1:4174`)에 로그인 후 `/settings/system/f1-grid-test` 화면에서 직접 편집 모드를 캡처했다.
- 등록일자(date) 컬럼 편집: 텍스트가 셀 높이 기준 수직 중앙에 위치하고, 파란 outline만 깔끔하게 보이며 이중 테두리가 없다. ([스크린샷](screenshots/02_date_editor_zoom.png))
- 작업시각(time) 컬럼 편집: 동일하게 수직 중앙 정렬과 단일 테두리를 확인했다. ([스크린샷](screenshots/02b_time_editor_zoom.png))
- 코드 선택(품목코드) 컬럼 편집: 에디터가 셀 가장자리에 붙지 않고 여백이 유지된다. ([스크린샷](screenshots/03_text_editor_zoom.png))
- 그리드 전체 화면(정상 상태): ([스크린샷](screenshots/01_full_page.png))
