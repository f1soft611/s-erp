# Sales Source Layout

## Context

The order pages live under `sales/order`, and delivery pages live under
`sales/delivery`, but shipment-plan and statement pages are siblings of those
folders. The intended menu groups both under Delivery Management.

## Design

Move the shipment-plan feature to `sales/delivery/plan` and the statement
feature to `sales/delivery/statement`. Keep the existing component/service/type
boundaries within each feature. Update imports in DashboardContent, tests, and
the browser-flow test. Do not move quotation pages or change routes, API paths,
permissions, page behavior, or UI.

## Validation

Run the focused page/API tests, the browser-flow test for the delivery plan,
the TypeScript/Vite build, and lint on changed TS/TSX files. Verify old feature
import paths are absent from active frontend code.
