# Document Composer Approval Stage Design

## Status

Approved in conversation on 2026-10-07. This design supersedes earlier document-composer approval numbering and empty-slot presentation decisions for this change.

## Goal

Make approval, agreement, and reference participants consistent in the document composer: initialize a protected first approval stage for the signed-in user, prevent a user from being assigned more than once, and number stages so members of one agreement group share a sequence.

## Participant initialization and uniqueness

- After form options and the signed-in profile load, resolve the signed-in user by exact `userId` match against the available user options.
- Add that user as the first approval participant with sequence 1. This first stage is fixed and cannot be removed from the composer.
- If the signed-in profile has no usable name or its `userId` does not match a user option, show an explicit load error rather than silently creating an incomplete or unidentified stage.
- A user already committed to an approval or agreement stage, selected in the active approval selector, or selected as a reference is unavailable in the other selectors.
- Removing a non-fixed approval or agreement participant makes that user available again. The signed-in first approval participant remains unavailable to every other role.
- Clearing the composer resets its stages, selections, and fixed signed-in participant; opening it again reloads and initializes the signed-in participant.

## Stage ordering and sequence

Assign sequence numbers by stage order, starting at 1:

- Each approval participant is an individual approval stage and receives its own sequence.
- All users committed together by one `합의 추가` action form one agreement stage and share that stage's sequence.
- An agreement stage consumes one sequence regardless of how many users it contains.
- A later approval or agreement stage receives the next sequence. Removing a removable participant/stage recalculates the remaining sequence numbers in stage order.

Example:

| Stage | Displayed sequence |
|---|---:|
| Signed-in drafter approval | 1 |
| Agreement group with two users | 2 for both users |
| Next approval participant | 3 |
| Following approval participant | 4 |

## Composer presentation

- Keep the existing row order and responsive approval-slot capacity behavior.
- Remove the visual divider between the approval row and the agreement row.
- Render an empty approval slot as the unfilled form of an approval column: position/title area, seal area, and name area inside a dashed outline. Empty slots do not show a sequence or remove action.
- Keep committed approval columns and participant-level removal, except the fixed signed-in first approval participant has no remove action.
- Do not render a seal placeholder for an unapproved agreement participant. Show an agreement seal only when an explicit approved state is available; do not invent an approval state or add API behavior in the composer.
- Keep the agreement row conditional on the presence of agreement participants and retain reference selection behavior apart from cross-role duplicate filtering.

## Scope and boundaries

Update only the document composer hook and approval-field/dialog presentation, focused composer tests, and the corresponding dated direction, plan, specification, and result records. Do not change APIs, routes, shared user-selection behavior, the rich-text editor, backend, or database.

## Verification

- Test that the signed-in user appears as the fixed sequence-1 approval participant after successful profile/options loading, cannot be removed or selected for another role, and is not duplicated when selected in the approval selector.
- Test an explicit error when the signed-in `userId` is missing from available user options.
- Test that approval, agreement, and reference selectors cannot assign an already committed or actively selected user across roles, and that removing a removable participant restores eligibility.
- Test the example stage numbering: signed-in approval 1, two agreement users both 2, and subsequent approval stages 3 and 4.
- Test that the approval/agreement divider is absent, empty approval columns have the complete dashed placeholder layout without a sequence or remove action, and unapproved agreement participants have no seal placeholder.
- Preserve existing responsive slot-capacity, wrapping, row-order, agreement-removal, and reference-selection coverage. Verify in a browser at 375px, 768px, and 1280px using synthetic names only.
- Run the focused composer tests, changed-file lint, and the frontend production build.

## Alternatives considered

1. **Sequence by stage (selected):** each approval user gets an individual stage sequence; all users in one agreement group share one sequence. This matches the clarified example and makes the agreement group parallel at one approval step.
2. **Sequence each participant globally:** agreement users in one group receive different numbers. This conflicts with the clarified requirement that they share the stage sequence.
3. **Have agreement groups reuse the preceding approval number:** agreement stages do not consume a sequence. This does not match the clarified example, where the agreement group is sequence 2 and the next approval is sequence 3.
