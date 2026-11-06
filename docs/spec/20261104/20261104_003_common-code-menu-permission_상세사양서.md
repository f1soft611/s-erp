# 공통코드 메뉴별 기능 권한 상세 사양서

근거: [계획서](../../plan/20261104/20261104_003_common-code-menu-permission_계획서.md).

## 대상과 판정

대상 API 접두사는 `/api/v1/co/master/common-code`이며 권한 메뉴는 `/co` 모듈 아래 `common-code` 또는 기존 `cmncodes` 페이지 키이다.

| API | 필요한 기능 권한 |
| --- | --- |
| POST `/save-batch` | CREATE 또는 UPDATE |
| POST `/save-batch`에 그룹/상세 삭제 행 포함 | 위 쓰기 권한 및 DELETE |
| POST `/groups`, POST `/groups/{groupId}/items` | CREATE 또는 UPDATE |
| PUT `/groups/{groupId}`, PUT `/groups/{groupId}/items/{itemId}` | CREATE 또는 UPDATE |
| DELETE `/groups/{groupId}`, DELETE `/groups/{groupId}/items/{itemId}` | DELETE |

- `SystemMenuService.getMyMenuTree(tenantId, id, roleId, roleCode)`의 기존 로그인 사용자 권한그룹 합산 결과를 재사용한다.
- `/co` 모듈 아래 `common-code`/`cmncodes` 메뉴의 권한만 인정한다. 프론트엔드 DashboardContent가 동일 화면으로 처리하는 두 페이지 키와 일치시킨다. 다른 모듈/다른 메뉴의 쓰기 권한은 인정하지 않는다.
- 관리자 역할명, 계정 종류 또는 별도 관리자 검사를 인가 조건으로 사용하지 않는다. 관리자도 메뉴 권한이 없으면 거부한다.
- CREATE와 UPDATE는 기존 화면의 “쓰기/저장” 권한과 동일하게 OR로 처리한다.
- 삭제 행은 `groups.deletedRows`와 `items.deletedRows` 양쪽에서 검사하며 서비스 호출 전에 전체 요청을 거부한다.
- null 변경 세트는 기존 서비스처럼 빈 세트로 취급한다.
- 인증 사용자가 없거나 tenantId가 없거나 양수가 아니면 401, 기능 권한이 없으면 기존 AUTH_ERROR 메시지와 403을 반환한다.
- 서비스에는 인증된 tenantId만 전달한다. 요청의 tenantId로 범위를 바꾸지 않는다.

## 유지 범위

- 조회 API, UI, F1Grid, 데이터 형식, 정상/유효성 오류 응답, 테넌트 분리 및 서비스 트랜잭션은 그대로 유지한다.
- DB 스키마와 SQL은 변경하지 않는다.

## 회귀 검증

- 일반 사용자의 CREATE 단독/UPDATE 단독 권한으로 일괄 저장과 단건 등록·수정이 성공한다.
- READ만 보유하거나 메뉴 권한이 없는 경우 관리자라도 변경 요청이 거부된다.
- 다른 메뉴/모듈의 권한으로 저장할 수 없다.
- DELETE 미보유 시 단건 삭제 및 그룹/상세 일괄 삭제가 거부된다.
- 쓰기와 DELETE를 보유하면 삭제 포함 일괄 저장이 성공한다.
- 인증 및 테넌트가 잘못되면 메뉴/업무 서비스를 호출하지 않는다.
- 기존 중복 코드/상위 코드 검증 응답이 유지된다.
- 현재 DB 경로인 `common-code`와 기존 `cmncodes` 모두 CREATE 단독/UPDATE 단독으로 저장할 수 있고, 조회 전용과 다른 모듈 권한은 양쪽 모두 거부된다.
