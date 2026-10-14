# Electronic Approval Detail Header and Approval Line Design

## Goal

Match the electronic-approval detail header and read-only approval line to the
user-provided screenshots while showing a real, persisted document view count.
Keep approval data, actions, comments, attachments, and access rules unchanged.

## User-approved behavior

- Preserve the original author row: author avatar/name on the first line, then
  drafter/date/view-count metadata below the name.
- Keep the approval line in its own rounded, lightly tinted panel below the
  author row. Its header shows `결재선` and the drafter/date metadata from the
  reference image.
- Render approval participants in `stageOrder`, then `participantOrder`.
- Replace the long connector with a simple right chevron between approval
  cards; do not render a connector after the last card.
- Center the participant sequence marker and name together in the card footer.
  Keep the name on one line with ellipsis when it does not fit.
- Render agreement and reference participants in separate labeled rows beneath
  the approval cards. Preserve each participant's actual `stageOrder` marker
  and name; do not collapse these rows into unnumbered chips.
- Keep the approval line read-only and preserve the existing detail actions,
  status, and document behaviors.
- Count a document once per authenticated user and tenant, on the first
  authorized detail view only. Reopens, refreshes, retries, and concurrent
  requests by the same user do not add further views. List requests do not
  increment the count.
- Return the post-update count in the existing detail response and display
  that server value; never synthesize a client-side increment or fallback count.

## Design

### Frontend

- Restore the author metadata row above the approval-line panel.
- Keep the approval-line panel separate from that author row, matching the
  two-level structure of the supplied screenshots.
- Use compact `ChevronRight` icons as approval-order separators.
- Keep each approval card's fixed three-row layout and status seal. Center the
  stage marker and participant name as a single footer group; constrain the
  name to the remaining width and use ellipsis.
- Render agreement and reference groups as distinct labeled rows. Each
  participant row includes the original stage order and a truncated name.
- Read `viewCount` from the detail response and include it in the author
  metadata.

### Backend and database

- Add a non-negative `view_count` column to `tb_electronic_approval_main`,
  defaulting to zero.
- Add `tb_electronic_approval_view_history` with tenant, approval document,
  authenticated login-account, and first-view timestamp columns. Enforce one
  history row per `(tenant_id, electronic_approval_id, login_id)` and index
  document lookup by tenant and document ID.
- In the existing authorized detail service, verify the document and caller's
  access before recording a view. Resolve the login account from authenticated
  context, insert history with conflict-safe semantics, and increment the
  document counter only when the insert creates a row.
- Re-read the detail after every history insert attempt, including a duplicate
  conflict, so concurrent requests return the current committed counter.
  Preserve the existing endpoint route, response envelope, and all current
  detail hydration.
- Use dated SQL, matching change-history and rollback files in both
  `docs/database` and `backend/DATABASE`, and update the cumulative
  `docs/database/db-schema.md`.

## Boundaries

- No list-view increments, per-session counters, IP/device tracking, or
  unauthenticated view counting.
- No changes to document authorization, state transitions, comment history,
  approval-line mutations, or attachment handling.
- No UI-only fake `조회 1` value when the API does not return a count.
- Preserve unrelated pre-existing working-tree changes.

## Verification

- Frontend tests cover restored author metadata, actual `viewCount`, centered
  numbered participants, truncated names, simple chevrons, separate numbered
  agreement/reference rows, and read-only behavior.
- Backend tests cover first view increment, repeat view idempotency, another
  user's first view, denied/missing documents, and preservation of the existing
  detail response. Mapper tests verify the unique-conflict insert and guarded
  counter update that make concurrent duplicate requests idempotent.
- Run focused frontend and backend tests, then the frontend production build
  and backend test suite.
- Verify the detail at 375px, 768px, and 1280px with no page-level horizontal
  overflow; keep the approval flow's horizontal scrolling local to its cards.
- Record actual commands, results, and screenshots in the dated result folder.

## Evidence reviewed

- The current `tb_electronic_approval_main` schema has no view-count column.
- The current approval detail VO and MyBatis mapping have no `viewCount`.
- The detail API already validates the authenticated caller's document access.
- Notice view counting uses a tenant-scoped unique history row per user and
  increments the stored counter only for a newly inserted history row.
- The user approved applying that same per-user, per-document first-view
  policy to electronic approvals.
