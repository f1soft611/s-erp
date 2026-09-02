# 계획서: F1-GRID date/time 에디터 여백·수직정렬·border 재확인 및 보정

## 배경

- 이전 작업(`20260902_003_f1-grid-editor-padding-border-fix`)에서 GridCell padding/outline을 보정했으나, 사용자가 메뉴관리 첫 번째 행 border 이상 및 F1 Grid 테스트 페이지의 date/time 에디터 수직정렬/border 이상을 다시 리포트함.
- 실제 `npm run dev` 브라우저(화면크기 설정 "작게")로 직접 재현을 시도해 원인을 확정한다.

## 조사 결과

1. 메뉴관리 페이지는 date/time 타입 컬럼이 없고, 텍스트/체크박스 컬럼은 `InputBase` 기반 에디터(`TextEditor`, `NumberEditor` 등)를 사용한다. 실제 브라우저에서 첫 번째 행 편집 셀을 확대 캡처한 결과 border가 헤더와 정확히 맞닿아 있고 이중 테두리가 없음을 확인했다(재현 실패).
2. F1 Grid 테스트 페이지의 `date`(`DateEditor`), `time`(`TimeEditor`), `datetime`(`DateTimeEditor`) 컬럼은 공통적으로 MUI `TextField`를 사용한다. 테마 설정(`frontend/src/theme/theme.ts`)에 `MuiTextField` 기본 `margin: 'normal'`이 전역 적용되어 있어, 각 에디터가 `margin` prop을 명시하지 않으면 `MuiFormControl-marginNormal` 클래스가 자동 적용된다.
3. 이 마진(top 16px/bottom 8px 비대칭)이 그리드 셀(28~32px 높이) 내부에서 에디터를 아래로 밀어내며 셀 하단에 치우치게 만들어, 수직 중앙 정렬이 깨지고 시각적으로 border 아래쪽에 빈 공간이 생겨 "border 이상"으로 보이는 현상의 원인임을 실측(`getBoundingClientRect`, `getComputedStyle`)으로 확인했다.

## 구현 단위

1. `DateEditor.tsx`, `TimeEditor.tsx`, `DateTimeEditor.tsx`의 `TextField`(및 `DateTimePicker`의 `slotProps.textField`)에 `margin="none"`을 명시해 테마 기본값을 무효화한다.
2. 회귀 테스트(`frontend/tests/f1-grid.test.tsx`)와 실브라우저 스크린샷으로 수정 전/후 비교 검증한다.
3. 메뉴관리 첫 번째 행 관련해서는 재현되지 않음을 스크린샷 근거로 결과 문서에 기록한다.

## 검증 계획

- `cd frontend && npm run test -- tests/f1-grid.test.tsx`
- Playwright 스크립트로 `http://127.0.0.1:4175`(dev 서버, 화면크기 "작게")에 접속해 F1 Grid 테스트 페이지의 date/time 편집 스크린샷과 메뉴관리 첫 번째 행 편집 스크린샷을 각각 확보한다.
