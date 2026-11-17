# Sales Order Common Codes and Entry Validation Design

## Context

The order entry and status pages currently render order and line states as raw strings. The delivery method is free text. The order detail grid labels its row number as "행", the header due date is optional, and a calculation overflow from a quantity or unit-price edit escapes the grid callback without visible feedback.

The existing order-status task (2026-11-17 item 008) hides the order-status grid column and displays `lineStatus` as "업무상태". This request supersedes that label with "진행상태"; the status search condition remains available. The quotation number column is already present and must remain visible.

The database uses `tb_sales_order_hd.status` with a CHECK constraint allowing `수주등록`, `생산대기`, `생산중`, `출하완료`, and `취소`. `tb_sales_order_dt.line_status` defaults to `대기` and has no corresponding CHECK. The common-code tables already exist, but no order-status or delivery-method group was found. There is no need to change the database schema or API contract.

## Goals

- Load order/progress state labels and delivery-method choices from tenant common codes.
- Preserve the existing status values accepted by the API and database.
- Require the header due date and copy it to each newly added detail row while allowing row-level changes.
- Show an understandable error and reject a detail edit when calculated amounts exceed the supported numeric range.
- Keep the order entry/status page structure, permissions, API fields, and existing quotation-number behavior.

## Recommended Design

Use two common-code groups:

- `SALES_ORDER_STATUS` for both order status and detail progress.
- `SALES_DELIVERY_METHOD` for delivery method.

The status group has the five header status codes already allowed by the database and an additional `대기` item for the existing line-status default. The order-status selector/search uses only the five permitted header values; line-progress display and search can resolve `대기` as well. The initial line state remains compatible with the database default. Common-code `itemCode` remains the stored/API value and `itemNm` is the displayed label.

The seed provides the existing status values and the one delivery-method value evidenced in current order fixtures (`택배`). It is tenant-scoped, requires an explicit `target_tenant_id`, is idempotent, does not overwrite existing administrator-managed entries, and has verification and conservative rollback scripts. Administrators can add delivery-method entries through common-code management. The scripts are documentation only; they are not applied to a database as part of this task.

The frontend loads the two active groups and active items through the existing common-code service. Entry uses a select for delivery method. Existing values missing from active choices remain visible as disabled legacy values in the form and remain unchanged unless the user selects an active option. Status and progress values display `itemNm`, falling back to the raw stored value when no active matching item exists. Loading/errors use the existing page alert/retry patterns; missing groups or empty item lists are reported rather than silently replaced by hard-coded choices.

The status list keeps `status` hidden as specified in task 008, but its detailed-search options use the common-code labels and the existing `status` query parameter. `lineStatus` remains the underlying field and query parameter but is labeled "진행상태". `quotNo` stays visible.

The header delivery date is required in the form and save validation. A newly inserted detail row receives the current header delivery date when it is created; the detail date remains editable. Existing row dates are not rewritten when the header date changes.

For amount overflow, the order grid's quantity/price calculation callback handles only calculation errors: it reports the error through the existing page error area and returns an empty patch, leaving the previous cell value intact. It does not log the exception or accept the invalid edit. No global F1-Grid behavior changes are needed.

## Alternatives Considered

1. Keep hard-coded state labels and only change column captions. This is simpler but does not satisfy administrator-managed labels or dynamic search choices.
2. Change backend/database status values to new opaque codes. This would conflict with the current `tb_sales_order_hd.status` CHECK and alter API/data contracts, so it is rejected.
3. Use common codes while retaining current stored values and labels. This meets the request, keeps the contract unchanged, and is recommended.

## Scope and Non-Goals

- Frontend changes are limited to sales order registration and status pages, their focused tests, and order-specific common-code service/helpers.
- No Java, Mapper, API, table, column, constraint, or menu changes.
- No automatic synchronization of header due-date changes into existing detail rows.
- No new delivery-method values beyond the currently evidenced `택배` seed; administrators manage additional options.
- No database script execution, commit, or deployment.

## Error Handling and Compatibility

- Common-code fetch failures are visible with a retry action; empty/inactive groups do not fall back to hard-coded choice lists.
- Unknown historical values are preserved and displayed as raw values.
- Existing status API values and query parameter names remain unchanged.
- Numeric calculation failures reject the attempted cell update and show the original calculation error in the page.

## Verification

- Focused service and page tests cover active-code filtering/order, labels versus stored values, legacy values, fetch failures, due-date validation/defaulting, and overflow rejection/notification.
- Existing order registration and status/API tests remain green.
- Frontend build and changed-file lint pass.
- Actual browser checks cover order registration/status at 375, 768, and 1280 pixels; screenshots and results are stored under `docs/result/20261117/sales-order-common-codes`.

## Sources

- [Order status column task 008](../../directions/20261117/20261117_008_수주현황_컬럼조정_작업지시서.md)
- [Order common-code task 015](../../directions/20261117/20261117_015_수주관리_공통코드_필수납기_금액오류_작업지시서.md)
- [Order status column specification 008](../../spec/20261117/20261117_008_수주현황_컬럼조정_상세사양서.md)
- [Order entry database contract](../../spec/20261026/20261026_008_수주등록_페이지_및_DDL_상세사양서.md)
- `docs/database/db-schema.md`, `tb_sales_order_hd` and `tb_sales_order_dt`
- Read-only MCP: `list_tables`; `describe_table` for `tb_common_code_group`, `tb_common_code_item`, `tb_sales_order_hd`, and `tb_sales_order_dt`; aggregate `EXISTS` check for the proposed groups. No tenant data rows were copied into this document.
