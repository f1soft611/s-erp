# Document Approval Backend Separation Design

## Goal

Separate the backend responsibilities used by the document-writing and document-status pages into eGovFrame-style layers without changing their existing behavior or API contracts.

## Current Context

- The document-writing and document-status frontends already have separate page, service, and type directories.
- The backend currently puts draft writing, document lists, status search, details, workflow actions, comments, attachments, and embedded images in one `DocumentApprovalApiController` and one `DocumentApprovalServiceImpl`.
- The current `DocumentApprovalServiceImpl` does not extend `EgovAbstractServiceImpl`; existing groupware service implementations such as `NoticeBoardServiceImpl` do.
- The pages use distinct list contracts: writing uses `/api/v1/groupware/approvals/documents`, while status search uses `/api/v1/groupware/approvals/documents/search`.
- Detail, workflow, comment, and attachment behavior is shared because the status page reuses the writing page's detail workflow.
- The working tree already contains uncommitted status-list behavior changes. Those changes are out of scope for replacement and must be preserved during extraction.
- Read-only PostgreSQL MCP metadata confirmed the existing electronic approval main and approval-line tables contain the fields used by the pages. No schema change is required.

## Chosen Architecture

Keep existing routes, methods, request/response shapes, authorization behavior, and database schema. Split HTTP and service responsibilities by use case; retain shared services and persistence where both pages rely on the same behavior or SQL.

All controllers remain under `/api/v1/groupware/approvals`. They are separated by non-overlapping route groups:

| Responsibility | Controller routes | Service responsibility |
|---|---|---|
| Document writing | Draft create/update, writing lists/feed, pinned writing lists, pin state, summary, temporary embedded-image upload/delete | Draft lifecycle, writing-page list/feed projections, pins, summary, and editor temporary images |
| Document status | `/documents/search` | Status filters, validation, authorized status search, sorting, and page/total-row behavior |
| Shared document interaction | Detail, submit/cancel/action, delete, comments, attachments, and embedded-image streaming | Shared document access, workflow actions, and detail-related collaboration |

The shared `/documents` writing-list endpoint remains distinct from `/documents/search`; it is not repurposed for status search. Shared detail and workflow operations remain reusable by both pages.

Each responsibility has a Controller, Service interface, and Service implementation. Service implementations follow the existing eGovFrame convention by extending `EgovAbstractServiceImpl`, retaining constructor injection, and applying transactions to mutating operations. The existing `DocumentApprovalDAO` and MyBatis mapper remain shared to avoid duplicating SQL and changing persistence behavior.

## Request and Data Flow

1. A controller receives the current `LoginVO` and the existing query/request VO.
2. The corresponding Service validates the request and derives tenant/user constraints from the authenticated user.
3. The service calls the shared DAO/mapper with the same parameter semantics as today.
4. The controller builds the same `ResultVO` fields and HTTP status as the current endpoint.

The document status service retains the existing allow-listed sort fields, date and filter validation, tenant and participant scope, and response shape. The unpaged full-result behavior in the current working-tree changes is preserved. The writing service retains draft, list/feed, pin, summary, and editor behavior. Shared interactions retain their existing permission and document-status checks.

Existing error signaling remains explicit. Request validation continues to use the current error contract; transactional failures are not caught or converted into successful responses.

## Persistence and Compatibility

- No table, column, constraint, or data migration is introduced.
- Existing URLs, HTTP methods, request parameters, response JSON, frontend service calls, and authorization scope remain unchanged.
- DAO/mapper SQL remains shared unless extraction reveals a necessary statement relocation; SQL logic itself must not be redesigned as part of this task.
- Existing in-progress working-tree changes are preserved and moved to the appropriate status service/tests without reverting or overwriting unrelated files.

## Validation

- Reorganize controller tests to assert that each existing route keeps its request/response contract.
- Reorganize service tests to cover writing, status validation and scope, and shared detail/workflow behavior.
- Keep mapper tests proving the existing SQL conditions and the current unpaged status behavior.
- Run focused approval controller/service/mapper tests, then the complete backend `mvn test`.
- Run the focused frontend document-write and document-status service tests to verify that unchanged API contracts remain compatible.
- Record the refactor, DB MCP metadata check, preserved working-tree behavior, and test results in the dated result document. No frontend visual behavior is intentionally changed.

## Out of Scope

- New or changed API paths, request/response fields, or status codes.
- Frontend layout or behavior changes.
- Database schema changes or data migrations.
- A broad rewrite of approval workflow rules or mapper SQL.
