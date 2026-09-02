# 작업지시서

## 요청

- 메뉴관리 페이지: rowHeight를 compact하게 줄인 이후에도 첫 번째 행 편집 모드에서 셀 border가 이상하게 보인다는 재확인 요청.
- F1 Grid 테스트 페이지: `date`, `time` 타입 컬럼 에디터의 입력 텍스트 수직 정렬이 여전히 어긋나고 border가 이상하게 보인다는 재확인 요청.
- `npm run dev`로 실행한 실제 브라우저에서 화면크기 설정을 "작게"로 지정한 상태로 직접 확인할 것.

## 범위

- 프론트엔드 실브라우저 검증: 로그인 → 메뉴관리 / F1 Grid 테스트 페이지 → 편집 모드 진입 → 스크린샷 비교
- 프론트엔드 코드 수정: `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`, `TimeEditor.tsx`, `DateTimeEditor.tsx`
- 검증: `frontend/tests/f1-grid.test.tsx`

## 완료 기준

- 메뉴관리 페이지 첫 번째 행 편집 셀의 border가 다른 행과 동일하게 정상적으로 보이는지 실브라우저로 확인한다(문제가 재현되지 않으면 재현되지 않음을 근거와 함께 기록한다).
- F1 Grid 테스트 페이지의 `date`/`time` 컬럼 편집 시 입력 텍스트/아이콘이 셀 높이 기준 수직 중앙에 위치하고, border가 다른 셀과 동일하게 단일 outline으로 보인다.
- 관련 Vitest 회귀 테스트가 통과한다.
- 실제 브라우저 스크린샷 근거를 결과 문서에 포함한다.
