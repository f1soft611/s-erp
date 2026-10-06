# 기안양식 본문 에디터 구현 결과

## 구현 내용

- 기안양식 F1-Grid 마지막에 오른쪽 고정 `문서 양식` 액션을 추가했다. `hasDocument`에 따라 `문서 작성`/`문서 수정`을 표시하고 UPDATE 권한이 없으면 읽기 전용 상태를 보인다. 기존 사용자 Grid layout을 보존하면서 신규 액션 pin 설정을 한 번 migration한다.
- 공통 `CommonDialog` 안에서 선택 양식의 template JSON/HTML을 조회·편집·저장하는 Tiptap 모달을 제공한다. 기존 행 metadata가 dirty한 상태에서는 모달 진입 전 폐기 여부를 확인한다. 저장 성공 시 목록은 quiet reload한다.
- 공지사항의 clipboard normalization utility를 재사용해 Excel/스프레드시트 표와 일반 텍스트 붙여넣기를 지원한다. 이미지 파일 붙여넣기는 기안양식 전용 temp API를 사용하며, upload token을 본문 저장 payload로 연결한다. 저장된 이미지는 authenticated blob endpoint로 다시 읽는다.
- 백엔드 이미지는 전용 temp object prefix에서 stat/copy로 영구 prefix에 promote하고 `tb_common_file`의 `DRAFTING_WORK_TEMPLATE`/`EMBEDDED` 소유권으로 기록한다. JSON/HTML은 같은 tenant/form의 file ID만 참조할 수 있다. save transaction은 양식 row를 잠그고, rollback compensation 및 commit 후 미사용 이미지 정리를 등록한다.
- 임시 객체에 `s-erp-temp-owner=drafting-work-form` tag를 붙이고 promotion 시 tag를 제거한다. `backend/Docs/minio-windows-deployment.md`에 `tenant/` prefix+tag 기반 7일 expiration rule을 기록했다. MinIO rule은 운영 환경에 적용하지 않았다.
- DB MCP에서 기존 template JSONB/HTML과 `tb_common_file` owner 구조를 확인했다. 신규 DB schema/column/table은 만들지 않았다. 없는 `drafting_work_template_text`는 추가하지 않고 HTML/JSON에서 내용을 관리한다.

## 검증

- Frontend focused: `draft-form-template-service.test.ts`, `draft-form-grid-template-action.test.tsx`, `draft-form-template-dialog.test.tsx`; 3개 파일, 14 tests passed.
- Frontend build: `npm --prefix frontend run build`; TypeScript 및 Vite build 성공.
- Backend focused: Task2~4 변경 대상 7개 테스트 클래스; 최종 통합 71 tests passed, 0 failures/errors/skips.
- Backend full: `mvn -f backend/pom.xml test`; 213 tests, 0 failures/errors, 2 skipped, `BUILD SUCCESS`.
- Browser: 실제 `/co/workflow/form`에서 행의 `문서 작성` action으로 dialog를 열고 template GET을 확인했다. 375/768/1280px에서 body width는 viewport와 같았고, 목록 Grid 너비는 각각 267/660/1172px, dialog 너비는 311/704/820px였다. 저장 API는 호출하지 않았다.
- 사용자가 browser screenshot 생략을 요청해 작업 중 생성했던 캡처는 제거했고 이 결과 폴더에 screenshots를 보관하지 않는다.
- IDE diagnostics: 주요 frontend 변경 파일 3개 오류 없음. 문서 변경 `git diff --check` 통과.

## 전체 프론트엔드 테스트 기준선

- 시작 기준선: 649 tests, 479 passed, 138 failed; 57 files 중 37 passed, 18 failed.
- 최종 full suite: 680 tests, 518 passed, 162 failed; 62 files 중 42 passed, 20 failed. Vitest unhandled errors 10건(`MenuManagementPanel`/F1Tree의 `treeRef.current?.setSelectedRowId` TypeError)이 추가로 발생했다.
- Full-suite failures에는 F1Grid/menu/notice 및 `tmp-debug-menu-page.test.tsx` 등이 포함된다. 시작 기준선보다 failures가 24건 증가했으나, 전체 증가분을 이번 변경과 기존 환경/테스트 불안정성으로 완전히 분류하지 못했다. 신규 기능 focused tests와 production build는 통과했지만 전체 프론트 회귀가 없다고 단정하지 않는다.
- 상세 마지막 full-run log: `$TEMP/s-erp-final-frontend-full.log`.

## 코드 리뷰

- Task 1~7 사양 준수 리뷰: PASS.
- Task 1~7 코드 품질 리뷰: 승인, Critical/Important findings 없음.
- Minor 잔여 권고: 다중 이미지 clipboard paste stress test 추가. MinIO lifecycle rule을 실제 운영 버킷에 적용하고 배포 환경에서 검증.

## 결과 증거

- 진행 원장: [progress.md](./progress.md)
- 브라우저 캡처는 사용자의 명시 요청에 따라 생략했고, 결과 screenshot 폴더를 비워 두었다. MinIO lifecycle rule도 operator 권한/배포 범위이므로 실행하지 않았다.
