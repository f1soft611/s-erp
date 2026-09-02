# F1-GRID date/time 에디터 margin 보정 결과

## 원인

- `frontend/src/theme/theme.ts`의 `MuiTextField.defaultProps`가 전역적으로 `margin: 'normal'`을 지정한다.
- `DateEditor`, `TimeEditor`, `DateTimeEditor`는 MUI `TextField`(`DateTimePicker`는 `slotProps.textField`)를 사용하면서 `margin` prop을 명시하지 않아 테마 기본값(`MuiFormControl-marginNormal`, 상단 16px/하단 8px 비대칭 margin)이 그대로 적용되었다.
- 그리드 셀 높이(약 28~32px)에 비해 이 마진이 커서 에디터가 셀 하단으로 밀려 수직 중앙 정렬이 깨지고, outline(border) 아래에 빈 공간이 남아 "border 이상"으로 보였다.
- 반면 메뉴관리 페이지는 date/time 컬럼이 없고 텍스트/체크박스 컬럼은 모두 `InputBase` 기반 에디터(`TextEditor`, `NumberEditor`)를 사용해 이 문제와 무관하다. 실제 브라우저(화면크기 "작게")에서 메뉴관리 첫 번째 행의 `메뉴코드`, `메뉴명` 컬럼을 편집 모드로 확대 캡처한 결과 헤더와 border가 정확히 맞닿아 있고 이중 테두리가 없어 **재현되지 않음**을 확인했다.

## 변경 내용

- `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`: `TextField`에 `margin="none"` 추가.
- `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`: `TextField`에 `margin="none"` 추가.
- `frontend/src/shared/components/f1-grid/editing/DateTimeEditor.tsx`: `DateTimePicker`의 `slotProps.textField`에 `margin: 'none'` 추가.
- `frontend/tests/f1-grid.test.tsx`: date/time 에디터가 `MuiFormControl-marginNormal` 클래스를 갖지 않는지 확인하는 회귀 테스트 추가.

## 영향 파일

- `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/TimeEditor.tsx`
- `frontend/src/shared/components/f1-grid/editing/DateTimeEditor.tsx`
- `frontend/tests/f1-grid.test.tsx`

## 검증

- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- 결과: 1개 파일 통과, 95개 테스트 통과(신규 회귀 테스트 1건 포함)

## 실제 브라우저 검증 (npm run dev, http://127.0.0.1:4175, 화면크기 설정 "작게")

수정 전 실측(`getBoundingClientRect`/`getComputedStyle`):

| 항목   | 셀(cell) | 에디터(FormControl)                |
| ------ | -------- | ---------------------------------- |
| top    | 615.2    | 624.2                              |
| bottom | 644.0    | 644.0                              |
| height | 28.8     | 19.8                               |
| class  | -        | `MuiFormControl-marginNormal` 포함 |

→ 에디터가 셀 하단에 딱 붙어 정렬되고, 상단에 빈 공간이 남는 현상 확인.

수정 후 실측:

| 항목   | 셀(cell) | 에디터(FormControl)        |
| ------ | -------- | -------------------------- |
| top    | 615.2    | 620.2                      |
| bottom | 644.0    | 640.0                      |
| height | 28.8     | 19.8                       |
| class  | -        | `marginNormal` 클래스 없음 |

→ 상/하 여백이 각각 약 5px/4px로 대칭에 가까워져 수직 중앙 정렬됨.

- 등록일자(date) 컬럼 편집: 텍스트와 달력 아이콘이 셀 높이 기준 수직 중앙에 위치하고, 단일 파란 outline만 보인다. ([스크린샷](screenshots/11_date_editor.png))
- 작업시각(time) 컬럼 편집: 동일하게 수직 중앙 정렬과 단일 테두리를 확인했다. ([스크린샷](screenshots/12_time_editor.png))
- F1 Grid 테스트 페이지 전체 화면: ([스크린샷](screenshots/10_f1_grid_test_full.png))
- 메뉴관리 페이지 전체 화면(정상 상태): ([스크린샷](screenshots/01_menu_management_full.png))
- 메뉴관리 첫 번째 행 편집 확대(재현되지 않음, 정상): ([스크린샷](screenshots/02_row0_editor_zoom.png))

## 결론

- 사용자가 리포트한 F1 Grid 테스트 페이지의 date/time 에디터 수직정렬/border 이상은 테마 전역 `MuiTextField margin: 'normal'` 설정이 원인이었으며, 각 에디터에 `margin="none"`을 명시해 해결했다.
- 메뉴관리 페이지 첫 번째 행 편집 border 이상은 실제 브라우저 재현 시도에서 확인되지 않았다. 해당 페이지는 date/time 컬럼이 없고 텍스트 컬럼이 `InputBase` 기반이라 이번에 발견된 원인과 무관하며, 스크린샷상 border도 정상으로 나타난다.
