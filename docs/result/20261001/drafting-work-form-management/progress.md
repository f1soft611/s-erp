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

## 후속 화면 보정 작업 (20261001_003)

### 승인 및 실행 방식

- 작업지시서: [20261001_003 작업지시서](../../../../directions/20261001/20261001_003_전자결재_기안양식관리_화면보정_작업지시서.md) (수정 요구 포함 사용자 승인 완료, 2026-10-01)
- 계획서: [20261001_003 계획서](../../../../plan/20261001/20261001_003_전자결재_기안양식관리_화면보정_계획서.md) (사용자 승인 완료, 2026-10-01)
- 상세 사양서: [20261001_003 상세 사양서](../../../../spec/20261001/20261001_003_전자결재_기안양식관리_화면보정_사양서.md) (사용자 승인 완료, 2026-10-01)
- 브랜치: `socra710`; 사용자가 현재 브랜치 진행을 선택함; Worktree 미생성
- 실행 전략: Inline Execution
- 승인 범위: 분류 모달 그리드/dirty 저장/이탈 확인, 기안양식 select label/dirty 처리, 조회 dirty 확인, 미선택 결재자 표시, 상단 간격, F1-Grid 문서 및 결과 증거
- DB/API/백엔드 영향: 없음; `category_item_id` 공통코드 계약 유지
- 커밋: 별도 요청이 없어 생성하지 않음

### 태스크 상태

- [x] 저장된 select의 label/null 표시, 셀·row-form 미변경 시 dirty 없음 회귀 테스트 및 수정
- [x] 기본 조회·상세검색 dirty 확인, 취소 시 유지/API 미호출, 계속 시 보류 조회 회귀 테스트 및 구현
- [x] 분류 모달 inline 추가/수정, dirty 닫기 취소/폐기, 조용한 저장 표시 구현 및 focused tests
- [x] 분류 모달 Grid 내부 스크롤 및 가용 높이를 브라우저로 검증
- [x] 모듈관리 기준 상단 간격 브라우저 검증 및 F1-Grid 문서 갱신
- [x] focused suites/build/375·768·1280px 브라우저 검증과 결과 보고서 갱신

### 검증 및 리뷰

- 계획된 focused 명령: `npm run test -- tests/common-code-item-help-dialog.test.tsx tests/draft-form-management.test.tsx tests/module-management-page.test.tsx`
- 계획된 빌드: `npm run build`
- 초기 기준선: 기존 20261001_001 원장의 프론트엔드 전체 테스트/빌드 결과를 참조. 이번 코드 변경 전 새 실행은 아직 없음.
- 현재 RED/GREEN 증거: dirty 조회 확인은 구현 전 확인창 부재로 실패 후 기본/상세검색 cancel/continue targeted 테스트 통과; 분류 dirty 닫기는 구현 전 확인창 부재로 실패 후 취소/X continue targeted 테스트 통과; select label/null 및 no-op cell/row-form 테스트 통과; quiet save indicator targeted test 통과; 분류 도움창 전체 8/8 통과
- 알려진 테스트 실패: `draft-form-management.test.tsx`의 기존 `soft-disables a deleted Grid row by saving useAt N`가 구현 전·후 모두 컨텍스트 메뉴의 행 삭제 항목을 찾지 못함. 이번 변경 범위 밖이며 원인 수정은 하지 않음.
- 최종 focused tests: 3 files, 27 passed, 1 pre-existing unrelated test skipped. 전체 focused run에서는 그 실패를 확인했으며 이 작업에서 제외했다.
- 최종 `npm run build`: 성공, Vite 1498 modules transformed.
- 브라우저: 기존 서버 포트 4173/4174/4175/4181을 정리한 후 Vite 4173 하나만 사용. fixture 기반 실제 메뉴 진입 및 캡처 성공.
- 뷰포트: 375/768/1280px document/body scrollWidth가 각 viewport와 동일; Grid top padding 각 8px.
- 분류 모달 내부 스크롤: desktop clientHeight 501px / scrollHeight 1152px, mobile 603px / 1152px, `overflowY=auto`; 375px 메인/도움창 full-screen.
- 스크린샷: [ui-polish-20261001](./screenshots/ui-polish-20261001/) 아래 목록, 기안양식 폼, 분류 도움창 375/768/1280px 캡처.
- 자체 리뷰: 사양 준수 확인, API/DB/F1-Grid core 변경 없음 및 확인창 상태 흐름 확인.
- 독립 리뷰: 미수행. Inline Execution 및 현재 실행 제약에서 별도 리뷰어를 위임하지 않았으므로 독립 코드 품질 리뷰는 완료로 주장하지 않음.
