# Notice Category Colors Detailed Specification

## Purpose

Give active notice categories distinct and stable category-specific colors while keeping their current labels and preserving the existing notice API and common-code contracts.

## Existing behavior

- `useNoticeCategories` loads active items from the `NOTICE_GUBUN` common-code group as `{ code, name }`.
- `NoticeFeedItem` carries `noticeGubunCode` and the resolved display name.
- `NoticeFeedList` currently applies one blue background/text style to every category chip.
- Important-notice emphasis is based on `isNotice`; it is separate from the selected notice category.
- Document kinds already use a separate per-kind palette and are not changed by this specification.

## Functional requirements

1. Add a frontend category presentation resolver under `frontend/src/pages/groupware/community/notice/data/`.
2. Use the trimmed `noticeGubunCode` as the identity key; do not derive colors from display names.
3. Generate the color deterministically from the code so tenant-specific and newly added categories receive a color without explicit registration. The same category code must receive the same colors for every post and render.
4. Apply soft, readable foreground/background colors in both light and dark modes. The category label remains the existing `item.state`.
5. If a category code is missing or blank, use the existing blue treatment as a consistent fallback.
6. Keep `isNotice` importance styling independent from the category color. Do not change category filters, category names, or notice post payloads.
7. Do not add category color fields to the common-code API, frontend API types, or database.
8. New common-code categories receive a color automatically from their category code; no per-category frontend registration is required.

## Color-generation contract

Normalize the code using `trim()`. For each Unicode character in the normalized code, update an unsigned 32-bit rolling hash with `hash = (hash * 31 + codePoint) >>> 0`. Use `hash % 360` as the hue. Use these fixed HSL pairs:

| Theme | Background | Text |
|---|---|---|
| Light | `hsl(hue 75% 92%)` | `hsl(hue 65% 30%)` |
| Dark | `hsl(hue 55% 24%)` | `hsl(hue 80% 84%)` |

The 360-degree palette yields stable category colors without maintaining tenant-specific code lists. Different codes can theoretically hash to the same hue; representative distinct codes must be covered by tests. Missing or blank codes retain the exact existing blue styles.

## Validation requirements

- Unit tests verify code trimming, deterministic output for repeated codes, distinct output for representative different codes, automatic color generation for an unregistered non-empty code, and the fallback for a missing/blank code.
- Rendered tests verify category labels are unchanged, representative category colors differ in light and dark modes, and importance styling remains unchanged.
- Run the focused Vitest files:

```powershell
Set-Location frontend
npx vitest run tests/notice-category-presentation.test.ts tests/notice-page.test.tsx
```

- Run `npm run build` from `frontend`, Problems validation on changed notice files and tests, and `git diff --check`.
- Record exact validation evidence in the dated result document. Keep this frontend-only; no migration or backend verification is required.

## Out of scope

- API, database, common-code management, or notice composer changes.
- Changing the category labels or filter behavior.
- Changing important-notice semantics or document-kind colors.
