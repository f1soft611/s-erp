# 20261007_005 문서작성 테스트 사용자 로그인 계정 보정 계획서

## 목표

공유 `login_id` 때문에 기안양식 목록의 검토자/승인자 조인이 행을 증식시키는 현상을 테스트 데이터 원본에서 해결한다. 프로필별 고유 계정과 일반 사용자 역할을 연결하고 실제 로그인은 저장소 밖에서 준비된 계정별 해시를 사용한다.

## 근거 및 선행 승인

- 작업지시서: [20261007_005 문서작성 테스트 사용자 로그인 계정 보정](../../directions/20261007/20261007_005_document_user_picker_login_accounts_작업지시서.md)
- 상세 사양서: [20261007_005 문서작성 테스트 사용자 로그인 계정 보정](../../spec/20261007/20261007_005_document_user_picker_login_accounts_사양서.md)
- 승인 설계: [Document User Picker Login-Account Seed Design](../../superpowers/specs/2026-10-07-document-user-picker-login-account-seed-design.md)
- 이전 profile-only 작업([20261007_004](../../directions/20261007/20261007_004_document_user_picker_test_data_작업지시서.md))의 계정 재사용 조건은 이 보정 작업으로 대체한다.

## 작업 단계

1. **작업 문서 정합성**
   - `20261007_005` 작업지시서/계획서/사양서에 기존 원인, 10개 login code, `DEFAULT_USER`, 세션 해시 설정, 멱등성 및 정확한 롤백 범위를 기록한다.
   - 기존 결과 문서에는 후속 보정 링크를 추가해 이전 결과가 과거 SQL 버전을 설명함을 명확히 한다.

2. **실행 seed**
   - 열 개의 `app.document_test_user_hash_NN` 세션 설정값을 임시 seed relation으로 적재하고, `EgovFileScrty.encryptPassword(password, login_code)`의 SHA-256/Base64 출력 형식(44자)을 검증한다.
   - 비활성 테스트 프로필을 기준 사용자로 선택하지 않는다. 활성 계정 연결 기준 사용자의 테넌트/부서/직급과 동일 테넌트 활성 `DEFAULT_USER` 역할을 요구한다.
   - 대상 tenant의 로그인 코드 충돌을 검증한 뒤 계정, 역할 연결, 기존 테스트 프로필을 순서대로 멱등 갱신한다.
   - SQL 안에 평문 비밀번호, 실제 해시 또는 자격 증명을 두지 않는다.

3. **롤백 및 이력**
   - 이름/email/login code가 지정된 테스트 계정만 찾는다.
   - 테스트 프로필을 제거한 후 역할 연결을 제거하고, 남은 사용자 프로필 참조가 없는 정확한 테스트 로그인 코드만 계정에서 제거한다.
   - `docs/database`와 `backend/DATABASE`의 SQL/이력 파일 복사본을 동일하게 유지한다.

4. **F1-Grid 계약 및 결과**
   - F1-GRID 문서에 API에서 넘어오는 행의 안정적 고유 `rowKey` 조건 및 조인 중복의 원천 수정 원칙을 추가한다.
   - 결과 문서에 사용자 공유 화면의 중복 ID/React 경고 근거, 정적 검증 결과, DB MCP 읽기 전용 한계를 기록한다. 실제 데이터 행과 인증정보는 문서화하지 않는다.

## 검증 계획

- [ ] 시드 SQL에 정확히 10개의 고유 login code와 hash 설정 키가 있다.
- [ ] 모든 해시 값은 존재 및 Base64-SHA256 44자 형식 검증을 통과해야 한다.
- [ ] 모든 계정/역할/프로필 연결은 동일 anchor tenant로 제한된다.
- [ ] 충돌 시 다른 사용자의 계정이나 프로필을 수정하지 않고 예외로 중단한다.
- [ ] 롤백이 다른 사용자 참조 계정, 기준 사용자 및 공통 역할을 삭제하지 않는다.
- [ ] DB 파일 사본은 각각 SHA-256이 일치한다.
- [ ] `frontend`에서 `npx vitest run tests/f1-grid-docs.test.tsx --maxWorkers=1 --testTimeout=30000` 실행 결과를 기록한다.
- [ ] 읽기 전용 MCP에서는 데이터 변경을 수행하지 않는다. 쓰기 가능한 개발 DB가 제공되지 않으면 실제 SQL 적용 및 로그인 검증은 미수행으로 남긴다.

## 제외

- `selectWorkList`의 사용자 조인 쿼리 변경
- F1-Grid 렌더러 동작 또는 React row key 로직 변경
- 계정 비밀번호, 비밀번호 해시, 임시 토큰을 저장소나 채팅에 기록
- `DEFAULT_USER` 역할 또는 메뉴 권한 변경
- 실제 DB 쓰기 및 테넌트 사용자 행 조회
