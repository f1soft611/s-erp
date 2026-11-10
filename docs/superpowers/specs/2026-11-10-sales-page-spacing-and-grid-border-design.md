# Sales Page Spacing and Grid Border Alignment

## Context

The four sales status pages use consistent outer padding: 8px horizontally on extra-small screens, 16px horizontally from small screens, 8px above, and 16px below. Their registration pages currently use different outer padding. The delivery-plan status list also nests the bordered F1Grid inside an outlined Paper, creating a second frame around the grid.

## Design

- Treat the existing status-page list/content padding as the reference: `px: { xs: 1, sm: 2 }, pt: 1, pb: 2`.
- Update the corresponding four registration-page content wrappers to use the same padding.
- Preserve embedded registration content with no outer padding and the documented larger order-save error spacing exception, which keeps the error message's top and bottom gaps balanced.
- Align status-page error and search-result messages with the grid's horizontal edges. Add an opt-in message padding mode while preserving default message padding in other screens; use the grid gutter for messages outside the content wrapper and zero inner gutter for messages already inside it.
- Replace only the delivery-plan status list's outlined Paper shell with an equivalent layout Box. Keep the F1Grid border, dimensions, loading state, and behavior unchanged so the grid has one standard border.
- Leave search controls, vertical message spacing, detail panels, and all API/data behavior unchanged.

## Message Alignment

- Keep the shared message component's default horizontal padding unchanged.
- Expose an optional horizontal-padding mode through `SearchResultMessage`.
- Apply the status-grid gutter (`xs: 8px`, `sm` and above: `16px`) to messages outside the status content wrapper.
- Use zero additional message padding inside delivery-plan status content, where the parent already provides that gutter.
- Cover both error and search-result messages in the four sales status pages.

## Verification

- Add focused regression coverage comparing all four registration/status page pairs, message/grid edge alignment, and the delivery-plan grid's single border.
- Run the affected sales page tests, frontend build, and changed-file lint.
- Compare the affected registration/status pairs and delivery-plan status at 375px, 768px, and 1280px in a browser; record screenshots in the dated result folder.
