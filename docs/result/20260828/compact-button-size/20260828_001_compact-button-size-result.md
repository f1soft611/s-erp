# ERP 공통 버튼 크기 축소 결과

## 변경 내용

- 대상: `frontend/src/theme/theme.ts`의 `MuiButton` 공통 스타일
- `paddingTop`: `12px` -> `8px`
- `paddingBottom`: `12px` -> `8px`
- 아이콘 버튼, 메뉴 항목, 버튼 동작 및 기타 테마 값은 변경하지 않음

## 검증 결과

- `npm run test -- tests/theme-settings.test.tsx`: 통과
- `npm run build`: 통과
- 수정 파일 오류 진단: 오류 없음

## 브라우저 확인

로컬 브라우저에서 대시보드 URL을 열었으나 인증 상태가 없어 로그인 화면으로 이동했다. 개발용 로그인 값 입력 후 로그인 요청이 `로그인 중...` 상태로 대기하여 대시보드의 실제 버튼 렌더링 스크린샷은 생성하지 못했다. 테스트와 빌드 검증은 완료했다.
