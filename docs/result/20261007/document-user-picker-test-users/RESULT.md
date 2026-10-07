# 문서작성 사용자 선택 테스트 데이터 결과

## 요청 및 구현 범위

사용자 선택기에서 여러 후보를 시험할 수 있도록 `tb_user`에 테스트 사용자 프로필 10개를 추가하는 SQL 시드와 롤백을 준비했다. 이는 테이블 DDL이 아니라 데이터 삽입 스크립트다. 애플리케이션, 스키마, 로그인 계정 및 암호는 변경하지 않았다.

- 작업지시서: [20261007_004_document_user_picker_test_data_작업지시서](../../../directions/20261007/20261007_004_document_user_picker_test_data_작업지시서.md)
- 계획서: [20261007_004_document_user_picker_test_data_계획서](../../../plan/20261007/20261007_004_document_user_picker_test_data_계획서.md)
- 사양서: [20261007_004_document_user_picker_test_data_사양서](../../../spec/20261007/20261007_004_document_user_picker_test_data_사양서.md)
- 승인 설계: [Document User Picker Test Seed Design](../../../superpowers/specs/2026-10-07-document-user-picker-seed-design.md)

## 산출물

- 시드 SQL: [docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql](../../../database/20261007/20261007_001_seed_document_user_picker_test_users.sql)
- 롤백 SQL: [docs/database/20261007/20261007_001_rollback.sql](../../../database/20261007/20261007_001_rollback.sql)
- 변경 이력: [docs/database/20261007/20261007_001_document_user_picker_test_users_change_schema.md](../../../database/20261007/20261007_001_document_user_picker_test_users_change_schema.md)
- 동일 파일 복사본: [backend/DATABASE/20261007/](../../../../backend/DATABASE/20261007/)

시드가 기존 활성 계정 연결 사용자의 테넌트, `login_id`, 부서 및 직급을 재사용하는 것은 `selectUserOptions`가 `tb_user`와 활성 `tb_login_account`를 같은 테넌트/로그인 ID로 내부 조인하기 때문이다. 이메일은 `.invalid` 예약 도메인을 사용하며 재실행 충돌을 건너뛴다. 기준 사용자가 없으면 시드가 예외로 중단된다.

조회 응답과 프론트엔드 옵션 값은 `user_id`를 사용하므로 10개 프로필은 서로 다른 선택 항목으로 표현된다. 다만 모두 같은 로그인 계정을 공유하므로 이 데이터는 선택기 화면 테스트용이며 실제 로그인/결재 주체를 검증하는 용도는 아니다.

## 검증

- DB 문서 경로와 백엔드 경로의 시드, 롤백, 변경 이력 파일이 바이트 단위로 동일하다.
- 정적 검사에서 이름/이메일 쌍 10개가 모두 고유하며 시드/롤백 쌍이 일치함을 확인했다.
- 정적 검사에서 활성 계정 연결, 기준 사용자 부재 시 예외, `(tenant_id, email_addr)` 충돌 무시, 계정 테이블 미삽입, 롤백 테넌트 한정 조건을 확인했다.
- 새 파일의 후행 공백이 없다.
- PostgreSQL 읽기 전용 MCP의 테이블 목록/컬럼 메타데이터 조회는 성공했다. 제한된 행 집계 조회는 `Database request failed`로 실패했다. 민감한 사용자 행 데이터는 조회하거나 문서화하지 않았다.
- 로컬에 `psql`이 없어 SQL을 실행하는 런타임 검증은 수행하지 않았다.

## DB 반영 및 화면 확인 상태

읽기 전용 MCP만 사용 가능하므로 시드/롤백을 데이터베이스에 실행하지 않았다. 따라서 데이터베이스에 테스트 사용자 10명이 반영되었거나 사용자 선택기에서 조회된다고 아직 확인하지 않았다. 쓰기 가능한 개발 DB에 시드 SQL을 적용한 뒤 문서작성 화면을 새로고침해 `문서작성 테스트 사용자 01`~`10`을 확인해야 한다. 실제 반영 전의 화면 캡처는 결과 증거로 첨부하지 않았다.

## 후속 보정 안내

이 결과는 최초 profile-only 시드 버전에 대한 기록이다. 사용자가 공유한 F1-Grid 화면에서 안정 행 ID `1`, `2`, `3`이 반복되고 중복 React key 경고가 나타난 현상을 확인한 뒤, 10개 테스트 프로필이 하나의 `login_id`를 공유한 것이 `tenant_id + login_id` 조인 결과를 증식시킬 수 있음을 확인했다. 최초 시드 설명의 “같은 로그인 계정 공유” 조건은 현재 계약이 아니다.

후속 SQL은 테스트 프로필마다 고유 로그인 계정과 기존 활성 `DEFAULT_USER` 역할을 연결한다. 최신 시드, 롤백, 변경 이력 및 검증 상태는 [로그인 계정 보정 결과](../document-user-picker-login-accounts/RESULT.md)를 기준으로 한다.
