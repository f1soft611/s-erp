# 기안양식 본문 에디터 작업 원장

## 문서 및 승인

- 작업 분류: bounded
- 작업지시서: [20261002_011 작업지시서](../../../directions/20261002/20261002_011_기안양식_본문에디터_작업지시서.md) (사용자 승인 완료, 2026-10-02)
- 계획서: [20261002_011 계획서](../../../plan/20261002/20261002_011_기안양식_본문에디터_계획서.md) (사용자 승인 완료, 2026-10-02)
- 상세 사양서: [20261002_011 상세 사양서](../../../spec/20261002/20261002_011_기안양식_본문에디터_사양서.md) (사용자 승인 완료, 2026-10-02)
- 브랜치 선택: 현재 브랜치 `socra710` 사용 (사용자 선택, 2026-10-02). Worktree를 만들지 않았다.
- 실행 방식: Subagent-Driven 선택 (사용자 위임 응답 "추천하는걸로 해줘", 2026-10-02). 태스크별 구현 및 사양/품질 리뷰를 적용한다.

## 사전 확인

- MCP `list_tables(public)`: `tb_drafting_work_category`, `tb_common_file` 존재 확인.
- MCP `describe_table(tb_drafting_work_category)`: `drafting_work_template_json JSONB`, `drafting_work_template_html TEXT` 확인. `drafting_work_template_text` 없음.
- MCP `describe_table(tb_common_file)`: `tenant_id`, `owner_type`, `owner_id`, `object_key`, `bucket_name`, `file_usage_type` 등 기존 귀속 구조 확인.
- 민감한 업무 행 데이터는 조회하지 않았다.
- 신규 DB 스키마 변경: 없음. 텍스트 본문은 HTML/에디터 상태에서 파생한다.
- 임시 이미지 잔류 정책: 모달 취소/저장 시 미사용 객체 즉시 삭제, 비정상 종료 잔류 객체는 전용 temp prefix MinIO lifecycle 7일 적용 (사용자 선택).

## Git 및 사용자 변경사항

- 초기 상태: `socra710...origin/socra710 [ahead 1]`.
- 기존 변경 파일과 신규 문서가 다수 존재했다. 되돌리거나 정리하지 않는다.
- 작업 대상 `frontend/src/pages/co/workflow/form/components/DraftFormGrid.tsx`의 기존 미커밋 변경은 `구분코드` → `양식코드`, `구분명` → `양식명` 두 label 변경이다. 구현 시 유지한다.
- 각 태스크 커밋에서는 작업 파일만 path 지정 stage하고 기존 사용자 변경을 포함하지 않는다.

## 기준선 결과 (2026-10-02)

- 실행 위치 오류: 저장소 루트에서 `npm run test`, `mvn test`를 실행해 프로젝트 manifest를 찾지 못함. 프로젝트 위치를 지정해 재실행했다.
- Frontend: `npm --prefix frontend run test` - 실패. 57 test files 중 37 passed, 18 failed; 649 tests 중 479 passed, 138 failed. 실패 파일 중 `draft-form-management.test.tsx` 5건, `f1-grid.test.tsx` 49건, `f1-grid-context-menu.test.tsx` 3건, `notice-page.test.tsx` 7건, `notice-page-local-updates.test.tsx` 18건 등이 확인됐다. 전체 Vitest 출력은 실행 도구의 임시 로그에 보관됐으며 이후 focused 검증은 새로 실행한다.
- Backend: `mvn -f backend/pom.xml test` - 성공. 164 tests, 0 failures, 0 errors, 2 skipped; `BUILD SUCCESS`.
- 기존 frontend full-suite 실패는 기준선으로 취급하고, 신규 변경 관련 focused test를 별도로 실행해 회귀 여부를 판단한다.

## 태스크 진행

- [x] Task 1: Clipboard 정규화 유틸리티 분리 (`a5de73e`, `ebf0e2f`)
- [x] Task 2: 템플릿 조회/저장 API 계약 (`d8b428b`, `15b6acb`, `3679104`, `6100efd` 및 후속 보강)
- [x] Task 3: 기안양식 전용 임시 이미지 저장소 서비스
- [x] Task 4: 이미지 영구 귀속 및 인증 조회
- [x] Task 5: 프론트 API와 문서 액션
- [x] Task 6: 본문 다이얼로그와 Tiptap 편집
- [x] Task 7: F1-Grid 및 MinIO 운영 문서
- [x] Task 8: 통합 검증, 브라우저 기능 확인, 사양/품질 리뷰 (사용자 요청으로 캡처 생략)

## 검증 및 리뷰 기록

- `git diff --check`: 계획 문서 작성 전 기존 문서에 대해 통과. 상세 실행계획 추가 후 재실행 예정.
- Task 1 구현 직후 clipboard/공지 payload focused tests: 20 passed (구현자 실행 기록, 2026-10-02).
- Task 1 구현 직후 `npm run build`: 통과 (구현자 실행 기록, 2026-10-02).
- 백엔드 focused/full tests: baseline full 통과; 변경 후 검증 미실행.
- 브라우저 캡처: 미실행.
- Task 1 사양 준수 리뷰: 최종 통과. 최초 리뷰는 HEAD 이후 worktree diff만 확인해 구현 커밋을 놓쳤으며, `c90e7cc..ebf0e2f` 전체 태스크 diff로 재검토하여 승인했다.
- Task 1 코드 품질 리뷰: 승인. 동작 parity, 타입/정리, 전역 DOM 영향에 구체적 지적 없음. CSS 경계 사례 테스트 부재는 Minor 관찰사항이며 이번 태스크에서 보류하고 후속 clipboard 테스트 범위에서 검토한다.
- Task 1 작업 커밋: `a5de73e` clipboard utility 추출, `ebf0e2f` 파싱 문서 내 style 격리 및 전역 head 회귀 테스트.
- 현재 작업 트리의 Task 1 대상 파일 변경은 개행/포맷만 포함하며 기능 변경은 없다. 기존 사용자 변경 파일은 유지한다.
- Task 2 focused 검증: `mvn -f backend/pom.xml "-Dtest=DraftingWorkTemplateServiceImplTest,DraftingWorkTemplateApiControllerTest,DraftingWorkApiControllerTest,DraftingWorkServiceImplTest" test` - 4개 클래스, 40 tests, 0 failures/errors/skips, `BUILD SUCCESS`.
- Task 2 사양 준수 리뷰: 최종 PASS. 첫 리뷰는 Task 3/4 이미지 API와 Task 5 프론트 액션을 Task 2 실패로 분류했으나, 승인 계획의 태스크 경계를 대조한 재리뷰에서 범위 오류로 제외했다.
- Task 2 코드 품질 리뷰: 최종 승인. tenant/admin/API, JSONB/HTML sanitizer, supported Tiptap JSON schema 및 DI를 확인했다. 리뷰 권고 중 `JsonProcessingException`은 현재 표준 Jackson `JsonNode` 직렬화에서 재현 사례가 없어 방어 권고로 기록하고 기능 변경은 하지 않았다. 트랜잭션은 `DraftingWorkServiceImpl.saveTemplate()`에 적용되어 있음을 확인했다.
- 후속 Task 3/4/5 검증 조건: `embeddedImages` 토큰 검증/임시 업로드와 영구 귀속/인증 이미지 조회, 프론트 문서 액션·모달은 해당 태스크에서 완결하고 통합 테스트한다. Task 2 단독 완료가 전체 기능 완료를 의미하지 않는다.
- Task 3 구현: `DraftingWorkTemplateImageServiceImpl` 및 전용 API controller를 추가했다. 업로드는 `/api/v1/co/workflow/forms/{id}/template-images/temp`, 객체는 `tenant/{tenantId}/drafting-work-form-temp/{formId}/{uploadToken}/{safeFileName}`에 기록한다. 공지사항 API/prefix는 참조하지 않는다. 업로드·삭제 모두 인증 tenant의 tenant admin과 해당 tenant/form 존재를 요구한다.
- Task 3 입력 안전성: 10 MiB 최대 크기, PNG/JPEG/GIF/WebP MIME 및 signature 확인, 빈/누락 파일·잘못된 UUID·파일명 경로 성분 거부/정규화. DELETE key는 client object key를 받지 않고 검증한 tenant/form/token/fileName으로 서버가 구성한다.
- Task 3 RED/GREEN: 서비스 단위 테스트는 서비스 부재로 testCompile 실패를 확인한 뒤 구현. API 테스트는 controller 부재로 testCompile 실패를 확인한 뒤 구현. 테스트 시그니처/존재하지 않는 MockNativeWebRequest 참조는 같은 focused 범위에서 바로 수정하고 재검증했다.
- Task 3 focused tests: `DraftingWorkTemplateImageServiceImplTest`, `DraftingWorkTemplateImageApiControllerTest` - 15 tests, 0 failures/errors/skips. Task 2/3 통합 focused suite - `mvn -f backend/pom.xml "-Dtest=DraftingWorkTemplateServiceImplTest,DraftingWorkTemplateApiControllerTest,DraftingWorkApiControllerTest,DraftingWorkServiceImplTest,DraftingWorkTemplateImageServiceImplTest,DraftingWorkTemplateImageApiControllerTest" test` - 55 tests, 0 failures/errors/skips, `BUILD SUCCESS`.
- Task 3 사양 준수 리뷰: PASS. API path, 권한/tenant/form 범위, 전용 key prefix, 허용 MIME/signature/크기, 반환 metadata 및 token 기반 삭제를 확인했다. promotion/공통파일 귀속/인증 이미지 조회는 Task 4, lifecycle 문서는 Task 7로 남긴다.
- Task 3 코드 품질 리뷰: Critical defect 없음, 최종 승인. 리뷰 권고에 따라 JPEG/GIF/WebP 정상 signature, null/empty 파일, null tenant, 미인증 401, 크기 초과 413 테스트를 추가했다. 한 차례 후속 재리뷰 도구 호출은 파일 검토 대신 대상 확인 질문을 반환해 판정 근거로 사용하지 않았다.
- Task 4 구현: MinIO server-side stat/copy wrapper를 추가했다. PUT 템플릿 저장은 tenant/form `FOR UPDATE` 후 임시 이미지 metadata를 확인하고 영구 prefix로 복사, `tb_common_file`의 `DRAFTING_WORK_TEMPLATE`/`EMBEDDED` owner row 생성, HTML/JSON의 upload token 또는 same-form file ID를 고정 인증 URL로 rewrite한다. same-form common-file ownership에 없는 `data-file-id`는 저장을 거부한다.
- Task 4 소유권/수명주기: 모든 template save entrypoint에 `@Transactional(rollbackFor = Exception.class)`를 적용했다. copy 성공 후 DB transaction이 rollback되면 callback이 영구 객체를 보상 삭제한다. 이전 본문에서 빠진 file ID는 soft-delete하고 commit 이후 물리 객체 삭제를 시도하며, 요청에 포함됐으나 본문에서 쓰이지 않은 임시 객체도 commit 후 정리한다. 저장 이미지 GET은 인증 tenant/form/file/owner/use-type/permanent-prefix를 확인한 뒤 `inline`, `nosniff`, private cache header로 stream한다.
- Task 4 검증: Task2~4 backend focused suite(`DraftingWorkTemplateServiceImplTest`, `DraftingWorkTemplateApiControllerTest`, `DraftingWorkApiControllerTest`, `DraftingWorkServiceImplTest`, `DraftingWorkTemplateImageServiceImplTest`, `DraftingWorkTemplateImageApiControllerTest`, `MinioStorageServiceTest`) - 69 tests, 0 failures/errors/skips, `BUILD SUCCESS`.
- Task 4 사양 준수 리뷰: 최종 PASS. 영구 이동/common-file 귀속, JSON/HTML stable URL rewrite, same-form image ownership, inline authenticated stream, tenant admin write policy 및 transaction cleanup 계약을 확인했다.
- Task 4 코드 품질 리뷰: 최종 승인, Critical/Important 결함 없음. 초기 리뷰에서 제기된 transaction atomicity와 local src + `data-file-id` 소유권 우회는 rollback policy/row lock 및 membership 검증과 테스트로 해소했다. afterCommit callback의 MinIO 실패는 warning log로 남으며, 정기 lifecycle 운영 설정은 Task7에서 확인한다.
- Task 5/6 구현: 새 F1-Grid `문서 양식` 액션은 `hasDocument`로 작성/수정을 구분하고 UPDATE 권한 없이는 읽기 전용 상태를 표시한다. 선택 form ID의 템플릿 API를 전용 frontend service로 호출한다. 기존 row metadata가 dirty이면 문서 에디터 진입 전 확인창을 띄운다. `DraftFormTemplateDialog`에서 JSON/HTML restore/save, table/text clipboard normalization, image paste temp upload/token correlation, upload error cleanup, discard confirmation, authenticated blob rehydration을 처리한다.
- 사용자 layout 호환: 기존 `co-workflow-draft-form-grid` 저장값을 보존하며 `hasDocument` 오른쪽 고정만 한 번 migration한다. 별도 F1-Grid core 변경은 없다.
- Task 5/6 focused 검증: `draft-form-template-service.test.ts`, `draft-form-grid-template-action.test.tsx`, `draft-form-template-dialog.test.tsx` - 3 files, 최종 14 tests passed. `npm --prefix frontend run build` - TypeScript/Vite build 성공.
- 기존 page test baseline: `draft-form-management.test.tsx`는 기준선에서 5 failures를 보고했고 변경 후에도 5 failures/16 passed다. 실패는 기존 행 저장/soft-delete/context-menu 동작 범위이며, 새 action integration은 독립 `draft-form-template-dialog.test.tsx`에서 통과했다.
- Task 5/6 browser check: 실제 `/co/workflow/form`에서 첫 양식의 `문서 작성` 액션과 template GET/dialog open을 확인했다. 저장은 실행하지 않았다. 1280/768/375px body width는 viewport와 동일했고 Grid/dialog geometry를 측정했다. 사용자가 browser screenshot 생략을 요청해 생성했던 실제 데이터 포함 가능 캡처 6개를 제거했고 screenshot artifacts는 남기지 않는다.
- Task 5/6 사양 준수 리뷰: PASS. UPDATE gating, row callback, template API, editor restore/save, paste/upload/delete, authenticated blob rehydration과 dirty 보호를 확인했다. editor를 별도 파일로 분리하지 않고 dialog 안에 두어 변경 파일을 최소화했다.
- Task 5/6 코드 품질 리뷰: 승인, Critical/Important 결함 없음. 동시 image paste ID tracking, object URL lifecycle, dirty-state baseline, grid preference migration을 확인했다. 동시 paste stress coverage는 Minor 권고로 남긴다.
- Task 7 문서: F1-GRID.md에 renderCell 업무 action/저장 layout migration/내부 가로 스크롤 사용을 기록했다. MinIO 가이드에는 `tenant/` prefix + `s-erp-temp-owner=drafting-work-form` tag에만 7일 만료를 적용하는 규칙과 promotion 시 tag 제거를 문서화했다. `git diff --check` 통과.
- Task 7 MinIO 정책 근거: `mc ilm rule add` 공식 문서에서 `--prefix`, `--tags`, `--expire-days` 지원을 확인했다. 현재 로컬/운영 MinIO에 lifecycle rule은 실행하지 않았으며 operator 적용은 배포 환경 단계로 남긴다.
- Task 8 frontend full suite (최신 실행): `npm --prefix frontend run test -- --reporter=dot` - 62 files 중 42 passed/20 failed; 680 tests 중 518 passed/162 failed, unhandled errors 10건. 시작 기준선은 57 files 중 37 passed/18 failed; 649 tests 중 479 passed/138 failed였으므로 전체 suite는 비-green이며 failures 24건 증가했다. 실패 영역에는 `app-router-not-found`, common-code/content API, dashboard/sidebar, draft-form-management, F1-Grid/menu, notice, role/theme, `tmp-debug-menu-page` 등이 포함된다. 신규 기능 focused tests와 frontend build는 통과했지만 전체 증가분이 이번 변경과 무관하다고 전부 입증하지 못했다. 이를 숨기지 않고 residual risk로 남긴다.
- Task 8 backend full suite (최신 실행): `mvn -f backend/pom.xml test` - 213 tests, 0 failures/errors, 2 skipped, `BUILD SUCCESS`. Surefire aggregate에서도 213/0/0/2 확인.
- Task 8 frontend build (최신 실행): `npm --prefix frontend run build` - TypeScript 및 Vite production build 성공.
- Task 8 IDE diagnostics: `DraftFormGrid.tsx`, `DraftFormTemplateDialog.tsx`, `draftFormTemplate.service.ts` 오류 없음.
- 최종 리뷰: 사양 준수 PASS; 코드 품질 승인, Critical/Important 이슈 없음. 늦게 완료된 이미지 업로드 중 placeholder 삭제 시 returned temp token 즉시 정리 경로도 regression test로 검증했다 (frontend modal suite 7/7).
- 캡처 상태: 사용자 명시 요청에 따라 브라우저 캡처 artifacts를 저장하지 않는다. 임시로 생성했던 캡처 파일은 제거했으며 screenshots 폴더는 비어 있다.
