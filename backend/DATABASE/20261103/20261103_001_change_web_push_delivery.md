# 20261103_001 Web Push delivery persistence

- Date: 2026-11-03
- Change: Add persistent browser push subscriptions, a notification outbox, and per-subscription delivery state.
- Target: PostgreSQL central database.
- Affected tables: `tb_push_subscription`, `tb_push_outbox`, `tb_push_delivery`; foreign-key references to `tb_tenant`, `tb_user`, and `tb_notification`.
- Scope/impact: Endpoint hashes are globally unique so an endpoint has one current owner. Outbox rows are unique per notification, and delivery rows are unique per outbox/subscription pair. Partial indexes support subscription lookup and due/expired lease claims. Cascading foreign keys prevent orphaned outbox/delivery rows.
- Retention: Terminal outbox/delivery rows and inactive subscriptions are intended for 90-day retention; active subscriptions are not pruned solely for age.
- Rollback: `20261103_001_rollback.sql` drops delivery, outbox, and subscription tables in dependency order. This removes all data in the new tables; take an approved backup before applying a rollback.
- Verification: During post-implementation review on 2026-11-03, read-only PostgreSQL MCP `list_tables` and `describe_table` confirmed the current `tb_notification`, `tb_user`, and `tb_tenant` table/column metadata; no data rows were queried. The approved specification records earlier metadata inspection of `tb_direct_message` and `tb_direct_message_thread`. No DDL was executed.
- Application status: Draft only. Read-only schema metadata was inspected; no schema or data was changed.
