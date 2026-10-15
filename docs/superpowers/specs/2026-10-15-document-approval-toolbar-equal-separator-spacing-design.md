# Document Approval Toolbar Equal Separator Spacing Design

## Goal

Make the visible spacing from the document-kind badge to the vertical divider match the spacing from the divider to the pin control in the shared document approval toolbar.

## Approved design

- Preserve the existing 8px document-kind-to-divider gap: the 4px Stack gap plus the kind Chip's 4px trailing margin.
- Set the divider-to-pin gap to 8px as well: the same 4px Stack gap plus 4px leading margin on the pin IconButton.
- Keep the existing toolbar order, control sizes, labels, colors, permissions, handlers, and responsive wrapping unchanged.
- Apply the adjustment in the shared feed/detail toolbar so both presentations stay consistent.

This supersedes the earlier 4px divider-to-pin spacing in [the toolbar visual consistency design](./2026-10-15-document-approval-toolbar-visual-consistency-design.md). The selected visual comparison is the 8px-each option; the alternative 4px-each option is not selected.

## Regression coverage

Extend the existing approval toolbar test to assert:

- The kind Chip's trailing margin is 4px.
- The pin IconButton's leading margin is 4px.
- The Stack's base gap remains 4px, yielding equal 8px gaps on both sides of the divider.
- Toolbar DOM order remains kind Chip, divider, pin control.

No browser interaction, API, authorization, or data contract changes are in scope.
