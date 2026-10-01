# 기안양식관리 구현 결과

## 구현 범위

- `/co/workflow/form`을 `CO_WF_FORM` 대시보드 메뉴의 `co/form` page key에 연결했다.
- `GET /api/v1/co/workflow/forms`, `/users`, `POST /api/v1/co/workflow/forms`, `PUT /api/v1/co/workflow/forms/{id}`를 구현했다. 모든 조회/수정은 인증 tenant 범위로 제한하고 쓰기는 tenant admin을 요구한다. 생성/수정은 `useAt`에 `Y`/`N`만 허용한다.
- HACCP source table과 legacy columns를 유지하면서 분류/주기를 S-ERP common-code IDs로 연결했다. `code_name`은 양식명, `reg_term`은 주기 표시명으로 유지한다. 선택 담당자는 authority table에 저장한다.
- S-ERP `PageHeader`, `PageSearchArea`, `PageMessageArea`, permission action groups와 F1-Grid를 사용했다. 단일 통합 검색과 Grid column `search` metadata 기반 상세검색을 제공한다.
- 분류 상세 도움창은 F1-Grid row form으로 추가/수정하고 context menu copy를 지원한다. 공통코드 행삭제 메뉴는 숨기며 비활성은 `useAt=N`으로 저장한다. 모달은 상단 X와 구분선, 항상 보이는 하단 저장/취소 액션(저장 왼쪽)을 제공한다.
- 기안양식 목록은 `DraftFormGrid`와 `useDraftFormManagement`로 분리했다. F1-Grid `rowFormPlugin`으로 create/update하고 context menu add/copy/delete 및 Excel/sort/filter/selection을 유지한다. 행삭제는 `useAt=N` update이며 담당자 multi-select은 F1-Grid `form.multiple`로 보존한다.
- 분류 누락 안내는 shared `PageMessageArea`의 info severity를 사용하고, 분류가 없으면 등록 action을 비활성화한다.
- 기존 사용자 옵션 API, `haccpBaseWorkCodeIdGnrService`, common-code item CRUD API를 재사용했다. F1-Grid renderer/core는 유지하고 row-form public metadata와 `GridFormField`에 선택적 `form.multiple` 지원을 추가했다.

## 검증

- Backend `mvn test`: 150 tests, 0 failures, 0 errors, 2 skipped; `BUILD SUCCESS`.
- Frontend focused suites: page 10, helper 6, F1-Grid form 41, notification 3; combined 60 passed.
- Frontend `npm run build`: TypeScript + Vite build 성공 (1496 modules transformed).
- Frontend full Vitest: 602 tests, 440 passed, 162 failed. 승인 전 baseline은 583 tests, 424 passed, 159 failed였다. Full run은 baseline의 19 unrelated failing files 외 page create test의 timeout-style `STACK_TRACE_ERROR` 1건을 보고했으나 page suite 단독 실행은 10/10 통과했다. 변경 focused suites는 combined run에서 60/60 통과했다.
- Browser check: `frontend/scripts/capture-draft-form-management.js`가 fixture 기반 menu click, list row, 상세검색, main/helper form dialogs를 확인했다. 375/768/1280px에서 document/body 가로 overflow는 없고, 375px 두 dialog 모두 full-screen이다.
- Migration/history/rollback의 `backend/DATABASE/20261001` 및 `docs/database/20261001` SHA-256이 각각 일치했다.

## 결과 캡처

- [375px 목록](./screenshots/375px-list.png)
- [768px 목록](./screenshots/768px-list.png)
- [1280px 목록](./screenshots/1280px-list.png)
- [375px 기안양식 Grid form](./screenshots/375px-work-form.png)
- [1280px 기안양식 Grid form](./screenshots/1280px-work-form.png)
- [375px 분류 설정](./screenshots/375px-category-dialog.png)
- [1280px 분류 설정](./screenshots/1280px-category-dialog.png)

## 데이터베이스 및 환경 제한

- Read-only PostgreSQL MCP에서 현재 `public` table list를 확인했다. `tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`는 아직 설치되어 있지 않았다. `tb_common_code_group`, `tb_common_code_item`, `tb_user`, `tb_login_account`, `tb_department`의 사용자 옵션/공통코드 join에 필요한 컬럼 계약만 확인했고 업무 행 데이터는 조회하지 않았다.
- 신규 source schema와 common-code seed SQL은 작성본일 뿐 실행하지 않았다. DB 적용은 사용자의 배포 승인을 기다린다.
- Backend API origin의 CORS preflight가 local browser origin을 허용하지 않아 실계정 로그인/API 연동은 검증하지 못했다. 브라우저 screenshot은 API fixture를 사용하고 write 요청은 차단했다.
- 전체 frontend suite에는 baseline 및 전체-run timeout 계열 실패가 남아 있다. 변경 기능의 focused tests/build/browser check는 통과했으며 unrelated failures는 이번 범위에서 수리하지 않았다.
- 커밋은 요청되지 않아 생성하지 않았다. 기존 사용자 변경 파일은 보존했다.

## 후속 화면 보정 (20261001_003)

### 변경

- 기안양식 조회와 상세검색 적용 전에 F1-Grid 변경을 확인한다. dirty 상태면 공용 `UnsavedChangesConfirmDialog`를 표시하고, 취소는 편집을 유지하며 API를 호출하지 않는다. 계속은 변경 상태를 초기화하고 보류한 조건으로 재조회한다.
- 기안양식 분류 도움창은 별도 폼 없이 inline 행 추가/셀 편집을 사용한다. dirty 상태에서 Cancel/X 닫기를 요청하면 확인창을 띄우며, 취소는 변경을 보존하고 계속은 변경을 버린 뒤 닫는다.
- 분류 모달의 높이와 flex 영역을 제한해 행 목록 스크롤이 모달 내부 F1-Grid 본문에서 발생하게 했다. 저장 중에는 Grid overlay 대신 저장 버튼 진행 표시와 비활성화를 사용한다.
- 기안양식 분류/주기 ID는 저장값으로 유지하면서 셀에는 옵션 이름을 표시한다. null 검토자/승인자는 `선택 안 함`으로 표시한다. 셀 및 row-form select를 바꾸지 않은 경우 dirty가 남지 않는 동작을 검증했다.
- 기안양식 목록 Grid 상단 패딩을 모듈관리와 같은 8px로 맞췄다. F1-GRID 문서에 select label 값 타입 및 페이지 dirty 확인 책임을 추가했다.
- DB/API/권한 계약 변경 없음. `category_item_id` 및 공통코드 분류 모델을 유지했다.

### 재실행 검증

- 포트 정리: 기존 Vite listener 4173, 4174, 4175와 추가 4181을 종료한 뒤 최종 검증에는 4173만 사용했다.
- Focused tests: `tests/common-code-item-help-dialog.test.tsx`, `tests/draft-form-management.test.tsx`, `tests/module-management-page.test.tsx`; 27 passed, 기존 `soft-disables a deleted Grid row by saving useAt N` 1건은 이전에도 컨텍스트 메뉴 `행 삭제` 항목을 찾지 못해 실패하여 제외했다.
- Build: `npm run build` 성공 (TypeScript 및 Vite, 1498 modules transformed).
- Browser: fixture 기반 실제 UI를 375/768/1280px로 확인했다. document/body 가로 overflow 없음, 모든 뷰포트에서 Grid 상단 간격 8px.
- 분류 Grid 스크롤: desktop `clientHeight=501`, `scrollHeight=1152`, `overflowY=auto`; mobile `clientHeight=603`, `scrollHeight=1152`, `overflowY=auto`.
- 375px 메인 기안양식 폼과 분류 설정 모달은 모두 full-screen.

### 재검증 스크린샷

- [375px 목록](./screenshots/ui-polish-20261001/375px-list.png)
- [768px 목록](./screenshots/ui-polish-20261001/768px-list.png)
- [1280px 목록](./screenshots/ui-polish-20261001/1280px-list.png)
- [375px 기안양식 폼](./screenshots/ui-polish-20261001/375px-work-form.png)
- [1280px 기안양식 폼](./screenshots/ui-polish-20261001/1280px-work-form.png)
- [375px 분류 설정](./screenshots/ui-polish-20261001/375px-category-dialog.png)
- [1280px 분류 설정](./screenshots/ui-polish-20261001/1280px-category-dialog.png)

### 리뷰 판정

- 사양 준수: 통과. 승인된 화면 동작만 변경했고 기존 ID/API/DB/권한 계약을 유지했다.
- 자체 코드 검토: 공용 확인창과 F1-Grid 공개 `renderCell`을 재사용했고 F1-Grid 코어 변경은 하지 않았다. `git diff --check`에서 공백 오류가 없었다.
- 독립 코드 리뷰: 실행하지 않았다. Inline Execution 선택 및 서브에이전트 미사용 제약으로 별도 리뷰어 검증이 빠져 있다.
- 잔여 사항: 이전부터 실패하던 soft-delete 컨텍스트 메뉴 테스트 1건은 범위 밖이다. DB/API 실계정 연동은 이번 프론트 전용 변경에서 수행하지 않았다.
