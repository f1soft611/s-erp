# Document Approval Toolbar Reordering Detailed Specification

## Purpose

Extract the document approval toolbar layout into a feature-scoped component and apply the same visible and DOM order in feed and detail presentations.

## Existing behavior

- `DocumentApprovalDetailFeed` supplies the shared toolbar for feed and detail.
- Approval actions, status chip, document-kind chip, divider, pin icon, and conditional more menu are currently rendered inline.
- Authorization checks, action callbacks, and more-menu eligibility are controlled by the parent component.
- Chips are 28px high with a shared 8px radius. Approval action button geometry and colors are already covered by the document-write tests.

## Functional requirements

1. Add `DocumentApprovalToolbar` under `frontend/src/pages/groupware/documents/write/components/`.
2. The component owns toolbar layout and control order only. `DocumentApprovalDetailFeed` continues to create action controls, status and kind chips, the pin control, the more menu, and all permission/handler logic.
3. Render the controls in this exact DOM and visual order:
   1. Any currently eligible approval actions, in their current order.
   2. Approval status chip.
   3. Vertical divider.
   4. Pin control.
   5. More menu when currently eligible.
   6. Document-kind chip.
4. Preserve existing action/menu visibility and behavior in both feed and detail.
5. Keep the divider between status and pin even when there are no approval actions or no more menu. Do not render an orphan divider outside the toolbar.
6. Preserve toolbar wrapping, alignment, width, control labels, action geometry, chip height, chip radius, and existing document-kind colors.
7. Preserve the previously selected 8px spacing around the divider with a 4px horizontal `columnGap` and 4px local margins on the status and pin sides. The document-kind chip is no longer adjacent to the divider; its separation from the preceding menu uses the base 4px column gap.
8. Do not change authorization, API, state transitions, or any notice-toolbar behavior.

## Component contract

`DocumentApprovalToolbar` accepts React-node slots:

- `approvalActions`: optional action controls.
- `status`: required status chip.
- `pinControl`: required pin control.
- `moreMenu`: optional more-menu controls.
- `documentKind`: required document-kind chip.

The component keeps the existing `data-testid="document-approval-toolbar"` on its wrapping row so current consumers and tests can continue locating it.

## Validation requirements

- Component test verifies slot DOM order, divider placement, optional actions/menu, the 4px column gap, and the 4px local margins on each side of the divider.
- Document-write integration test verifies feed approval action order, status and document-kind presentation, existing button geometry/colors, and the current permission conditions.
- Run the focused Vitest files:

```powershell
Set-Location frontend
npx vitest run tests/document-approval-toolbar.test.tsx tests/document-write-page.test.tsx
```

- Run `npm run build` from `frontend`, Problems validation on changed TSX/test files, and `git diff --check`.
- Check the rendered toolbar at 375px, 768px, and 1280px in the authenticated app. Save screenshots in the dated result folder if the authenticated view is accessible; otherwise record that the visual browser check could not be completed.

## Out of scope

- A groupware-wide toolbar abstraction.
- Changes to approval permissions, API contracts, document status or kind metadata, labels, or handlers.
- Changes to notice category rendering.
