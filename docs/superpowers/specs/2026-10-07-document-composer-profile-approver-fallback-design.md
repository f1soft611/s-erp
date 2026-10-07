# Document Composer Profile-Based First Approver Fallback

## Context

The composer currently looks up the signed-in user's profile ID only in the
draft-form user-option list. If that list omits the current user, the composer
shows an error and never creates stage 1, even though the profile contains the
identity and display metadata needed for the fixed drafter approver.

The empty approval card also renders the visible text `직위/직함`; the requested
presentation is an empty position/title area while retaining the card's layout.

## Decision

Use the existing `/api/v1/users/me/profile` response as the authoritative source
for the fixed first approver when no exact profile-ID match exists in
`fetchDraftFormOptions().users`.

Construct the `F1GridUserOption` from the profile's `userId`, trimmed `name`,
`profileImage`, `levelName`, and `departmentName`. Preserve the existing fixed
stage and removal protection. Keep the selectable options list unchanged so
this fallback does not make the signed-in user an additional candidate for
other approval, agreement, or reference selections.

If the profile has no usable name or user ID, retain explicit load-error
handling rather than inventing an identity. If the profile identity is present
in the options list, continue using that option as before.

Render the empty position/title area without visible text while preserving its
row height and the accessible label on the overall empty approval card.

## Considered alternatives

1. **Build the fixed first approver from the profile (selected).** This uses
   identity and presentation fields already returned to the frontend and avoids
   changing the candidate API or exposing a currently excluded user in other
   selectors.
2. **Change the candidate API to always include the signed-in user.** This
   couples the UI correction to backend/API behavior and can change the options
   shown to every consumer of that response; it is unnecessary for the fixed
   initial stage.
3. **Match by a different identifier.** The current user-option contract has a
   `userId` field and the profile exposes `userId`; guessing another identifier
   would weaken duplicate prevention and is unsupported by the available
   contracts.

## Validation

- A regression test omits the profile user from selectable options and verifies
  that the profile user still appears as the non-removable first approver.
- A regression test verifies the empty title area has no visible placeholder
  text while the full empty-card content remains present.
- Run focused document composer tests, lint, and the frontend build.
- Confirm the composer behavior in the browser without exposing real identity
  data in screenshots.
