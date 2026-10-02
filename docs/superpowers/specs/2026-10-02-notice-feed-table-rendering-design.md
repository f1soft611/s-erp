# Notice Feed Table Rendering Design

## Goal

Render notice-feed tables with the same typography and horizontal table scrolling as the notice composer. Font family and size, text emphasis, and other safe inline text styles must remain visible. A table wider than the feed content area scrolls inside its own wrapper without widening the feed card.

## Current Behavior

- The composer uses Tiptap and `noticeContentStyles`, including `.tableWrapper` with `overflow-x: auto`.
- The feed sanitizes notice HTML with the shared `sanitizeHtml` function. That sanitizer unwraps unsupported `div` and `span` elements, removes their classes, and drops font-family/font-size styles.
- Notice save also uses the shared `sanitizeHtml` function, so font-family/font-size styles can be removed before the body is persisted.
- As a result, saved editor table wrappers and inline typography do not reliably survive save and feed rendering, so the existing `.tableWrapper` rule is not sufficient.

## Design

- Add a notice-specific sanitizer and use it for notice body save and feed rendering. Keep the shared sanitizer's default behavior unchanged for comments and other consumers.
- The notice-specific sanitizer allows `span` text marks and a strict inline-style allowlist for font family, font size, font style, font weight, color, line height, and text decoration. Existing HTML escaping, unsafe-tag removal, and safe URL checks remain in force.
- On save, sanitize and persist the notice HTML without adding layout wrappers. In the feed rendering path, sanitize the saved HTML and wrap each table not already inside a `.tableWrapper`. Feed wrappers are presentation-only and are not persisted or sent to the API.
- Apply the existing `noticeContentStyles` to feed content so typography, table borders, dimensions, and wrapper scrolling stay aligned with the composer. The containing feed card remains width-constrained.
- Apply the behavior to both collapsed and expanded feed content. Keep current preview height/masking and interaction behavior; only the table region receives horizontal scrolling.
- Persist safe notice typography in the existing HTML body field. No API field, database schema, or JSON contract changes are introduced.

## Alternatives

- CSS-only table overflow: avoids HTML transformation but is less reliable for intrinsic-width tables and does not restore styles removed by sanitization.
- Change the shared sanitizer globally: smaller implementation surface, but changes comment and other HTML consumers unnecessarily.
- Persist wrapper markup in notice HTML: rejected because scrolling is a display concern and does not require a storage/API contract change.

## Verification

- Unit tests verify notice-only sanitization preserves safe font styles, removes unsafe markup/styles, and adds exactly one wrapper around tables.
- Feed tests verify sanitized notice content retains font-family/font-size and table wrapper in both collapsed and expanded states.
- Browser checks at desktop and narrow viewports verify typography matches the composer, the feed card does not grow horizontally, and the table wrapper scrolls horizontally.
- Run focused notice tests and the frontend build. No backend or database changes are expected.

## Scope

- Notice body HTML sanitization and feed display only.
- No API field, database schema, attachment handling, or comment sanitization changes. Existing notice HTML may now retain the approved safe typography already present in the composer.
