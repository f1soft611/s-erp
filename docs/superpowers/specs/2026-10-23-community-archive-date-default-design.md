# Community Archive Upload Date Default and Reset Design

## Goal

Make the archive `올린 날짜` filter use the same server-date default mechanism as Document Status. On initial entry and after detailed-search reset, it must represent the most recent calendar year through the server's current date.

## Approved behavior

- Resolve the range from the existing system-date service: `from` is system date minus one calendar year, and `to` is system date.
- Reuse the existing page-search date-default metadata and `usePageSearchDefaults`; do not add archive-specific date calculation or a backend endpoint.
- Do not issue the initial archive file-list request until defaults are resolved. On resolver failure, show the error and retry action; do not fall back to the browser clock or issue an unbounded request.
- Use the resolved range consistently in the detailed-search inputs, the applied date summary, and list filters.
- Reset the quick keyword and file type to their existing initial values, reapply the same recent-year range to the list query, and preserve the current folder location.
- Keep the existing date-order validation and open-ended date-range behavior for manually edited search values.
- No database or backend API changes.

## Implementation boundary

Update only the archive page and list initialization needed to consume the shared defaults, its page-level tests, and directly related archive search documentation/results. Preserve unrelated worktree edits already present in archive files. The shared date resolver itself is not changed.

## Validation

- Verify server-date-derived initial field values and filters using a controlled system date.
- Verify no archive-list call occurs while defaults are pending, and resolver failure exposes retry without a browser-date fallback.
- Verify reset restores the recent-year values and applies the corresponding list filters while resetting the keyword/type and retaining the folder.
- Run the focused archive page test, frontend build, `git diff --check`, and browser checks at 375px, 768px, and 1280px. Capture the requested result screenshots.
