# Sales Closing Front-End Design

## Goal

Complete 영업관리 > 매출관리 > 매출마감관리 with line-level selection and closing, grouped statement issuance, and responsive scrolling. Preserve the existing 출하현황 search pattern and record the menu/schema changes in paired dated SQL files without applying them.

## Page layout

- Use the existing `PageHeader` and `PageSearchArea` pattern from `SalesDeliveryStatusPage`.
- Keep one integrated search field for 출하번호, 수주번호, 거래처, and 품목. The detail-search panel opens and closes through the existing arrow control.
- In detail search, make 출하일 the required 기준일 range, default it to the current month as in 출하현황, and retain the existing quick-date presets: 오늘, 이번주, 이번달, 전월, 최근 30일.
- Add one 거래처 multi-select control in the detail-search panel. It is a single customer filter regardless of whether a customer is a sales, order, or delivery party; selecting customers does not create separate role filters.
- Keep the customer control in the expanded search panel by adding a narrow `detailExtraContent` slot to `PageSearchArea`; align it as the next field with no extra top margin. The field summarizes multiple selections as `첫 거래처명 외 N건`, with removable customer chips below it; chip removal changes only the draft filter. The number of applied customers contributes to the existing detail-search badge.
- Place the 매출대상 상세 F1Grid beside the customer summary. Each row represents a sales delivery detail and shows 출하번호/일자, 수주번호, 거래처, 품목, explicit 마감상태, quantity, amounts, and a row-selection checkbox. Only OPEN rows are selectable; same-delivery lines are counted and submitted independently. Apply the committed integrated-search keyword in red only to searchable columns, and show the grid's loading overlay while the request is pending.
- Place a fixed-width 거래처별 요약 panel beside the detail grid with one compact all-customer KPI and dense selectable summary rows, not repeated large cards. Show total/closed/open detail counts with clear labels and restrained status colors. Clicking a customer filters the detail grid; clicking 전체 clears that filter. Keep the title and KPI fixed while the customer list scrolls internally.
- At desktop widths, the detail grid and customer list own independent vertical scrolling. At 375px and 768px, stack the summary above the detail grid, allow page-level vertical scrolling, and preserve a viewport-relative minimum height for the detail grid so it remains reachable below the fold. Keep horizontal overflow inside F1Grid.

## Customer multi-select

Extend the existing customer picker dialog to support multi-select while preserving its current single-select behavior for existing callers. The multi-select dialog provides keyword search, checkbox selection, a selected count, and cancel/apply actions. The selected customer labels remain visible in the detail-search field after the dialog closes. Use `CommonDialog` and the existing customer master search API; do not introduce a second modal pattern.

## Read API and data boundary

Add tenant-scoped read and batch-close endpoints using existing delivery, order, customer, material, and statement tables. `tb_sales_delivery_dt.revenue_closed_at` is the only source of explicit close status; an AUTO or manual statement issuance by itself leaves the line OPEN. Detail rows and customer summary counts are delivery-detail based. The close API accepts selected detail IDs, creates statements only for selected unissued lines grouped by customer, then records closure atomically. Do not create a separate closing table. Add nullable `tb_sales_statement_dt.sales_delivery_detail_id`, `tb_sales_delivery_dt.revenue_closed_at`, and `revenue_closed_by` through the dated migration; backfill active legacy statement details by tenant, delivery, and line number without closing them.

## Structure and responsive behavior

- Place the page under `frontend/src/pages/sales/revenue/closing/`, with role-based components for the detail grid and customer summary.
- Register the page in the front-end dashboard dispatch using a dedicated `revenue-closing` page key.
- Add an idempotent, target-tenant-guarded menu seed for 매출관리 > 매출마감관리, including CREATE sourced from the same tenant's active statement-create menu, plus a scoped rollback and dated change record mirrored in `docs/database` and `backend/DATABASE`.
- Replace active delivery-header uniqueness with source delivery-detail uniqueness. Rollback must refuse if closure records exist or active statement details are partial, grouped across deliveries, unlinked, or duplicated per delivery.
- Verify 375px, 768px, and 1280px layouts. Avoid page-level horizontal overflow; wide detail columns scroll within the F1Grid.

## Validation

- Focused tests cover row checkbox eligibility, same-delivery detail counts, explicit status, grouped same-customer statement creation, close confirmation/errors, and AUTO issuance preservation.
- Run focused tests, front-end build/lint, and backend service/mapper/controller tests.
- Verify the rendered layout in a real browser at 375px, 768px, and 1280px; confirm mobile page scrolling, independent desktop detail/summary scrolling, and internal customer-list scrolling.
