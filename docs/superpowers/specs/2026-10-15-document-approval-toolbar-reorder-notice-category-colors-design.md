# Document Approval Toolbar Reordering and Notice Category Colors

## Status

Design approved by the user on 2026-10-15. The user selected an approval-toolbar-specific shared component, not a groupware-wide toolbar framework.

## Goal

Keep document approval controls consistent between feed and detail presentations, apply the requested toolbar order, and give notice categories stable category-specific colors without changing backend or common-code contracts.

## Existing behavior

- `DocumentApprovalDetailFeed` renders the approval actions, status chip, document-kind chip, divider, pin control, and conditional more menu in one local toolbar.
- Feed and detail use the same document component, but the toolbar layout is embedded in that larger component.
- Notice categories are loaded from active `NOTICE_GUBUN` common-code items. The client receives category code and name; the notice feed currently renders all category chips with the same blue colors.
- Document kinds already use distinct presentation colors. Important-notice emphasis is separate from the category label.

## Approved design

### Document approval toolbar

- Extract a feature-scoped `DocumentApprovalToolbar` component under the document-writing feature's `components` directory. Do not promote it to `src/shared` or build a general groupware toolbar framework.
- Keep permission checks, approval/cancel handlers, and menu construction in `DocumentApprovalDetailFeed`. Pass the resulting action controls and menu to the extracted component; the new component owns layout and visual ordering only.
- Render controls in DOM order as:
  1. Available approval action buttons
  2. Approval status
  3. Vertical divider
  4. Pin control
  5. Conditional more menu
  6. Document-kind chip
- Preserve existing action visibility, labels, handlers, pin behavior, menu eligibility, chip colors, chip dimensions, and responsive wrapping.
- Use the existing 4px Stack gap for neighboring controls. Keep the previously selected 8px divider-adjacent gaps by adding a 4px local margin after the status chip and before the pin control. The document-kind chip is now after the menu, so it is no longer adjacent to the divider.
- Keep the divider between status and pin. Since both are currently rendered whenever the toolbar is available, it must not appear as an orphan when there are no approval actions or no more menu.

### Notice category colors

- Add a frontend-only resolver keyed by `noticeGubunCode`; category names are not used as color identity.
- Explicitly map every currently active category code to a distinct entry in a fixed MUI semantic palette (`primary`, `secondary`, `info`, `success`, `warning`, or `error`) so the same category retains its color across posts and renders. When a new common-code category is introduced, add its code to this frontend map. Unmapped codes use a consistent fallback; posts without a category code retain the current default blue treatment.
- Apply colors to the notice category chip in light and dark modes. Do not change the `NOTICE_GUBUN` API shape, database schema, category labels, filters, or post payloads.
- Keep the important-notice (`isNotice`) treatment independent from the category color.
- Preserve the existing document-kind palette (`DRAFTING`, `BUSINESS_CONTACT`, `EXPENSE_RESOLUTION`, `ATTENDANCE_APPLICATION`).

## Alternatives considered

1. **Approval-toolbar-specific component and frontend category palette (selected):** centralizes the document toolbar's layout without broadening the component's consumers or changing data contracts.
2. **Groupware-wide toolbar framework:** offers wider reuse, but would require unrelated toolbar consumers and behaviors to be generalized.
3. **CSS-only visual reordering:** avoids component extraction but can leave DOM and keyboard order inconsistent with the visible order.

## Error handling and accessibility

- Keep existing buttons, labels, disabled states, and handlers intact when moving their layout.
- Preserve semantic button and menu elements and make tests assert DOM order rather than only visual style.
- Category fallback styling must remain readable in both light and dark themes; it must not silently replace a missing category label.

## Validation

- Extend the document approval toolbar tests to verify DOM order, 8px spacing contributions around the divider, and unchanged behavior when optional actions or menus are absent.
- Test category color stability for repeated codes, distinct presentation for configured category codes, fallback behavior, and dark-mode styling.
- Run focused frontend Vitest coverage, the frontend build, Problems validation, and `git diff --check`.
- Verify responsive rendering at 375px, 768px, and 1280px in the running application and record screenshots in the dated result folder when the authenticated view is available.

## Out of scope

- Backend API, common-code, or database changes.
- Changing document-kind labels or their current color assignments.
- Changing approval authorization, action availability, button behavior, or notice importance behavior.
- Generalizing notice and document toolbars into a shared groupware framework.
