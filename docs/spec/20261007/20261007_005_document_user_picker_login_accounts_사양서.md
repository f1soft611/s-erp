# 20261007_005 문서작성 테스트 사용자 로그인 계정 보정 사양서

## 1. 범위와 근거

- 작업지시서: [20261007_005 문서작성 테스트 사용자 로그인 계정 보정](../../directions/20261007/20261007_005_document_user_picker_login_accounts_작업지시서.md)
- 계획서: [20261007_005 문서작성 테스트 사용자 로그인 계정 보정](../../plan/20261007/20261007_005_document_user_picker_login_accounts_계획서.md)
- 승인 설계: [Document User Picker Login-Account Seed Design](../../superpowers/specs/2026-10-07-document-user-picker-login-account-seed-design.md)
- 보정 대상: `docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql`와 같은 경로의 rollback 및 backend 복사본

이 사양은 현재 test-user seed의 프로필-로그인 계정 연결과 롤백 계약을 수정한다. 테이블 DDL, 애플리케이션 조회 쿼리, 권한 정의, F1-Grid 코드는 변경하지 않는다.

## 2. 사용자/계정 매핑

각 행 번호 `NN` (`01`~`10`)은 아래 규칙을 따른다.

| 항목 | 값 |
|---|---|
| 사용자명 | `문서작성 테스트 사용자 NN` |
| 이메일 | `doc-write-test-user-NN@example.invalid` |
| 로그인 코드 | `doc-write-test-user-NN` |
| 상태 | `tb_user.use_at='Y'`, `tb_login_account.use_at='Y'` |
| 역할 | 같은 테넌트의 기존 활성 `tb_role.role_code='DEFAULT_USER'` |
| 조직 참조 | 같은 테넌트의 기존 활성 비테스트 계정 연결 사용자와 동일한 `department_id`, `level_id` |
| 계정 연결 | 해당 행 전용 `tb_login_account.login_id`; 다른 프로필과 공유 금지 |

기존 예약 이메일의 테스트 사용자는 삭제/재생성하지 않고 `login_id`를 각 고유 계정에 갱신한다. 계정 행 및 역할 연결이 이미 존재하면 정확히 대응하는 테스트 login code/테스트 프로필일 때만 멱등 갱신한다. 이 코드가 다른 사용자나 테넌트에 이미 존재해도 교차 테넌트 데이터는 변경하지 않는다.

## 3. 비밀번호 해시 주입

- 각 계정은 `EgovFileScrty.encryptPassword(password, login_code)` 결과와 일치하는 SHA-256/Base64 해시를 사용한다.
- 실행 세션의 PostgreSQL 설정은 `app.document_test_user_hash_01`부터 `app.document_test_user_hash_10`까지 10개다.
- SQL은 `current_setting('app.document_test_user_hash_NN', true)`로 값만 읽고, 각 값이 정확히 44자 Base64 SHA-256 형식인지 검사한다.
- 하나라도 값이 없거나 형식이 틀리면 `tb_login_account`, `tb_login_account_role`, `tb_user`에 쓰기 전에 예외를 발생시킨다.
- 실제 비밀번호 또는 해시 값을 문서, SQL 파일, 결과, 채팅에 기록하지 않는다. 값을 설정한 동일 DB 세션에서 seed를 실행하고 완료 후 세션을 닫는다.

## 4. 역할 및 로그인

- 테넌트에 이미 있는 활성 `DEFAULT_USER`만 연결한다.
- 역할이 없거나 비활성이면 역할이나 권한을 새로 만들지 않고 seed를 예외로 중단한다.
- seed는 각 계정에 대해 해당 역할의 `(login_id, role_id)` mapping을 멱등 생성한다.
- 로그인 코드가 같은 테넌트 내에서 고유하므로 각 프로필은 다른 계정으로 로그인할 수 있다.
- 이 데이터 계약은 `selectUserOptions`의 활성 계정 내부 조인 및 `selectWorkList`의 `tenant_id + login_id` 사용자 조인이 각각 한 프로필과만 대응하게 한다.

## 5. 멱등성/충돌 처리

- 기존 활성 계정 연결 테스트 외부 프로필에서 테넌트/부서/직급을 가져온다. 대상 테스트 이름/email은 기준 선택에서 제외한다.
- 해당 기준 프로필 또는 기준 테넌트의 활성 `DEFAULT_USER` 역할을 찾을 수 없으면 명시적으로 실패한다.
- target tenant에 해당 login code가 테스트 사용자 외의 프로필에 연결되어 있으면 덮어쓰지 않고 실패한다.
- 정확한 `(tenant_id, email_addr)` 테스트 프로필은 새 고유 `login_id` 및 기준 조직 참조에 upsert한다.
- 다른 테넌트의 동일 login code/email 가능성은 검사 또는 변경 대상이 아니다.
- 모든 단계는 하나의 트랜잭션 안에서 처리한다.

## 6. 롤백

- 이름과 예약 이메일이 모두 일치하는 10개 테스트 프로필이 속한 테넌트에서만 대상 계정을 찾는다.
- 지정된 테스트 프로필의 행을 제거하고, 그 테스트 계정들의 `tb_login_account_role` mapping을 제거한다.
- `doc-write-test-user-NN` login code가 일치하고 어떤 남은 `tb_user`도 참조하지 않는 계정만 제거한다.
- 다른 사용자/계정, anchor 프로필, `DEFAULT_USER`, 역할/메뉴 권한 정의는 제거하지 않는다.

## 7. F1-Grid 행 키 계약

F1-Grid에 입력되는 각 행은 `rowKey` 기준으로 안정적이고 고유해야 한다. API 조인 결과가 같은 양식 행을 여러 번 반환해 동일한 `rowKey`가 반복되면 React 키 충돌과 잘못된 행 렌더링이 발생할 수 있다. 이 문제는 행을 임의로 렌더링에서 제거하는 대신 SQL/데이터의 조인 cardinality 원인을 수정한다.

## 8. 검증 기준과 미실행 범위

- SQL의 테스트 사용자 10개, unique login code 10개 및 해시 설정 10개를 정적으로 확인한다.
- hash gate, tenant-scoped `DEFAULT_USER`, collision guard, 프로필 1:1 재연결, rollback isolation을 확인한다.
- docs/backend의 시드, rollback, 변경 이력 각 파일 쌍의 해시가 동일해야 한다.
- `tests/f1-grid-docs.test.tsx`를 실행한다.
- 읽기 전용 DB MCP로 데이터 변경을 수행하지 않는다. 쓰기 가능한 DB 실행이 없으면 SQL 반영과 로그인 동작은 검증 전 상태로 기록한다.
