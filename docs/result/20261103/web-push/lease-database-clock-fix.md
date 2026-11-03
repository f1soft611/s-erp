# Web Push lease clock fix

## Issue

The scheduled Web Push worker reported lost or invalid outbox leases while processing claimed rows. The lease deadline had been calculated by the application using a UTC `LocalDateTime`, while lease validity checks use PostgreSQL `CURRENT_TIMESTAMP`. The database schema stores `lease_until` as `timestamp without time zone`, so an application/database session timezone difference could make the claim appear expired immediately. The application connection's actual session timezone was not directly verified.

## Change

- Changed outbox and delivery claim/renew DAO inputs from application-calculated timestamps to a lease duration in seconds.
- Made PostgreSQL calculate each deadline from its own `CURRENT_TIMESTAMP`, keeping claim writes and lease predicates on the same clock.
- Kept existing lease ownership token guards and added mapper assertions to prevent regressions to application-supplied deadlines.
- No schema change or DDL was required.

## Evidence and verification

- Read-only DB MCP confirmed `tb_push_outbox.lease_until` and `tb_push_delivery.lease_until` are `timestamp without time zone`.
- Read-only query verified PostgreSQL accepts `CURRENT_TIMESTAMP + (30::bigint * INTERVAL '1 second')`; no tenant or row data was queried.
- Focused backend tests passed:
  `mvn -q -f backend\pom.xml '-Dtest=PushMapperXmlTest,PushDeliveryServiceImplTest' test`
- `git diff --check` passed.
- This is a backend-only worker correction; browser screenshots and responsive UI checks do not apply.

Restart the backend process to load the updated worker and mapper. The database MCP query validates the expression but does not execute the application's full worker transaction; monitor the scheduled worker after restart.
