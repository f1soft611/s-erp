# 상세 사양서: F1-GRID date/time 에디터 margin 보정

## 원인

- `frontend/src/theme/theme.ts`의 `MuiTextField.defaultProps`가 `margin: 'normal'`을 전역 지정한다.
- `DateEditor`, `TimeEditor`, `DateTimeEditor`는 내부적으로 MUI `TextField`(`DateTimePicker`는 `slotProps.textField`를 통해 `TextField`)를 사용하면서 `margin` prop을 지정하지 않아 테마 기본값이 그대로 적용되어 `MuiFormControl-marginNormal`(상단 16px/하단 8px 비대�칭 margin)이 붙는다.
- 그리드 셀은 28~32px 내외의 낮은 높이인데, 이 비대칭 margin이 에디터를 셀 하단으로 밀어내 수직 중앙 정렬이 깨지고, 결과적으로 outline(border) 아래에 여백이 남아 "border 이상"으로 보인다.
- 텍스트/숫자 등 `InputBase` 기반 에디터(`TextEditor`, `NumberEditor` 등)는 `TextField`를 쓰지 않으므로 이 문제와 무관하다. 메뉴관리 페이지는 date/time 컬럼이 없고 텍스트 컬럼이 모두 `InputBase` 기반이라, 실측 결과 첫 번째 행 편집 셀 border 이상은 재현되지 않았다.

## 변경 내용

- `DateEditor.tsx`: `TextField`에 `margin="none"` 추가.
- `TimeEditor.tsx`: `TextField`에 `margin="none"` 추가.
- `DateTimeEditor.tsx`: `DateTimePicker`의 `slotProps.textField`에 `margin: 'none'` 추가.

## 검증 기준

- `npm run test -- tests/f1-grid.test.tsx` 통과(기존 93개 테스트 유지).
- 실브라우저(`npm run dev`, 화면크기 "작게")에서 F1 Grid 테스트 페이지 `등록일자`(date), `작업시각`(time) 컬럼을 편집 모드로 진입했을 때:
  - 입력 텍스트/아이콘이 셀 높이 기준 수직 중앙에 위치한다.
  - 편집 셀 border가 다른 셀과 동일하게 단일 outline으로 보이고 하단에 빈 공간이 남지 않는다.
- 메뉴관리 페이지 첫 번째 행 편집 셀은 스크린샷으로 재현 여부를 확인하고, 재현되지 않으면 그 근거(스크린샷 + 실측값)를 결과 문서에 남긴다.
