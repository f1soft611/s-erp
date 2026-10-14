# 20261014_005 문서작성 테스트 계정 비밀번호 초기화 작업지시서

> 후속 변경: 기존 SQL에 직접 psql 프롬프트/해시 생성이 추가되었다. 현재 실행 절차는 [20261014_007 작업지시서](./20261014_007_document_test_account_password_reset_psql_작업지시서.md)를 따른다.

## 목적

문서작성 사용자 선택기 테스트 계정 10개의 비밀번호 해시와 로그인 잠금/실패 상태를 초기화할 수 있는 안전한 PostgreSQL SQL 스크립트를 추가한다.

## 작업 근거

- 승인 설계: [문서작성 테스트 계정 비밀번호 초기화 설계](../../superpowers/specs/2026-10-14-document-test-account-password-reset-design.md)
- 구현 계획: [문서작성 테스트 계정 비밀번호 초기화 계획](../../superpowers/plans/2026-10-14-document-test-account-password-reset.md)
- 기존 테스트 계정 계약: [20261007_005 문서작성 테스트 사용자 로그인 계정 보정 사양서](../../spec/20261007/20261007_005_document_user_picker_login_accounts_사양서.md)
- DB 계약은 읽기 전용 MCP의 테이블 목록 및 컬럼 메타데이터로 확인한다. MCP로 데이터 변경은 수행하지 않는다.

## 승인된 범위

- 대상 테넌트 코드는 `T1358606250`이다.
- 대상 로그인 코드는 `doc-write-test-user-01`부터 `doc-write-test-user-10`까지 정확히 10개다.
- 각 대상 계정에 해당하는 해시는 같은 PostgreSQL 세션의 `app.document_test_user_hash_01`부터 `app.document_test_user_hash_10` 설정에서 읽는다.
- 해시는 기존 `EgovFileScrty.encryptPassword(password, login_code)` 계약에 맞는 계정별 SHA-256/Base64 값이어야 한다.
- 초기화 SQL은 한 트랜잭션에서 `password_hash`, `password_changed_at`, `login_attempt_count`, `locked_at`, `updated_at`만 수정한다.
- 프로필, 역할, 권한 및 계정 활성 상태는 변경하지 않는다.
- SQL과 변경 이력은 `docs/database/20261014` 및 `backend/DATABASE/20261014`에 동일하게 보관한다.
- 테스트 계정 또는 DB 데이터를 실제로 변경하거나 로그인 성공을 확인하는 작업은 포함하지 않는다.

## 안전 요구사항

1. 비밀번호 원문과 해시값은 SQL, 문서, 테스트, 실행 결과, 명령 인자에 기록하지 않는다.
2. 해시 입력값 10개가 모두 44자 Base64 SHA-256 형식인지 영속 데이터 변경 전에 검증한다.
3. 대상 활성 테넌트가 정확히 하나이고, 해당 테넌트의 지정된 활성 계정이 정확히 10개일 때만 진행한다.
4. 업데이트 전에 대상 계정 행을 잠그고, 갱신 결과 행 수가 10개가 아니면 트랜잭션을 실패시킨다.
5. psql의 `ON_ERROR_STOP`을 사용한다. SQL 실행은 운영자가 해시를 안전하게 준비한 동일 PostgreSQL 세션에서만 수행한다.
6. 이전 해시는 저장하지 않는다. 성공한 비밀번호 초기화는 되돌릴 수 없으며, 다른 값으로 복구해야 하면 별도 초기화를 수행한다.
7. 읽기 전용 DB MCP 또는 다른 DB 클라이언트로 이 작업 중 쓰기를 수행하지 않는다.

## 완료 기준

- 잘못된 테넌트/계정 수, 비활성 계정, 누락되거나 형식이 잘못된 해시는 업데이트 전에 명시적으로 실패한다.
- 업데이트 대상은 지정한 10개 테스트 계정으로 제한되고 변경 컬럼은 승인된 다섯 개뿐이다.
- `tools/tests/test_document_test_account_password_reset.cjs`의 정적 계약 테스트가 통과한다.
- `docs/database`와 `backend/DATABASE`에 있는 SQL 및 변경 이력 사본이 바이트 단위로 동일하다.
- 결과 문서는 정적 검증과 DB 미적용/로그인 미검증 상태를 구분하고 인증정보를 포함하지 않는다.
