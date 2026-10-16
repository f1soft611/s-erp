# 20261014_007 문서작성 테스트 계정 psql 직접 실행 SQL 상세사양서

## 1. 요구사항과 범위

- 작업지시서: [20261014_007 작업지시서](../../directions/20261014/20261014_007_document_test_account_password_reset_psql_작업지시서.md)
- 계획서: [20261014_007 계획서](../../plan/20261014/20261014_007_document_test_account_password_reset_psql_계획서.md)
- 설계: [psql 직접 실행 SQL 설계](../../superpowers/specs/2026-10-14-document-test-account-password-reset-psql-design.md)
- 기존 SQL: [20261014_002 초기화 SQL](../../database/20261014/20261014_002_reset_document_test_account_passwords.sql)

대상은 테넌트 코드 `T1358606250` 아래 문서작성 테스트 로그인 코드 10개다. 실행 기록의 오류는 `\set` 문법이 아니라 각 `current_setting` 해시값이 없어서 기존 사전검증이 실패한 것이며, 로그에 표시된 트랜잭션은 `ROLLBACK`으로 종료됐다.

## 2. psql 입력/해시 계약

1. 스크립트는 `\set ON_ERROR_STOP on` 후 psql `\prompt`로 사용자가 새 비밀번호를 입력받는다.
2. 대상 로그인 코드는 SQL 안에서 정확한 열 개 값으로 고정한다.
3. PostgreSQL 18.4에서 확인한 내장 `sha256(bytea)`로 다음 값을 계산한다.

   ```text
   encode(sha256(convert_to(login_code, 'UTF8') || convert_to(password, 'UTF8')), 'base64')
   ```

4. 결과를 트랜잭션 임시 테이블에 적재하고 즉시 psql 변수 `\unset`을 수행한다. 입력값이 비어 있어 생성 행이 10개가 아니면 기존 사전검증 단계에서 UPDATE 전에 예외 처리한다.
5. 이후 기존 SQL의 테넌트, 활성 계정 수, 행 잠금, 갱신 컬럼, 사후 행 수 검사를 그대로 수행한다.
6. 임시 테이블은 커밋 전에 삭제한다.

## 3. 보안 주의

psql `\prompt` 입력은 숨김 입력이 아니므로 타이핑한 문자가 화면에 보인다. psql은 입력을 SQL 문자열로 안전하게 인용하지만, 확장된 쿼리가 서버로 전달되므로 서버 statement 로그 등에서 원문 비밀번호가 남을 수 있다. 이는 사용자가 승인한 노출 위험이며, 스크립트 주석과 결과 문서에 재차 표시한다. 입력 전용 신뢰 터미널과 승인된 서버 로그 정책에서만 실행한다.

SQL 파일에 비밀번호 상수는 저장하지 않는다. 에이전트는 해당 SQL을 DB에 적용하지 않는다.

## 4. DB 계약 증거

읽기 전용 DB MCP를 통해 `tb_login_account`, `tb_tenant` 컬럼 메타데이터와 PostgreSQL 18.4 버전, `sha256(bytea)` 존재를 확인했다. MCP는 읽기 전용이며 데이터 변경을 수행하지 않았다.

## 5. 검증

- 테스트는 psql prompt 존재, 대상 로그인 코드 열 개의 매핑, UTF-8/SHA-256/Base64 식, 입력변수 해제, 해시/계정 수 검증 순서, 기존 UPDATE 보호 조건을 검사한다.
- `docs/database`와 `backend/DATABASE` SQL/이력 사본은 동일해야 한다.
- 실제 데이터 변경과 로그인 검증은 이 작업에서 수행하지 않는다.
