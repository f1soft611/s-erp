# 공통 리치 텍스트 저장 수명주기 결과

## 변경 요약

- frontend `useRichTextEditorSaveLifecycle`가 editor HTML/JSON snapshot, 본문 참조 이미지와 전체 임시 session 구분, upload 진행 상태, orphan/cancel/success session 정리를 공통 소유한다.
- Notice와 Draft dialog는 domain upload/delete adapter, 사용자 메시지, 폼·dirty-close UI, 기존 API payload mapping을 유지한다.
- backend `RichTextDocumentSanitizer`가 Notice/Draft HTML과 Tiptap JSON에 동일한 server-side allowlist를 적용한다. Notice의 supported text/table styles와 Tiptap textStyle/link/underline/table/image schema를 보존하며 active content, event attrs, unsafe CSS/URL은 제거한다.
- shared clipboard normalizer preserves safe font-family/font-size from non-table HTML, block-level styles and legacy `<font face/size>`. Excel paste uses quoted TSV cell text/line breaks when its 24-column row grid and non-whitespace text align with HTML; it preserves HTML merges, widths and cell styles while correcting HTML-only soft wraps. Non-matching cells safely retain HTML. Stored JSON is restored without rewriting. CSS `font` shorthand/class-based `<col>` widths and plain-text-only TSV are supported.
- Merged cells now scan for a contiguous free column range across the entire `colspan`, preventing placement/`colwidth` drift when a range intersects an existing `rowspan`.
- backend HTML and JSON table-cell style allowlists now preserve safe `font-family`, `font-size`, `font-style`, and `line-height`; before the fix both test paths dropped cell font family/size.
- backend `EmbeddedImageDocumentProcessor`가 null-safe token 수집, temporary session 검증, 기존 owner image resolution, 새 이미지 promotion, owner metadata 확인, stable URL rewrite, transient attr 제거, retained file ID 산출을 공통 수행한다.
- processor는 editor에서 참조한 상세 image metadata와 전체 임시 session을 별도 입력으로 받는다. 상세 metadata는 promotion filename 선택에 우선하지만 새 token promotion 권한은 이번 session membership으로만 허용한다.
- Notice는 `NOTICE/postId`, Draft는 `DRAFTING_WORK_TEMPLATE/formId` 소유권과 authorization/target validation, stable URL resolver, 업무 row 저장 및 owner-save completion을 각 service에 유지한다. Draft의 중복 JSON/HTML sanitizer와 Notice의 inline save image processor는 제거했다.
- 공통 `EmbeddedImageDocumentStorage` bridge는 Notice common storage와 Draft form-checking image adapter를 연결한다. Draft adapter는 owner type을 `DRAFTING_WORK_TEMPLATE`으로 고정 검증한다.
- DB schema, API route/request field, ordinary attachment, MinIO lifecycle 정책은 변경하지 않았다.

## 검증

- Frontend focused: shared lifecycle hook, Notice HTML/composer/image/clipboard, Draft template dialog — 6 files, 71 tests passed; `npm --prefix frontend run build` passed.
- Frontend: `npm --prefix frontend run build` — TypeScript 및 Vite build 통과.
- Backend focused: sanitizer 6, processor 4, Notice service/image adapter 24, Draft service/image adapter 22 tests passed.
- Backend full: `mvn -f backend/pom.xml test` — 228 tests, 0 failures/errors, 2 skipped, `BUILD SUCCESS`.
- Backend package: `mvn -f backend/pom.xml package` — `BUILD SUCCESS`, 228 tests/0 failures/errors/2 skipped; latest class is copied to the IntelliJ Tomcat exploded docBase.
- Browser save/reopen: 미검증. Tomcat package artifact는 갱신했지만 실행 중인 IntelliJ Tomcat ROOT context는 자동 재시작되지 않아 최신 class 반영에 context reload가 필요하다. 공유 서버를 임의 종료하지 않았다.
- Shared browser debug verification: the source grid had 41 rows and 24 columns; title text was at row 0/column 0 in both formats (`colspan=18`, `rowspan=2`) and the method text at row 7/column 3 (`colspan=21`). No merged ranges overlapped. The HTML-only breaks differed from TSV, and the synchronized editor now renders the title as exactly two lines (one hard break, 22pt) and the method using TSV line breaks (21-column merge, 9pt). The paste path retains HTML merge/style metadata and falls back to HTML if grid or non-whitespace cell content differs. The earlier colspan placement bug is fixed by scanning the full span against rowspan occupancy. Existing templates saved by earlier transforms cannot recover removed line breaks or spaces; repaste from Excel and save once.
- Screenshot은 시각 UI 변경이 아니므로 추가하지 않았다.

## 후속 메모

IntelliJ Tomcat ROOT context를 재배포/재시작한 후 Notice와 Draft에서 이미지 포함 본문을 저장·재조회하는 browser smoke flow를 확인해야 한다. `mvn test`만으로는 이미 실행 중인 Tomcat JVM의 class가 reload되지 않는다.

## 설계 및 작업 문서

- 설계: [Shared Rich Text Save Lifecycle](../../superpowers/specs/2026-10-06-shared-editor-save-lifecycle-design.md)
- 작업지시서: [20261006_002](../../directions/20261006/20261006_002_공통_리치텍스트_저장수명주기_작업지시서.md)
- 계획서: [20261006_002](../../plan/20261006/20261006_002_공통_리치텍스트_저장수명주기_계획서.md)
- 사양서: [20261006_002](../../spec/20261006/20261006_002_공통_리치텍스트_저장수명주기_사양서.md)
