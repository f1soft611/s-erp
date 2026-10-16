# 문서작성 테스트 계정 psql 직접 실행 SQL 결과

## 실행 오류 원인

제공된 psql 기록에서 `\set ON_ERROR_STOP on`은 정상 인식됐다. 기존 SQL은 실행 세션에 사전 설정된 해시 GUC 10개를 요구했지만 값이 준비되지 않아 `Ten account-specific SHA-256/Base64 hashes are required` 예외가 발생했다. 트랜잭션은 오류 상태로 중단됐고 로그 끝은 `ROLLBACK`이므로 해당 시도에서 계정 비밀번호는 갱신되지 않았다.

## 변경 내용

기존 SQL을 직접 psql 실행 형태로 변경했다. 스크립트가 psql `\prompt`로 새 비밀번호를 입력받고, 대상 10개 login code마다 PostgreSQL `sha256(bytea)`와 `encode(..., 'base64')`를 사용해 해시를 임시 테이블에 구성한다. 이후 기존 테넌트/활성 계정/행 잠금 검증과 정확히 다섯 개의 갱신 컬럼을 가진 한 트랜잭션을 실행한다. `\unset`으로 psql 변수를 해제하며, 비밀번호를 SQL 파일에 상수로 넣지 않는다.

### 보안 주의

psql `\prompt`로 입력한 문자는 화면에 표시되며, psql 변수 치환으로 만들어진 SQL 문장이 서버 statement 로그에 남을 수 있다. 사용자가 이 위험을 이해하고 psql 전용 실행을 선택했다. 신뢰할 수 있는 터미널 및 승인된 로그 설정에서만 실행하고, 실행 중 화면/서버 로그에 접근 가능한 사람을 제한한다.

## 직접 실행

저장소 루트에서 psql을 실행해 대상 DB에 접속한 뒤 아래를 입력한다.

```text
\i 'docs/database/20261014/20261014_002_reset_document_test_account_passwords.sql'
```

psql이 비밀번호 프롬프트와 가시성 경고를 표시하면 올바른 대상 DB인지 확인한 후 입력한다. 입력 도중 문자가 보이는 동작은 psql `\prompt`의 특성이다. 트랜잭션이 성공하면 psql 결과 행 수가 10인지 확인하고, 별도로 실제 로그인도 검증한다. VS Code PostgreSQL 확장의 Query Tool에 SQL을 넣는 방식은 psql 메타명령 `\set`, `\prompt`, `\unset`을 실행하지 못하므로 사용하지 않는다.

## 계약 확인 및 검증

- 읽기 전용 DB MCP 조회에서 `tb_login_account` 및 `tb_tenant` 컬럼과 서버 버전 PostgreSQL 18.4, 내장 `sha256(bytea)` 함수 존재를 확인했다. DB 변경은 수행하지 않았다.
- `node --test tools/tests/test_document_test_account_password_reset.cjs`: 5개 테스트 통과.
- docs/backend의 SQL 및 변경 이력 파일 쌍의 SHA-256 비교: 일치.
- SQL의 트랜잭션, 대상 tenant/account 수 가드, `FOR UPDATE`, 갱신 컬럼, 사후 10행 검증은 유지했다.
- 실제 SQL을 데이터베이스에 적용하거나 계정 로그인을 검증하지 않았다.
