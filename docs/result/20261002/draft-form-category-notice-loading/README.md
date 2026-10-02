# 기안양식 분류 안내 초기 노출 보완 결과

## 변경 내용

- 분류 옵션이 성공적으로 조회되기 전에는 빈 분류 안내를 표시하지 않도록 했다.
- 옵션 조회 실패 시 빈 목록으로 간주해 잘못된 분류 안내를 띄우지 않는다.
- 옵션 조회가 성공했고 분류 항목이 없을 때 기존 안내를 표시한다.

## 검증

- `npm --prefix frontend run build`: 통과
- `npm --prefix frontend run test -- tests/draft-form-management.test.tsx`: 신규 초기 노출 회귀 테스트 통과. 전체 파일에서는 `soft-disables a deleted Grid row by saving useAt N` 테스트가 `행 삭제` 메뉴 항목을 찾지 못해 실패했다.
- 수정 파일 진단: 오류 없음
- 브라우저 스크린샷: 미수집. 비동기 노출 조건은 Vitest 화면 테스트로 검증했다.

## 영향 범위

기안양식관리 화면의 분류 미설정 안내 표시 시점만 변경했다. 분류/양식 API 계약과 그리드 저장 동작은 변경하지 않았다.
