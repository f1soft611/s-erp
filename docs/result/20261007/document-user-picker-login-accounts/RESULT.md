# 문서작성 테스트 사용자 로그인 계정 보정 결과

## 요청과 원인

30개 이상 조회한 뒤 소수 행을 다시 조회할 때 이전 행이 남거나 겹친다는 현상을 조사했다. 사용자가 공유한 화면에는 32개 데이터 행에 안정 행 ID `1`, `2`, `3`이 반복되고 React 중복 key 경고가 나타났다. 기존 테스트 사용자 10개 프로필이 같은 로그인 ID를 공유했고, 기안양식 조회가 검토자/승인자를 `tenant_id + login_id`로 사용자 프로필에 조인해 결과 행을 증식시킬 수 있었다.

그리드 렌더러를 임의로 변경하지 않고 테스트 데이터의 계정 매핑을 바로잡았다. F1-Grid 계약에도 `rowKey` 값이 행마다 안정적이고 고유해야 한다고 명시했다.

## 변경 파일

- 시드: [docs/database/20261007/20261007_001_seed_document_user_picker_test_users.sql](../../../database/20261007/20261007_001_seed_document_user_picker_test_users.sql)
- 롤백: [docs/database/20261007/20261007_001_rollback.sql](../../../database/20261007/20261007_001_rollback.sql)
- 변경 이력: [docs/database/20261007/20261007_001_document_user_picker_test_users_change_schema.md](../../../database/20261007/20261007_001_document_user_picker_test_users_change_schema.md)
- 백엔드 보관본: [backend/DATABASE/20261007](../../../../backend/DATABASE/20261007)
- F1-Grid 사용자 문서: [F1-GRID.md](../../../../frontend/src/pages/f1-grid-docs/F1-GRID.md)
- F1-Grid 문서 포털 데이터: [f1GridDocs.ts](../../../../frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts)
- 작업지시서/계획서/사양서: [작업지시서](../../../directions/20261007/20261007_005_document_user_picker_login_accounts_작업지시서.md), [계획서](../../../plan/20261007/20261007_005_document_user_picker_login_accounts_계획서.md), [사양서](../../../spec/20261007/20261007_005_document_user_picker_login_accounts_사양서.md)

## 계정 및 안전성 계약

- 10개 테스트 프로필을 `doc-write-test-user-01`~`doc-write-test-user-10`의 고유 로그인 계정에 1:1 연결한다.
- 각 계정에 같은 테넌트의 기존 활성 `DEFAULT_USER` 역할만 연결한다. 역할 정의나 권한은 만들거나 바꾸지 않는다.
- 계정별 암호 해시는 실행 세션의 `app.document_test_user_hash_01`~`10` 설정에서 읽는다. 값 누락 또는 SHA-256/Base64 형식 오류는 실제 테이블 쓰기 전에 예외로 중단한다. 비밀번호와 해시 값은 저장소 및 결과 문서에 포함하지 않는다.
- 충돌 검사는 동일 테넌트 범위이며, 다른 프로필이 계정을 참조하는 경우 롤백은 해당 계정/역할을 삭제하지 않는다.
- DB 쿼리/API 및 그리드 구현 코드는 변경하지 않았다.

## 검증 상태

- DB 문서와 `backend/DATABASE`의 시드, 롤백, 변경 이력 각 쌍에 대한 SHA-256 일치 확인: 통과
- 해시 설정 키/로그인 코드 10쌍, nullable 임시 해시와 쓰기 전 검증, 활성 `DEFAULT_USER`, 테넌트 스코프, 잔여 사용자 참조 보호 정적 검사: 통과
- `frontend`에서 `npm run test -- tests/f1-grid-docs.test.tsx`: 18개 테스트 통과
- 수정한 F1-Grid 문서 데이터/테스트 TypeScript 진단: 오류 없음
- `git diff --check`: 통과
- PostgreSQL 쓰기 실행, 실제 로그인, 화면 재현 확인: 수행하지 않음. 읽기 전용 DB MCP로 SQL을 적용하지 않았으며 테넌트 사용자 행을 결과물에 저장하지 않았다.
- 스크린샷: DB 미반영 상태에서 실제 변경 결과를 보여줄 수 없고 공유 화면에는 테넌트 데이터가 있으므로 저장하지 않음.

## 추적 문서

- 이전 profile-only 결과와 후속 관계: [최초 테스트 사용자 결과](../document-user-picker-test-users/RESULT.md)
- 날짜별 변경 이력: [20261007_001 변경 이력](../../../database/20261007/20261007_001_document_user_picker_test_users_change_schema.md)
