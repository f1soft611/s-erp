# Document Composer Identity and Hover Removal Design

## Status

Approved in conversation on 2026-10-07. The fixed drafter remains protected
from removal. Touch-only screens keep removal controls visible because they do
not have pointer hover.

## Context and root cause

The fixed drafter remains selectable because the two APIs use different
identifiers under the same `userId` name:

- `/api/v1/users/me/profile` maps `userId` to `tb_login_account.login_code`.
- `/api/v1/co/workflow/forms/users` maps `userId` to `tb_user.user_id`.

The earlier client-side trim only normalized whitespace; it could not make a
login code equal to the employee/user primary key. Database metadata confirms
both columns exist with different types (`login_code` is text and `user_id` is
bigint); no row data is needed to establish the mismatch.

## Decision

### Identity contract

Add a separate `employeeId` to the authenticated profile response, sourced
from the joined `tb_user.user_id`. Preserve the existing profile `userId`
meaning (`login_code`) for profile settings and other consumers. The document
composer resolves the fixed drafter by comparing normalized `employeeId` to
the normalized candidate `userId`; if no candidate exists, it builds the fixed
participant from profile display fields but uses `employeeId` as its identity.
Do not compare by display name or expose `login_code` in every selectable-user
option.

This changes the profile response shape additively and does not alter database
schema or user-selection APIs.

### Removal controls

- Keep the fixed first drafter non-removable.
- For each removable approval card, place an X icon button at the top-right of
  the position/title row. Hide it at rest on hover-capable devices; reveal it
  on card hover or keyboard focus within the card.
- For each agreement participant chip, replace the current delete icon with an
  X icon and use the same hover/focus reveal behavior.
- On touch-only devices, show X controls continuously so removal remains
  discoverable without hover.
- Keep button accessible names and existing individual removal behavior:
  removing an approval deletes its stage; removing one agreement participant
  leaves the other members in the shared stage, and removing the last member
  removes the stage. Recalculate stage sequence and restore removed users to
  the eligible candidate lists.

## Alternatives considered

1. **Add the employee primary key to the current-profile response (selected).**
   Preserves the existing `userId` contract and returns only the authenticated
   user's employee identifier in the self-profile response.
2. **Change profile `userId` from login code to employee ID.** Rejected because
   the profile page currently displays `profile.userId`, so this would be a
   breaking semantic change.
3. **Add login codes to all user-picker options.** Rejected because it exposes
   more account identity data to every option consumer and requires broadening
   the candidate contract unnecessarily.

## Scope

- Add `employeeId` to `MyProfileVO` and the `/users/me/profile` mapper result
  and response map.
- Update the frontend profile type and document composer matching/fallback.
- Update the approval fields so removable approval and agreement controls use
  hover/focus-visible X buttons with a touch-screen fallback.
- Add backend/profile-contract and frontend regression tests, update the dated
  direction/plan/specification and result report, and refresh responsive
  screenshots.
- No database schema migration is needed; the field is selected from an
  existing column.

## Validation

- Backend profile retrieval returns the employee primary key independently of
  the unchanged login-code `userId`; frontend creates the fixed first approver
  with that primary key and excludes the same account from approval, agreement,
  and reference candidates.
- Test that same-display-name users with different employee IDs remain
  selectable.
- Test that fixed drafter cannot be removed; removable approval and agreement
  controls use X icons, are hidden at rest and visible on hover/focus, and
  removal restores candidate eligibility and stage ordering.
- Verify touch styles keep X controls visible without hover.
- Run focused backend and frontend tests, applicable lint/build checks, and
  inspect the document composer in a browser at 375px, 768px, and 1280px.
