# Community Archive File and Folder Name Style Design

## Context

The archive F1Tree currently renders folder and file names as MUI text buttons,
which inherit the primary blue color. File icons use a separate archive-only
extension/MIME mapping and a neutral color. Notice/document attachment lists
already share `getAttachmentIconMeta`, including consistent icon shapes and
extension-specific colors.

## Approved behavior

- Render folder names in the primary text color with bold weight. Keep the
  existing button and `onFolderOpen` behavior unchanged.
- Render file names in the primary text color without changing their normal
  weight. Keep the existing download button behavior unchanged.
- Render folder icons in a muted gray (`text.secondary`) regardless of folder
  active status. The existing active/inactive text and status chip behavior
  remains unchanged.
- Render extension icons with the icon component and extension-specific
  foreground/background colors returned by the shared
  `getAttachmentIconMeta` helper.
- Do not change file operations, folder activity indicators, API contracts,
  filtering, or F1Tree navigation.

## Implementation approach

Reuse `getAttachmentIconMeta` rather than duplicating the attachment extension
map in the archive grid. Render its icon in the same compact colored container
used by shared notice attachments. Set name button colors explicitly to
`text.primary`; set only folder-name weight to bold.

## Verification

Add focused archive page assertions for neutral name styling, bold folder name,
the existing folder-navigation and file-download callbacks, and an extension
icon's attachment-matching colors. Run the archive page tests and its targeted
lint, then verify the archive page at 375px, 768px, and 1280px in the browser
and save screenshots under the dated result directory.
