# Document Write Filter Reset Design

## Goal

Allow users to return to the complete document list after narrowing results in
the document-writing page, regardless of whether they are using feed or list
view.

## Current behavior

The 업무구분 filter already has an `전체` option. However, selecting a scope
from the approval summary or document status panels, or selecting a specific
document from an approval notice, can narrow the document list without a
dedicated way to clear every active condition.

## Design

Add an `전체 조회` action beside the existing document-kind filter in the
shared feed/list toolbar. Show the action only when a narrowing condition is
active: a non-default approval scope, a selected document kind, or a selected
document ID.

The action resets the approval scope to `ALL`, clears the selected document
kind, and clears the selected document ID. It does not change the current
view mode. The existing list-loading effect will fetch the document list and
summary using the existing API contract; no backend or database changes are
needed.

Use one reset callback in `useDocumentWritePage` so all three filter values
are reset together. Keep the existing individual filter behaviors unchanged.

## Error handling

The reset action uses the existing list request lifecycle. Loading, load errors,
and retry behavior remain unchanged; the reset action must not imply success
before the unfiltered response has loaded.

## Verification

- Test that resetting from a non-default scope, selected kind, and selected
  document clears all three conditions and requests the unfiltered list.
- Test that the toolbar exposes `전체 조회` while a filter is active and hides
  it when all conditions are at their defaults.
- Test that the current feed/list mode is preserved through reset.
- Run the focused document-write tests and the frontend production build.
- Verify the action and restored result in the browser at 375px, 768px, and
  1280px, then record screenshots and the result in the dated result folder.

## Scope

Only the document-writing page UI, its state hook, related frontend tests, and
the corresponding dated work documents/results are in scope. The existing
uncommitted changes in the worktree must be preserved. No API, backend, or
database behavior changes are included.
