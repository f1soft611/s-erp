# Notice Category Document-Kind Style Design

## Status

Approved by the user on 2026-10-15. The user requested that notice-category badges use the filled visual treatment of document-kind badges while retaining distinct category colors.

## Goal

Make notice-category chips visually consistent with the saturated, filled document-kind chips used in the document-writing area without losing category-specific color identity.

## Current behavior

- The notice feed resolves a stable hue from each trimmed `noticeGubunCode`.
- Category chips use pale HSL backgrounds and darker HSL text in light and dark themes.
- Missing category codes use the existing blue fallback.
- Document-kind chips use a filled MUI Chip with the document-kind palette, a 28px height, and feature-specific border radius.

## Approved design

Follow-up approved on 2026-10-15: apply a 28px height and 8px corner radius to notice feed category chips, including the detail panel that uses the same component. A category whose displayed `item.state` is `필독` always has white text in both themes; other categories retain theme-derived contrast text. This supersedes the original size/shape preservation and universal contrast-text rules below.

- Keep the notice category code as the stable identity; preserve deterministic code-derived hue selection for known, unknown, and tenant-specific categories.
- Replace the pastel category background with a saturated filled color that reads like the existing document-kind chips.
- Derive foreground text color from the active MUI theme's contrast helper for the chosen background. Use the theme's primary color for missing or blank codes so the fallback also uses a filled treatment.
- Preserve the notice category label, filter behavior, important-notice styling, API/data contract, and chip size/shape. This request concerns the filled color treatment only; it does not move or resize badges.
- Keep the change within the notice category presentation helper, notice feed chip, their tests, and the dated task documentation.

## Alternatives considered

1. **Saturated code-derived fills with theme-aware text contrast (selected):** keeps categories visually distinct and supports tenant-specific categories without registration or contract changes.
2. **Assign the document-kind palette colors to category codes:** closely reuses the named MUI colors but can produce collisions among more than four categories.
3. **Use one document-kind color for every notice category:** simplest, but removes existing category color distinctions.

## Error handling and accessibility

- Do not silently change a category label when its code is absent.
- Use the MUI theme's contrast helper for text foreground instead of assuming white or dark text works for every generated hue.
- Keep category color behavior independent from importance/pinning semantics.

## Validation

- Test stable and distinct code-derived backgrounds, blank-code fallback, and light/dark rendering.
- Verify labels and importance behavior remain unchanged.
- Run focused Vitest coverage, the frontend build, Problems validation, `git diff --check`, and browser rendering when the notice page can load.

## Out of scope

- Backend, API, common-code, or database changes.
- Changing document-kind colors or sizing.
- Changing notice category labels, filters, importance behavior, or badge layout.
