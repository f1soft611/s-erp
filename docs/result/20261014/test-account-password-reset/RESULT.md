# 문서작성 테스트 계정 비밀번호 초기화 SQL 결과

## 요청 및 범위

문서작성 테스트 계정 10개의 초기화용 SQL을 준비했다. 범위는 테넌트 코드 `T1358606250`의 `doc-write-test-user-01`~`doc-write-test-user-10`에 한정된다. 사용자에게 받은 비밀번호와 해당 값에서 파생되는 해시는 어떤 저장소 파일에도 기록하지 않았다.

## 산출물

- 작업지시서: [20261014_005 작업지시서](../../../directions/20261014/20261014_005_document_test_account_password_reset_작업지시서.md)
- 계획서: [20261014_005 계획서](../../../plan/20261014/20261014_005_document_test_account_password_reset_계획서.md)
- 상세사양서: [20261014_005 상세사양서](../../../spec/20261014/20261014_005_document_test_account_password_reset_상세사양서.md)
- 승인 설계: [테스트 계정 비밀번호 초기화 설계](../../../superpowers/specs/2026-10-14-document-test-account-password-reset-design.md)
- 실행 SQL: [20261014_002_reset_document_test_account_passwords.sql](../../../database/20261014/20261014_002_reset_document_test_account_passwords.sql)
- 변경 이력: [20261014_002 변경 이력](../../../database/20261014/20261014_002_change_test_account_passwords.md)
- 백엔드 보관본: [backend/DATABASE/20261014](../../../../backend/DATABASE/20261014)
- SQL 계약 테스트: [test_document_test_account_password_reset.cjs](../../../../tools/tests/test_document_test_account_password_reset.cjs)
- 구현 계획: [실행 계획](../../../superpowers/plans/2026-10-14-document-test-account-password-reset.md)

## 안전 동작

- 운영자는 로그인 코드별 해시 10개를 실행할 동일 PostgreSQL 세션에 별도로 준비해야 한다. SQL은 해시가 모두 존재하고 Base64 SHA-256 형식인지 확인한다.
- 테넌트가 정확히 하나이며 활성 지정 계정이 정확히 10개인지 업데이트 전에 검사하고, 해당 행을 잠근다.
- SQL은 `password_hash`, `password_changed_at`, `login_attempt_count`, `locked_at`, `updated_at`만 한 트랜잭션으로 변경하며 업데이트 결과가 정확히 10행인지 검사한다.
- 프로필, 역할, 권한 및 계정 활성 상태는 변경하지 않는다.
- 이전 비밀번호 해시는 보관하지 않으므로 성공한 작업에 대한 역복구 SQL은 없다. 다른 값이 필요하면 새 해시로 다시 초기화한다.

## 검증 결과

- `node --test tools/tests/test_document_test_account_password_reset.cjs`: 5개 테스트 통과.
- docs/backend의 SQL 및 변경 이력 사본 SHA-256 비교: 두 파일 쌍 모두 일치.
- 새 작업 파일 후행 공백 검사: 통과.
- 읽기 전용 DB MCP로 테이블 목록과 관련 컬럼 메타데이터를 확인했다. MCP 및 다른 DB 클라이언트를 이용한 데이터 변경은 하지 않았다.
- SQL 정적 검증만 수행했으며, PostgreSQL 적용과 실제 로그인을 수행하지 않았다. 따라서 계정 비밀번호가 초기화됐거나 로그인이 성공했다고 주장하지 않는다.
- 화면 변경이 없고 실제 DB 실행 증거도 없으므로 스크린샷은 만들지 않았다.
