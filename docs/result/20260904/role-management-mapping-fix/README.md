# 권한별 사용자 매핑 수정 결과

## 작업 내용

- PostgreSQL 역할-사용자 매핑 조회/삭제 SQL에서 `login_id`를 `BIGINT`로 명시적으로 캐스팅해 `varchar`-`bigint` 비교 오류를 제거했다.
- 역할 사용자 매핑 API에서 예외 메시지를 사용자 친화적인 문구로 변환해 화면에 그대로 노출될 수 있게 했다.
- 권한별 사용자 매핑 그리드의 우클릭 메뉴에서 일반 `행 추가` 항목을 제거해 매핑 전용 체크박스 흐름만 유지했다.

## 원인

- 역할 매핑 조회 시 `lar.login_id`는 `bigint` 컬럼인데, `#{loginId}`를 문자열로 비교하면서 PostgreSQL에서 타입 변환 오류가 발생했다.
- 그리드 공용 컨텍스트 메뉴가 사용자 매핑용 그리드에도 동일하게 노출되면서 불필요한 `행 추가`가 나타났다.

## 검증

- 프론트엔드: `cd frontend && npm run test -- tests/role-management-notification.test.tsx`
- 백엔드: `cd backend && mvn test -Dtest=SystemRoleUserMappingApiControllerTest`

둘 다 통과했고, 매핑 저장 오류 처리와 매핑 그리드 메뉴 규칙이 기대대로 동작함을 확인했다.
