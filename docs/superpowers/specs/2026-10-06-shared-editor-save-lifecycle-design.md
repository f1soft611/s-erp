# Shared Rich Text Save Lifecycle Design

## Goal

Make Notice the reference implementation for a reusable rich-text body save lifecycle. Notice and Draft template dialogs share editor image session tracking and body serialization; backend services share editor document sanitization and embedded-image processing. A future editor consumer supplies only its upload/delete adapter, server-side owner identity, stable URL resolver, and domain-row save.

## Current State

- `RichTextEditor` already shares schema, clipboard handling, image paste upload, resize, and editor lifecycle.
- Notice and Draft dialogs separately track temporary uploads, block save/close while uploads run, serialize editor HTML/JSON, delete canceled/orphaned images, and construct image metadata payloads.
- Backend `EmbeddedImageStorageService` shares MinIO upload, promotion, `tb_common_file` ownership, and cleanup mechanics.
- Notice and Draft service implementations separately sanitize/scan HTML and JSON, validate upload tokens, resolve retained files, promote new images, rewrite stable image sources, and calculate retained file IDs.
- Notice currently sanitizes in the frontend with the shared HTML sanitizer; Draft has a stricter backend Jsoup/JSON allowlist. The policies can produce different saved output from the same shared editor.
- Domain differences are intentional: Notice uses `NOTICE/postId` and post contents fields; Draft uses `DRAFTING_WORK_TEMPLATE/formId` and template fields. Each keeps its own authorization, API routes, stable image URL, and persistence table.

## Design

### Frontend lifecycle hook

Add a domain-neutral hook beside `RichTextEditor`. It receives an editor instance plus domain `uploadImage` and `deleteTemporaryImage` adapters. It owns:

- the full temporary-upload session keyed by upload token;
- upload-in-progress count and the shared upload/orphan callbacks passed to `RichTextEditor`;
- an editor snapshot containing HTML, JSON, referenced image metadata, and all current-session temporary images;
- success completion and cancel cleanup of remaining temporary uploads.

The hook does not own title/category/attachment fields, domain API requests, alert text, dirty-close confirmation, or permission policy. Consumers map the shared snapshot into their existing request DTOs. Notice keeps its separate referenced-image and full-session fields; Draft maps the same snapshot into its existing template request contract.

### Shared clipboard typography normalization

For non-table `text/html` clipboard input, the shared normalizer preserves safe inline and block-level text styles instead of flattening the fragment to `textContent`. It converts legacy `<font face/size>` and block `font-family`/`font-size` styles to supported inline spans before shared HTML sanitization. Unsafe CSS and active content remain removed. Notice and Draft use the same normalizer through `RichTextEditor`.

Excel table paste uses the quoted TSV from `text/plain` as the cell-text/newline source when its row count, column grid, and non-whitespace cell text agree with the HTML table. TSV cells are mapped by row and the HTML cell's merged start column; HTML `colspan`/`rowspan`, column widths, and cell-level styles remain authoritative. If the grids or cell text do not align, the normalizer falls back to HTML rather than dropping characters. This preserves Excel line breaks and indentation without interpreting bullet markers. Plain-text tabs/spaces are retained; only CRLF is canonicalized to LF. Loading stored Tiptap JSON does not rewrite its breaks. During table reconstruction, a merged cell must be placed in the first contiguous free column range that fits its full `colspan`; checking only the first column can overlap a neighboring `rowspan` and assign the wrong `colwidth`. The clipboard normalizer still expands safe CSS `font` shorthand into individual text properties and reads class-based `<col>` widths before building Tiptap `colwidth` attributes. Table paragraphs inherit their cell font size and use normal line height. Wrapping values are restricted to safe CSS enums (`pre-wrap`, `pre-line`, `break-all`, `keep-all`, `break-word`, `anywhere`, and normal equivalents) in clipboard and both sanitizer layers. The backend table-style allowlist includes safe font family/size/style and line height so both HTML and JSON saves retain spreadsheet typography.

### Common editor document sanitizer

Add a domain-neutral backend `RichTextDocumentSanitizer` used by the shared processor for both HTML and Tiptap JSON. The allowlist follows the shared `RichTextEditor` schema and existing Notice shared sanitizer with text styles preserved: supported paragraphs/headings/lists/quotes/code/table/image nodes, supported marks, safe link protocols, safe table styles/widths, and bounded image dimensions. It removes unsupported nodes/attrs, event handlers, embedded active content, unsafe CSS, and dangerous URL schemes. JSON null/missing values remain null/missing and are never coerced into token strings.

The shared JSON policy includes Tiptap `textStyle` marks (`color`, `fontFamily`, `fontSize`), underline/link marks, and table attrs used by current editor behavior. HTML inline styles use the Notice shared allowlist for text plus safe table cell/header/column presentation. CSS values containing `url()`, `expression()`, script protocols, braces, or markup delimiters are rejected. Image width/height accept bounded numeric/px/% forms. Unsupported tags are unwrapped where safe; active-content elements are removed with their contents.

Sanitization is authoritative on the backend and occurs for Notice and Draft alike. The existing frontend shared sanitizer remains an early UX normalization layer, not the security boundary. Owner-specific stable image URL validation is not configurable sanitizer policy: the common document processor validates and rewrites image nodes against server-selected owner metadata and the domain's stable URL resolver before persistence. Temporary image metadata is retained only long enough for token validation/promotion, then removed from persisted HTML/JSON.

### Backend document processor

Add a common `EmbeddedImageDocumentProcessor` that uses `EmbeddedImageDocumentStorage` and accepts server-selected tenant/owner values, HTML/JSON, detailed current image metadata, the separate full temporary session, uploaded-by identity, and a stable-URL resolver supplied by the domain adapter. It owns:

- collecting only non-null textual upload tokens from HTML and Tiptap JSON;
- validating referenced new tokens against the current temporary session;
- preferring referenced image filename/file metadata when present while using the full session only as the authorization boundary and fallback metadata source;
- resolving already-owned images by file ID/object key and the established owner key token segment;
- promoting referenced new images and verifying returned tenant/owner/usage metadata;
- rewriting HTML and JSON to the supplied stable authenticated URL while stripping temporary attributes;
- returning rewritten bodies and retained file IDs for the domain service.

The processor composes `RichTextDocumentSanitizer` and image ownership processing. It does not authorize users, select owner type/ID from client input, define domain URL routes, or update domain tables. The Notice/Draft service validates or locks its target, supplies the owner-specific URL resolver, maps the sanitized result to its own columns, saves its own row, then calls the existing owner-save cleanup method with the processor result.

### Save flow

1. Domain controller/service authenticates and validates the target; Draft retains its row lock.
2. Domain maps request uploads to `EmbeddedImageUploadVO` and supplies fixed owner values and stable URL resolver.
3. Shared processor sanitizes HTML/JSON under the common editor allowlist, validates image references against the separate detail/session inputs, promotes authorized new uploads, rewrites both document representations, removes transient attributes, and returns retained IDs.
4. Domain writes its existing HTML/JSON columns without applying a second, divergent sanitizer.
5. Domain invokes common owner-save completion within the current transaction lifecycle.
6. On failure, existing transaction compensation and temporary cleanup semantics remain in force.

## Compatibility and Security

- Notice API fields and `NOTICE/postId` ownership remain unchanged.
- Draft API fields and `DRAFTING_WORK_TEMPLATE/formId` ownership remain unchanged.
- Client owner values are never trusted. Tenant, owner type, and owner ID are selected server-side.
- Null/missing JSON attrs are not stringified into fake tokens.
- Existing stable file ID, object key, legacy Notice object key, retained-image removal, and stable authenticated URL behavior remain covered.
- No DB schema or ordinary-attachment changes.

## Alternatives

1. Share only the frontend hook. This reduces dialog duplication but leaves Notice/Draft image ownership processing prone to contract drift.
2. Share both the frontend lifecycle hook and backend document processor while keeping domain adapters. Selected: it reuses the editor-save contract without merging authorization or business-row persistence.
3. Move authorization, API endpoint, and domain-row save into one generic service. Rejected: this couples distinct domain contracts and makes a future consumer harder to isolate. Sanitization remains common because it follows the shared editor contract.

## Validation

- Frontend hook tests cover upload session tracking, referenced-vs-session image separation, orphan/cancel cleanup, save completion, and serialized HTML/JSON.
- Notice and Draft consumer tests verify request DTO compatibility and their existing close/error behavior.
- Backend processor tests cover null token attrs, session validation, owner matching, promotion metadata checks, stable rewriting in HTML/JSON, and retained file IDs.
- Shared sanitizer tests verify identical HTML/JSON allowlist output, preserved supported typography/table styles, and rejection of active/unsafe content. Notice/Draft service tests verify each owner type/ID, row persistence, and after-save cleanup calls.
- Run focused Vitest suites, frontend build, focused backend suites, full backend tests, and `git diff --check`.
