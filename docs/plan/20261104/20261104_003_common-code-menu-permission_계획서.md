# 공통코드 메뉴별 기능 권한 적용 계획서

**Goal:** 관리자 역할과 무관하게 공통코드 메뉴 기능 권한으로 변경 API를 인가한다.

**Architecture:** CommonCodeGroupApiController에서 SystemMenuService.getMyMenuTree를 호출하여 기존 다중 권한그룹 합산 결과를 사용한다. 관리자 역할 우회는 추가하지 않으며 서비스·매퍼·공통 조회는 변경하지 않는다.

**Tech Stack:** Java 8, Spring MVC, Mockito, JUnit 5, Maven.

근거: [작업지시서](../../directions/20261104/20261104_003_common-code-menu-permission_작업지시서.md).

## 구현 순서

1. `backend/src/test/java/egovframework/let/co/master/commoncode/controller/CommonCodeApiControllerTest.java`에 일반 사용자 저장, 관리자 권한 미보유, 다른 메뉴 권한, 삭제 행 및 인증 테넌트 회귀 테스트를 추가한다.
2. `cd backend; mvn -q "-Dtest=CommonCodeApiControllerTest" test`로 관리자 역할 검사 때문에 실패함을 확인한다.
3. `backend/src/main/java/egovframework/let/co/master/commoncode/controller/CommonCodeGroupApiController.java`에 메뉴 서비스 의존성과 기능 권한 검사를 추가한다.
   - 단건 등록/수정 및 일괄 저장: `permissions.isCreate() || permissions.isUpdate()`.
   - 단건 삭제와 삭제 행이 포함된 일괄 저장: `permissions.isDelete()`.
   - 인증 테넌트가 없으면 401, 해당 메뉴 기능 권한이 없으면 403.
4. 같은 테스트 및 공통코드 서비스·메뉴 권한 회귀 테스트를 함께 실행한다.
5. 변경 운영 코드를 `javac --release 8`로 별도 검증한다.
6. `docs/result/20261104/common-code-menu-permission`에 근거, 검증 결과 및 스크린샷 가능 여부를 기록한다.

## 영향 통제

- 기존 공통코드 조회 API는 다른 화면의 코드 선택에도 사용되므로 조회 정책을 바꾸지 않는다.
- DB MCP의 list_tables → describe_table로 권한그룹 메뉴 권한 계약을 확인한다. 데이터 행 조회와 DB 변경은 하지 않는다.
- 작업 전부터 존재한 납품 화면 변경과 로그 파일은 수정하지 않는다.

## 실제 DB 경로 회귀 보완

1. 기본 DB MCP에서 관련 테이블 구조를 확인한 후 COUNT/FILTER/EXISTS로 일반사용자 쓰기 권한과 페이지 키 불일치를 확인한다. 개별 계정/테넌트 행은 출력하지 않는다.
2. 컨트롤러 테스트의 일반 사용자 저장 사례를 `@CsvSource`로 `common-code`/`cmncodes` × CREATE/UPDATE 네 조합으로 실행하여 현재 DB 경로에서 403이 재현되는지 확인한다.
3. 컨트롤러의 메뉴 키 조건을 `"cmncodes".equals(pageKey) || "common-code".equals(pageKey)`로 한정해 확장한다.
4. 동일한 두 키 조합을 조회 전용 거부, 다른 모듈 거부 및 삭제 권한 회귀에도 적용한다.
5. 관련 테스트와 변경 컨트롤러의 Java 8 API 검증을 재실행하고 결과 문서와 테스트 증거 캡처를 갱신한다.
