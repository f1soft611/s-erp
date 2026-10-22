# Groupware Profile Avatar Design

## Goal

Show a user's saved profile image wherever a person is already represented by a profile/avatar in the document and notice flows. Preserve each screen's current name or initials when the image is absent or cannot load.

## Scope

- Document author and approval detail, including approval, agreement, and reference participants.
- Notice author and comment author displays in the notice feed/detail.
- Existing user selection/profile displays in document and notice compose flows.
- No new profile UI in places that currently show only plain text.
- No profile editing, image upload, or unrelated groupware domains.

## Behavior

- A non-empty profile image URL is rendered as the avatar image.
- An absent or failed image falls back to the exact name/initial content currently shown at that location.
- Preserve current avatar sizes, layout, colors, accessible names, and surrounding interactions.
- Do not change rendering or fallback for approval status seals.

## Design

- Add a shared `ProfileAvatar` component backed by MUI `Avatar`. It accepts the profile image and existing fallback content, and leaves size and styling to the caller. MUI's image fallback behavior keeps the current name/initial display when an image is absent or fails.
- Replace the person-avatar markup in document and notice flows with the shared component. Existing approval participant profile image fields and document user-selection `avatarUrl` values are reused.
- Where read responses do not currently include profile images, add optional nullable response fields for document authors, notice authors, and comment authors. Populate them from the existing account profile-image data using tenant-scoped joins after confirming the current schema and account linkage through the read-only DB MCP.
- Keep response envelopes and existing comment/document/notice behavior unchanged. No new table, column, migration, or image endpoint is planned.

## Data Flow

1. Existing document, notice, or comment reads return author identity and an optional profile image.
2. Tenant-scoped query joins provide profile images without dropping existing document, notice, or comment rows when an account image is absent.
3. The affected screens pass the optional image and their current fallback content into `ProfileAvatar`.
4. A missing/failed image renders the same fallback that is currently shown.

## Error Handling

- A missing image is normal and uses the existing fallback.
- An image that fails to load uses the same fallback.
- Errors loading the document, notice, or comment data continue through the existing API error handling; they are not hidden as avatar fallbacks.

## Verification

- Shared component tests cover a supplied image, no image, and image load failure while preserving caller-provided fallback content.
- Focused document and notice tests cover image propagation for author, comment, and approval participant displays and verify existing fallback behavior.
- Mapper/service tests verify nullable profile-image mapping and tenant-scoped joins without changing existing result rows.
- Run focused frontend/backend tests and the frontend production build.
- Verify affected layouts at 375px, 768px, and 1280px in the existing browser session, then save screenshots and a result record in the dated result folder.

## Constraints

- Before backend response/query changes, inspect the current DB contract with the workspace read-only MCP as required by the project.
- Existing worktree modifications must be preserved; changes should be limited to this task's files.
- API fields are additive and nullable so existing consumers remain compatible.
