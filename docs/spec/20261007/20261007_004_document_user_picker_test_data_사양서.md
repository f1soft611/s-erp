# 20261007_004 문서작성 사용자 선택 테스트 데이터 사양서

## 1. 범위

문서작성 결재선/참조 선택기에 추가 후보를 제공하기 위한 `tb_user` 시드 데이터만 추가한다. 테이블 구조, 조회 API/쿼리, 사용자 선택 UI는 변경하지 않는다.

- 작업지시서: [20261007_004 문서작성 사용자 선택 테스트 데이터](../../directions/20261007/20261007_004_document_user_picker_test_data_작업지시서.md)
- 계획서: [20261007_004 문서작성 사용자 선택 테스트 데이터](../../plan/20261007/20261007_004_document_user_picker_test_data_계획서.md)
- 승인 설계: [Document User Picker Test Seed Design](../../superpowers/specs/2026-10-07-document-user-picker-seed-design.md)

## 2. 사용자 선택 조회 계약

`DraftingWork_SQL_postgresql.xml`의 `selectUserOptions`는 아래 조건을 적용한다.

- `tb_user`와 `tb_login_account`를 `login_id`, `tenant_id` 모두로 내부 조인한다.
- 로그인 계정과 사용자의 `use_at`이 모두 `'Y'`여야 한다.
- 조회는 인증된 테넌트의 사용자로 제한한다.
- 부서 및 직급은 기존 테넌트의 부서/직급 코드 참조를 통해 표시한다.
- 응답의 `user_id`가 프론트엔드 선택 옵션 값으로 사용되므로 프로필마다 서로 다른 선택 항목으로 표시된다.

따라서 `tb_user`에 로그인 연결 없이 행만 추가하면 선택기에 표시되지 않는다. 테스트 사용자는 기준 프로필의 계정 연결과 조직 참조를 재사용한다.

## 3. 시드 데이터 계약

| 번호 | 사용자명 | 이메일 |
|---|---|---|
| 01 | 문서작성 테스트 사용자 01 | doc-write-test-user-01@example.invalid |
| 02 | 문서작성 테스트 사용자 02 | doc-write-test-user-02@example.invalid |
| 03 | 문서작성 테스트 사용자 03 | doc-write-test-user-03@example.invalid |
| 04 | 문서작성 테스트 사용자 04 | doc-write-test-user-04@example.invalid |
| 05 | 문서작성 테스트 사용자 05 | doc-write-test-user-05@example.invalid |
| 06 | 문서작성 테스트 사용자 06 | doc-write-test-user-06@example.invalid |
| 07 | 문서작성 테스트 사용자 07 | doc-write-test-user-07@example.invalid |
| 08 | 문서작성 테스트 사용자 08 | doc-write-test-user-08@example.invalid |
| 09 | 문서작성 테스트 사용자 09 | doc-write-test-user-09@example.invalid |
| 10 | 문서작성 테스트 사용자 10 | doc-write-test-user-10@example.invalid |

추가 행의 `tenant_id`, `login_id`, `department_id`, `level_id`는 가장 이른 활성 계정 연결 사용자 행에서 가져온다. `use_at`은 `'Y'`이며 사용자 ID와 생성/수정 시각은 테이블 기본값을 사용한다. 암호 및 로그인 계정은 만들지 않는다.

이 테스트 프로필은 선택기 표시/다중 선택 UI 검증 전용이다. 여러 프로필이 같은 로그인 계정에 연결되므로 서로 다른 로그인 주체나 실제 결재 권한을 가진 사용자로 간주하지 않는다.

기준 사용자 탐색은 활성 `tb_user`와 같은 테넌트/로그인 ID의 활성 `tb_login_account`를 대상으로 한다. 기준이 없는 경우 SQL은 명시적 예외로 중단하며 조용히 0건을 성공 처리하지 않는다.

## 4. 재실행과 롤백

- 삽입 충돌 키는 `(tenant_id, email_addr)`이며 `ON CONFLICT DO NOTHING`으로 재실행을 안전하게 한다.
- 롤백은 기준 테넌트 안에서 지정된 사용자명과 `.invalid` 이메일이 모두 일치하는 행만 삭제한다.
- 계정/부서/직급 행과 기타 사용자 행은 삭제하지 않는다.

## 5. 파일 및 검증

- 시드, 롤백, 변경 이력은 `docs/database/20261007` 및 `backend/DATABASE/20261007`에 동일하게 둔다.
- 제한된 MCP 집계 조회는 `Database request failed`로 실패했다. MCP 테이블 목록/컬럼 설명과 초기 로그인 스키마 DDL, 현재 사용자 선택 Mapper SQL을 계약 근거로 기록한다.
- SQL의 10쌍 수, 활성 상태, 테넌트/로그인 연결, 충돌 처리, 롤백 범위 및 복사본 동일성을 정적으로 확인한다.
- 실제 DB에 SQL을 적용한 후에만 사용자 선택기에서 새 후보 10명을 화면으로 확인한다.
