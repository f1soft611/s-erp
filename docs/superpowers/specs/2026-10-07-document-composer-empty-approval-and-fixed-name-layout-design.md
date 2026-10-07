# Document Composer Empty Approval and Fixed Approver Layout

## Context and findings

The approval selector filters assigned users by `String(user.value)`, and the
profile ID is trimmed before it is stored in the initial fixed stage. Candidate
IDs are currently copied without trimming in `toUserOption`. If the same
account's candidate ID contains surrounding whitespace, the displayed fixed
stage ID and candidate ID differ, so duplicate filtering can leave the account
selectable. Do not hide users by display name: names are not unique identifiers.

The empty approval slot currently leaves visible `도장` and `이름` labels even
though the position/title label was removed. The fixed approver's name cell is
also given a 3em maximum width and a delete-button column even though the fixed
stage has no delete button. Browser inspection measured the name cell at 27px
with 35px of text content, confirming the current text is clipped.

## Decision

1. Trim the candidate `userId` while converting draft-form user options. This
   aligns candidate and profile IDs before initial matching, cross-role
   duplicate filtering, and approval/reference handlers run. Keep identity
   comparisons ID-based; do not add name-based exclusions.
2. Keep all three empty approval slot regions and their accessible labels, but
   render no visible placeholder text in the position/title, seal, or name
   regions. Preserve row heights, dashed borders, and the accessible group name.
3. For a fixed approver, size the participant name row without a delete-action
   column and remove the arbitrary 3em name cap. Keep the one-line layout and
   existing overflow treatment for exceptionally long labels; ordinary
   drafter text must fit in the newly available width. Removable participants
   retain their delete column and existing behavior.

## Considered alternatives

- Filtering by name or name plus department could suppress a different person
  with the same display name. This is rejected in favor of normalized identity
  values.
- Wrapping every approver name and allowing the card to grow would avoid
  truncation for arbitrarily long labels but would change card height and grid
  alignment. It is not required for the measured clipping defect; freeing the
  fixed card's unused action width and removing its hard cap is the smaller
  change.
- Showing position/seal/name placeholders in empty slots conflicts with the
  requested visual state. Keep semantic labels for assistive technology while
  leaving the visual regions blank.

## Validation

- Test a profile ID and candidate ID that differ only by leading/trailing
  whitespace. The initial stage must use the candidate option's normalized ID,
  and the account must not appear in approval, agreement, or reference choices.
- Test that the empty slot retains all accessible region labels but renders no
  visible `직위/직함`, `도장`, or `이름` text.
- Test that fixed participants do not reserve a delete column or a hard-coded
  3em name width; removable participants retain their delete action.
- Run the document composer tests, lint, build, and check the existing browser
  at 375px, 768px, and 1280px. Compare the fixed approver name cell's
  `scrollWidth` to `clientWidth` without logging or capturing identity values.
