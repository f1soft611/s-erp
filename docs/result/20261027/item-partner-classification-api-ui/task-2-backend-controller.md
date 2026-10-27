# Task 2 — 분류 API 경로 및 메뉴 권한

- 기준: `20261027_003` 작업지시서 → 계획서 → 상세사양서와 승인된 Task 2 범위. Task 1 서비스는 변경하지 않았다.
- `/api/v1/co/master/classifications` 아래 품목·거래처의 GET/POST 및 ID별 PUT을 구현했다. GET은 `result.resultList`, 쓰기는 `result.item`, POST는 HTTP 201을 반환한다.
- tenant는 인증 `LoginVO.tenantId`, 감사 사용자는 `uniqId`만 사용한다. 메뉴 조회에는 기존 `/menus/my`와 동일하게 인증 `id`, `roleId`, `roleCode`를 전달한다.
- `SystemMenuService.getMyMenuTree`의 유효 권한을 사용한다. 모듈 경로 첫 세그먼트 `co`, 메뉴 경로 마지막 세그먼트 `materials`/`customers`를 구분한다. GET은 READ/CREATE/UPDATE 중 하나, POST는 CREATE, PUT은 UPDATE가 필요하다. 관리자 역할 우회는 없다.
- 인증 tenant 누락/비정상 값은 401, 권한 부족은 403, 서비스의 대상/부모 404는 그대로 유지한다. 입력 예외 및 잘못된 JSON은 INPUT_CHECK_ERROR(900)/HTTP 400이며 예상 밖 오류는 성공이나 입력 오류로 변환하지 않는다.

## 검증

- TDD: 컨트롤러 미존재 컴파일 실패 후 빈 컨트롤러로 GET/POST/PUT 양 도메인 6건이 경로 미구현 404 때문에 실패하는 것을 확인하고 실제 경로를 구현했다.
- `cd backend; mvn "-Dtest=ClassificationApiControllerTest,ClassificationServiceImplTest,ClassificationMapperTest" test -q`: **58건 통과**, 실패/오류/건너뜀 0건(컨트롤러 26, 서비스 26, 매퍼 6).
- 비관리자 허용, 인증 범위 전달, 업무별·모듈별 권한 격리, 작업별 권한, 입력 400, 대상/부모 404, 인증 401, 예상 밖 오류 전파를 검증했다.
- `git diff --check` 통과.

## DB 및 범위 제한

- 기본 읽기 전용 MCP `s-erp-postgresql-readonly`의 `list_tables` → `describe_table(tb_menu)`를 직접 호출해 테이블 목록과 메뉴 경로 메타데이터를 확인했다. 데이터 행·자격 증명은 조회하지 않았다.
- 분류 테이블은 목록에 없고 의도적으로 미적용 상태다. Task 1의 도메인/서비스 계약과 승인 사양을 사용했으며 DB 쓰기·DDL·실제 DB 통합 실행은 하지 않았다. 별도 승인된 migration 적용 전 API 실사용은 불가하다.
- 전체 `mvn test`는 이번 작업에서 재실행하지 않았다. 기존 baseline의 `MinioStorageConfigTest`/`SecurityConfigTest` 리소스 누락 오류 2건은 수정하지 않았다.
- 프론트엔드 변경 및 브라우저/스크린샷 검증은 Task 2 범위가 아니므로 수행하지 않았다. 기존 문서 수정과 `backend/backend` 로그는 커밋에서 제외한다.

## Task 2 검토 보완 — 비정수 ID

- 양쪽 PUT의 `/not-a-number` 회귀 테스트를 추가했다. 기존 처리는 원인 `NumberFormatException`을 통해 이미 HTTP 400/900 envelope을 반환했지만 Java 변환 오류 메시지를 그대로 노출했다.
- 고정된 분류 ID 안내 메시지 검증에서 양 도메인 2건 실패를 확인한 후 로컬 `MethodArgumentTypeMismatchException` handler를 추가했다. 서비스/메뉴 조회 없이 표준 INPUT_CHECK_ERROR envelope으로 반환하며 예상 밖 오류 처리는 변경하지 않았다.
- 동일 focused Maven 명령 재실행: **60건 통과**, 실패/오류/건너뜀 0건(컨트롤러 28, 서비스 26, 매퍼 6).
