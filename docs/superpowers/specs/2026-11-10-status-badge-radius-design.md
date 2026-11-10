# Status Badge Colors and Radius Design

## Goal

Use the attached compact approval-tag appearance as the visual reference for document approval states, document kind, and notice category, and make the frontend's ordinary corner radius consistent.

## Recommended approach

Keep the existing canonical presentation metadata and status components. Map approval states to semantic MUI colors (neutral draft, blue in-progress, green approved/sent, red rejected, orange revision request), map document kinds to distinct semantic colors (blue drafting, green work, orange expense, purple attendance), and preserve the code-derived notice-category palette using outlined category badges. Apply the existing 6px theme radius consistently to badges and other rectangular UI. Preserve truly circular elements and intentionally square joins.

## Alternatives considered

1. Override every MUI component globally with CSS: low implementation cost, but risks changing circles, joins, and nested component geometry unpredictably.
2. Change only the document/notice badges: safest and narrowest, but does not satisfy the explicit project-wide radius request.
3. Normalize explicit frontend radii to the existing 6px theme value while preserving circle/zero exceptions: broad but predictable, and recommended.

## Boundaries and verification

No status transitions, labels, APIs, DB schema, notice category codes, or layout behavior change. Verify semantic mapping in Vitest, run the frontend build, and inspect 375px, 768px, and 1280px browser renderings using synthetic data.
