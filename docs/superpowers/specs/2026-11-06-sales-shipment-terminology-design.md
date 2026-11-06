# Sales Shipment Terminology and Plan Editing Design

## Approved direction

Use **출하** for the sales delivery workflow in navigation, page labels, user-facing messages, system-policy names, and descriptions:

- Rename the `납품관리` menu group to `출하관리`; its pages become `출하등록` and `출하현황`.
- Rename `납품계획` to `출하계획`; its pages become `출하계획등록` and `출하계획현황`.
- Update the delivery-plan mode and over-delivery policy display names and descriptions to use 출하 terminology.

Keep stable technical identifiers and persisted contracts unchanged: menu codes and URLs, page keys, API routes and JSON field names, Java/TypeScript symbols, database table/column names, sequence keys, and policy codes. This is a user-facing terminology change, not a database/API rename.

## Plan editing in AUTO and MANUAL

Expose both plan pages in either tenant mode. Existing plans can be read and edited in both modes. MANUAL can still create a plan for an order without one; AUTO can only edit the plan created with its order and cannot use the manual-create API to create another plan.

The registration page selects an eligible order according to mode: unplanned orders in MANUAL, and existing auto-planned orders in AUTO. Selecting an AUTO order loads the existing plan identity and detail rows for editing. The status page also remains available for lookup and authorized editing. Existing plan/customer/order linkage, delivered quantities, row identities, and reference protections remain intact.

When an AUTO order is edited, preserve the date and planned quantity of each existing plan detail rather than overwriting a user's plan edits. A newly added order detail receives an initial plan detail using the existing delivery-date fallback and order quantity. An order quantity reduction below its existing planned quantity is rejected; increasing the order quantity does not silently increase an edited plan. Removing order details retains existing delivery/reference guards.

## Persistence and migration

Add a dated, tenant-database data migration that updates the existing sales delivery and plan menu labels/descriptions and the two built-in `tb_system_policy` names/descriptions. It must not recreate menu rows, change permission grants, alter policy values, or affect custom policies. Provide a guarded rollback and identical copies under `docs/database` and `backend/DATABASE`. Do not apply either script to a database as part of implementation.

## Verification

Cover menu and route labeling, mode-aware plan source selection, AUTO plan loading/editing, MANUAL plan creation, backend mode authorization, AUTO order-update preservation of edited plan details, lower-quantity rejection, and unchanged tenant/plan/delivery identity. Run the focused backend and frontend tests, frontend build and changed-file lint, then inspect the pages at 375, 768, and 1280 pixels and save screenshots with a dated result document.
