# Shared Dialog Theme Surface Design

## Problem

Dialog surfaces need one shared theme rule so light mode consistently uses a
white background and dark mode explicitly uses a dark surface with readable
theme text. The shared `CommonDialog` currently mixes its themed paper/header/
footer surface with `background.default` for the body, and callers can force a
fixed surface color. The document composer currently forces white in dark mode.

## Approved approach

Define the shared dialog surface centrally in `CommonDialog`: white in light
mode and `#1e293b` in dark mode. Apply that same resolved surface to the dialog
paper, header, body, and footer so no region falls back to a different theme
background. Remove the document composer’s fixed white override so it follows
the shared rule. Keep an explicit `surfaceBackgroundColor` override available
for intentional callers, without changing editor-specific field and content
surfaces.

Add focused shared-dialog tests verifying consistent light/dark surfaces and a
document composer integration assertion preventing a fixed white override.

## Alternatives considered

1. **Centralize and apply a complete theme surface in CommonDialog (selected):**
   gives every common dialog consistent white light surfaces and explicitly
   defined dark surfaces.
2. **Fix only the document composer:** leaves other common dialogs subject to
   the same surface mismatch and duplicates theme handling.
3. **Keep body on `background.default`:** maintains a different body surface,
   but conflicts with the requested shared, consistent dialog treatment.

## Scope

- Update `CommonDialog`’s default surface resolution and apply it consistently
  to its paper, header, body, and footer.
- Remove the fixed white surface override from `DocumentComposerDialog`.
- Add focused tests for shared light/dark dialog surfaces and composer
  integration.
- Keep explicit per-dialog surface overrides, dialog layout, editor-specific
  backgrounds, form behavior, APIs, and unrelated dialog behavior unchanged.

## Verification

- Confirm common dialogs use white surfaces in light mode and consistent
  `#1e293b` surfaces in dark mode.
- Confirm the dark document composer no longer renders a white surface beneath
  light theme text, while preserving its editor-specific dark surfaces.
- Run focused theme/dialog tests and the frontend build.
- Recheck the shared browser in light and dark modes and capture the corrected
  modal without changing unrelated document content.
