# Sales shipment terminology migration

- Date / sequence: 2026-11-06 / 004.
- Scope: existing sales menu display names/descriptions in `tb_menu` and built-in policy display names/descriptions in `tb_system_policy`.
- Target model: tenant databases receive the same label-only update; no central policy values or tenant-specific operating values are changed.
- Menu codes: `SALES_DELIVERY`, `SALES_DELIVERY_CREATE`, `SALES_DELIVERY_STATUS`, `SALES_DELIVERY_PLAN`, `SALES_DELIVERY_PLAN_CREATE`, and `SALES_DELIVERY_PLAN_STATUS`.
- Built-in policy codes: `DELIVERY_PLAN_MODE` and `OVER_DELIVERY_POLICY`, restricted to rows with `system_policy_at = 'Y'`.
- Changed columns only: `tb_menu.menu_nm`, `tb_menu.menu_dc`, `tb_system_policy.policy_nm`, and `tb_system_policy.policy_dc`.
- Preserved: menu IDs, URLs, hierarchy, sort order, enabled state, permission grants, policy codes/types/options/values/version, tenant policy source columns, and custom policy rows.
- Guardrails: the forward migration aborts on duplicate identifiers or label states that do not match either the prior seeded values or the approved new values. The rollback restores old labels only while the current values still match the approved new values; later edits stop rollback rather than being overwritten.
- Impact: user-facing menu and policy guidance changes from 납품 to 출하; no table, column, permission, or business-data change is introduced.
- Rollback: run `20261106_004_rollback_sales_shipment_labels.sql` only if no subsequent menu/policy label edits need preserving.
- Application status: not applied to any database. Read-only MCP metadata confirmed `tb_menu` and `tb_system_policy` columns. The seed scripts under `backend/DATABASE/20261104` and `backend/DATABASE/20261105` were used to verify prior labels/descriptions. No business rows were queried.
- Copies: the docs and backend copies of this SQL, rollback, and history must remain byte-identical.
