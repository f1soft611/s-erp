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
