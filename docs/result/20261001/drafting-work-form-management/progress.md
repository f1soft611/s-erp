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
- 승인 범위: 분류 모달 그리드/dirty 저장/이탈 확인, 기안양식 select label/dirty 처리, 조회 dirty 확인, 미선택 결재자 표시, 네 방향 그리드 여백, 후속 셀 이동 dirty 수정, F1-Grid 문서 및 결과 증거
- DB/API/백엔드 영향: 없음; `category_item_id` 공통코드 계약 유지
- 커밋: 별도 요청이 없어 생성하지 않음

### 태스크 상태

- [x] 저장된 select의 label/null 표시, 셀·row-form 미변경 시 dirty 없음 회귀 테스트 및 수정
- [x] 기본 조회·상세검색 dirty 확인, 취소 시 유지/API 미호출, 계속 시 보류 조회 회귀 테스트 및 구현
- [x] 분류 모달 inline 추가/수정, dirty 닫기 취소/폐기, 조용한 저장 표시 구현 및 focused tests
- [x] 분류 모달 Grid 내부 스크롤 및 가용 높이를 브라우저로 검증
- [x] 모듈관리 기준 네 방향 그리드 여백 브라우저 검증 및 F1-Grid 문서 갱신
- [x] focused suites/build/375·768·1280px 브라우저 검증과 결과 보고서 갱신
- [x] 부모 Dialog 내 blur commit 누락 RED/GREEN 재현, `GridCell` guard 보정 및 실제 도움창 테스트
- [x] 분류 저장/reload 성공 시 공용 `공통코드를 저장했습니다.` toast 표시와 브라우저 캡처
- [x] 분류 저장 후 부모 목록 재조회에서 메인 Grid 전체 로딩 overlay를 억제하고 초기/직접 조회 로딩은 유지

### 검증 및 리뷰

- 계획된 focused 명령: `npm run test -- tests/common-code-item-help-dialog.test.tsx tests/draft-form-management.test.tsx tests/module-management-page.test.tsx`
- 계획된 빌드: `npm run build`
- 초기 기준선: 기존 20261001_001 원장의 프론트엔드 전체 테스트/빌드 결과를 참조. 이번 코드 변경 전 새 실행은 아직 없음.
- 현재 RED/GREEN 증거: dirty 조회 확인은 구현 전 확인창 부재로 실패 후 기본/상세검색 cancel/continue targeted 테스트 통과; 분류 dirty 닫기는 구현 전 확인창 부재로 실패 후 취소/X continue targeted 테스트 통과; select label/null 및 no-op cell/row-form 테스트 통과; quiet save indicator targeted test 통과; 분류 도움창 전체 8/8 통과
- 후속 셀 blur RED/GREEN: `Dialog` 안 Grid에서 편집 후 다른 셀 클릭 시 `getChanges()`가 비어 있음을 RED로 재현했다. `GridCell`이 자신을 감싸는 상위 MUI Dialog를 popup으로 세지 않도록 수정 후 core regression과 실제 분류 도움창 dirty 저장 테스트가 통과했다.
- 알려진 테스트 실패: `draft-form-management.test.tsx`의 기존 `soft-disables a deleted Grid row by saving useAt N`가 구현 전·후 모두 컨텍스트 메뉴의 행 삭제 항목을 찾지 못함. 이번 변경 범위 밖이며 원인 수정은 하지 않음.
- 최종 focused tests: 3 files, 27 passed, 1 pre-existing unrelated test skipped. 전체 focused run에서는 그 실패를 확인했으며 이 작업에서 제외했다.
- 최종 `npm run build`: 성공, Vite 1498 modules transformed.
- 후속 저장 알림: RED에서 성공 alert 부재를 재현하고, `NotificationContext.showSuccess` 연결 후 `공통코드를 저장했습니다.` assertion 통과. 실패 경로에서는 error만 보이고 success toast가 없는 것도 확인. 분류 도움창 전체 11/11 통과.
- 후속 blur 검증: F1-Grid blur/date-time targeted 5/5 통과; 최종 build 성공. 브라우저 저장 토스트 및 전용 screenshot 검증 통과.
- 후속 분류 재조회 로딩: 지연된 목록 응답 동안 메인 Grid overlay 부재, 기존 row 유지, reload 후 공용 success toast를 확인하는 focused test 통과.
- 추가 재조회 회귀: `draft-form-management.test.tsx`에서 분류 저장 후 지연된 form-list 응답 중 main Grid overlay가 나타나는 RED를 재현했고, `loadRows(..., { quiet: true })` 연결 후 targeted test 통과.
- 추가 검증: 기안양식 페이지 suite 14 passed, 기존 soft-delete context-menu test 1 skipped; `npm run build` 성공.
- F1-Grid 전체 테스트 파일은 153개 중 106 passed / 47 failed로 종료했고, 출력된 실패 사례는 pinned-column persistence 테스트의 accessible-name 조회였다. 전체 suite는 green이 아니며 해당 헤더 메뉴 실패는 이번 blur 변경에서 수정하지 않았다.
- 브라우저: 기존 서버 포트 4173/4174/4175/4181을 정리한 후 Vite 4173 하나만 사용. fixture 기반 실제 메뉴 진입 및 캡처 성공.
- 뷰포트: 375/768/1280px document/body scrollWidth가 각 viewport와 동일; Grid top padding 각 8px.
- 분류 모달 내부 스크롤: desktop clientHeight 321px / scrollHeight 1152px, mobile 603px / 1152px, `overflowY=auto`; 375px 메인/도움창 full-screen.
- 실 Chromium 셀 이동 검증: 분류명 셀 편집 후 같은 행 다른 셀 클릭 시 `data-dirty-cell=true`, 저장 버튼 enabled, 닫기 dirty 확인 표시를 검사하고 변경 폐기까지 수행했다.
- 스크린샷: [ui-polish-20261001](./screenshots/ui-polish-20261001/) 아래 목록, 기안양식 폼, 분류 도움창 375/768/1280px 캡처.
- 자체 리뷰: 사양 준수 확인, API/DB/F1-Grid core 변경 없음 및 확인창 상태 흐름 확인.
- 독립 리뷰: 미수행. Inline Execution 및 현재 실행 제약에서 별도 리뷰어를 위임하지 않았으므로 독립 코드 품질 리뷰는 완료로 주장하지 않음.

### 추가 사용자 요청: 네 방향 그리드 여백 일치

- `DraftFormManagementPage`의 그리드 컨테이너 반응형 좌우 패딩과 별도 상·하 패딩을 `p: 1`로 통일했다. 모듈관리 `CardContent p: 1` 기준과 동일하게 네 방향 모두 8px이다.
- 회귀 테스트: 기안양식 페이지 테스트의 그리드 컨테이너 상·하·좌·우 패딩 검증 통과. 파일 전체 13개 중 12개 통과, 기존 soft-delete 컨텍스트 메뉴 테스트 1개는 동일한 행 삭제 메뉴 미노출로 실패했다.
- 브라우저: 375/768/1280px 모두 네 방향 8px, document/body 가로 overflow 없음.
- 빌드: `npm run build` 성공.
- 새 스크린샷은 `screenshots/all-sides-spacing-20261001/`에 저장했다.

### 추가 사용자 요청: 기안양식 저장 중 조용한 로딩

- 저장 중에는 메인 Grid 전체 로딩 오버레이를 숨기고 저장 액션의 진행 아이콘과 비활성화로 중복 저장을 막도록 수정했다.
- 저장 완료 후 목록 재조회에만 quiet 옵션을 적용했으며 초기 진입/직접 조회의 기존 로딩은 유지한다.
- 회귀 테스트 RED/GREEN: 저장 요청과 지연된 저장 후 재조회 중 Grid 오버레이가 없는지, 진행 아이콘이 표시/해제되는지를 검증한다.
- focused 회귀 테스트: 1/1 통과. 전체 `draft-form-management.test.tsx`는 13개 통과, 기존 soft-delete 컨텍스트 메뉴 테스트 1개가 `행 삭제` 항목 미노출로 실패했다.
- `npm --prefix frontend run build`: 통과; TypeScript 및 Vite 빌드 성공. `git diff --check`: 통과.
- 브라우저 확인은 Vite 4175에서 시도했으나 fixture API 요청이 완료되지 않아 앱이 초기 로딩에 머물렀고, 저장 중 캡처는 확보하지 못했다. 기존 반응형 캡처는 이전 화면 검증 자료이며 이번 transient 상태의 증거로 간주하지 않는다.
