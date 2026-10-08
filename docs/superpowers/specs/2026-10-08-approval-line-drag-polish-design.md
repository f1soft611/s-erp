# Approval-line drag-and-drop visual polish

## Goal

Improve visual clarity while reordering approval stages in the document approval settings dialog, without changing approval-line behavior or adding a drag-and-drop dependency.

## Approved interaction

- Keep native HTML5 drag and drop.
- Only the drag handle starts a drag; the rest of the stage remains available for chips and move controls.
- Give the dragged stage a clear lifted appearance using a stronger outline, shadow, and reduced opacity.
- Show an insertion marker at the upper or lower edge of the hovered stage, based on whether the pointer is in its upper or lower half. The marker must correspond to the actual resulting order.
- Add a brief movement transition to stage cards after reorder.
- Clear drag and insertion feedback after drop, cancellation, or leaving the list.
- Respect `prefers-reduced-motion`.
- Keep the fixed drafter immovable, preserve existing arrow controls, and preserve agreement groups as a single stage.

## Implementation boundaries

- Change only the approval settings dialog and directly related tests and result documentation.
- Do not add packages, change approval data contracts, change backend/API behavior, or redesign the rest of the dialog.
- Reuse existing theme tokens and accessible controls.

## Verification

- Add or update tests for handle-only drag initiation, dragged/target visual states, insertion direction and resulting order, and feedback cleanup.
- Run the focused settings-dialog tests and frontend build.
- Verify the drag interaction at 375px, 768px, and 1280px, including that drag handles, insertion markers, and move controls remain visible and usable.
- Record the behavior and screenshots in the existing dated result folder.
