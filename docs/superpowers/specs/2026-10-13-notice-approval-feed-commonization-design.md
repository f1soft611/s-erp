# Notice and Approval Feed Commonization Design

## Goal

Make the notice feed the shared visual and interaction baseline for both the
notice and electronic-approval workspaces. Common feed layout and UI should be
composed from reusable components rather than duplicated in feature-specific
pages. Preserve each feature's existing data services, permissions, and
business behavior.

## Scope

- Commonize the left feed list/card structure used by notices and electronic
  approvals.
- Commonize the right detail-panel shell and its composable content sections.
- Keep notice and approval data loading, API calls, permissions, and
  feature-specific actions in their respective feature areas.
- Add approval-only drafter metadata and a read-only approval-line area above
  the shared document-detail content.
- Render approval SYSTEM timeline items with a `시스템` badge and without
  comment mutation or reply controls.
- Preserve the existing notice appearance and behavior while switching it to
  the same shared components.

## Design

### Shared left feed

Create a reusable feed list/card presentation that accepts normalized feed
items and feature callbacks. It owns the shared card layout and responsive
presentation; it does not fetch data or decide domain permissions.

Notice and approval adapters map their existing data into the shared
presentation contract. Approval-specific status, document identifiers, and
available actions remain supplied by the approval adapter. Notice-specific
metadata and actions remain supplied by the notice adapter. Shared layout,
spacing, and common feed affordances follow the current notice UI.

### Shared right detail panel

Create a composable right-panel shell for the common header, close affordance,
scroll container, and detail-content layout. Compose the shell from shared
sections for attachments, reactions, previous-comment loading, comment
timeline, and comment entry. Sections accept data, state, and callbacks; they
do not make feature API calls.

The notice detail and approval detail both use this shell and shared sections.
Notice keeps its existing data and callbacks. Approval keeps its own detail,
comment, attachment, and permission services while supplying those values to
the shared presentation.

### Approval-only content

At the top of approval detail content, render drafter identity/date and a
read-only approval-line view. Display actual participants only, grouped and
styled as approval, agreement, and reference, in line with the supplied
reference image. Then render the document title, body, and embedded-image
previews. Below the document content, compose the same attachment,
like/bookmark, previous-comments, and comment sections used by notice.

Approval-line statuses and any existing drafter-only actions remain read-only
or permission-gated as they are today. The shared feed components do not
change approval state transitions.

### Comment timeline

USER comments continue to use existing reply, edit, delete, attachment, and
pagination behavior. SYSTEM events are merged into the approval timeline in
time order and receive a visible `시스템` badge. SYSTEM rows remain immutable:
no reply, edit, delete, or attachment mutation controls are rendered.

### Data flow and boundaries

- Feature hooks/services load and mutate notice or approval data.
- Feature adapters normalize records and pass state/callbacks to common feed
  components.
- Shared components render the normalized content and invoke supplied
  callbacks; they do not know API routes, authentication models, or domain
  permission rules.
- Notice is migrated to the common components in this scope so the shared
  contract is exercised by both consumers.

## Alternatives considered

1. Keep separate notice and approval feed layouts and copy the notice styling.
   This has a smaller initial extraction cost but allows the layouts to drift;
   not selected.
2. Make one large universal feed component responsible for loading and
   mutating both domains. This would centralize unrelated service and
   permission rules; not selected.
3. Share the left feed presentation, right-panel shell, and reusable content
   sections while leaving data and domain actions in feature adapters.
   Selected because it enables assembly and visual parity without coupling
   business logic.

## Error handling and compatibility

- Existing load, mutation, and attachment errors remain surfaced by their
  feature-owned flows.
- Shared components must not swallow callback failures or show success-shaped
  fallback data.
- Existing notice behavior, including comment pagination and attachment
  actions, must remain unchanged.
- Approval likes/bookmarks remain presentation-only unless their existing
  contract changes independently; this work does not add persistence.

## Verification

- Add or update component tests proving both notice and approval use the
  shared list/detail presentation and that notice interactions remain intact.
- Verify SYSTEM badge visibility and the absence of mutation controls on
  SYSTEM rows.
- Run focused frontend tests and the production build.
- Verify rendered layouts at 375px, 768px, and 1280px with browser checks and
  save screenshots in the dated result folder.
