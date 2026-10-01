# 기안양식관리 작업 원장

## 계획과 승인

- 작업지시서: [20261001_001 작업지시서](../../../../directions/20261001/20261001_001_전자결재_기안양식관리_작업지시서.md) (사용자 승인 완료)
- 계획서: [20261001_001 계획서](../../../../plan/20261001/20261001_001_전자결재_기안양식관리_계획서.md) (사용자 승인 완료)
- 상세 사양서: [20261001_001 상세 사양서](../../../../spec/20261001/20261001_001_전자결재_기안양식관리_사양서.md) (사용자 승인 완료)
- 작업 단계: 구현/검증/결과 기록 완료. DB 실제 적용은 배포 승인 대기
- 브랜치: `socra710`; worktree 미생성
- 실행 전략: Inline Execution; Subagent-Driven 미선택

## 완료 항목

- [x] HACCP 원본 테이블, S-ERP 공통코드/권한/API 계약 조사
- [x] 원본 3-table migration/change-history/rollback 초안과 `db-schema.md` 작성; SQL 미실행
- [x] Baseline: backend `mvn test` 132 tests, 0 failures/errors, 2 skipped
- [x] Baseline: frontend build 성공; full Vitest 583 tests, 424 passed, 159 failed
- [x] Backend: tenant-scoped users/list/create/update API와 category/cycle/user/code validation
- [x] Backend: source mapper list/create/update/authority SQL, legacy `reg_term` 동기화, `INSERT ... RETURNING` query mapping
- [x] Backend focused tests: controller 6, service 12; mapper statement parse/command-type assertion 및 invalid `useAt` 검증 포함
- [x] Frontend: `co/form` route, F1-Grid 목록, 단일 통합검색, 컬럼 metadata 상세검색, 등록/수정, 분류 도움창
- [x] Frontend focused tests: page 10, helper 6, F1-Grid form 41, notification 3 (combined 60 passed)
- [x] Frontend production build 성공
- [x] Browser fixture capture: 375/768/1280px 목록, 375px main/helper full-screen forms, 1280px main/helper forms 캡처
- [x] backend/docs migration, change-history, rollback SHA-256 사본 일치

## 검증 결과

- Backend full suite: 150 tests, 0 failures, 0 errors, 2 skipped (`BUILD SUCCESS`)
- Frontend focused suites: page/helper/Grid-form/message 60 tests passed
- Frontend full suite: 602 tests, 440 passed, 162 failed. Baseline은 583 tests, 424 passed, 159 failed였다. Full run은 baseline의 19 unrelated failing files 외 page create test의 timeout-style `STACK_TRACE_ERROR` 1건을 보고했다. Isolated page suite는 10/10, combined focused suites는 60/60 통과했다.
- Browser capture: document/body `scrollWidth`는 375/768/1280px 각 viewport와 동일; 375px main/helper dialogs full-screen 확인
- Live login/API 브라우저 연동: 이 환경의 backend CORS 설정이 localhost origin을 허용하지 않아 진행 불가. UI 검증은 GET/API fixture만 사용했고 write 요청은 차단했다.

## DB 및 보존 범위

- Read-only PostgreSQL MCP의 `public` table list에서 HACCP source tables 3종은 아직 존재하지 않았다. `tb_common_code_group`, `tb_common_code_item`, `tb_user`, `tb_login_account`, `tb_department`의 필요한 ID/tenant/group/use 컬럼만 describe했다. 업무 행 데이터는 조회하지 않았다.
- migration SQL은 초안이며 실행하지 않았다. DB-backed mapper 통합 검증은 source tables 배포 후 수행해야 한다.
- 기존 `20261001_002` 변경 및 무관한 `20260915` SQL 사용자 수정은 보존했다.
- 결과 스크린샷은 `screenshots/`에 저장했다. 전체 변경 및 검증 상세는 [결과 보고서](./result.md)를 참조한다.
