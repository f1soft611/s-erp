# Web Push enablement diagnosis

## Findings

- The backend startup log for 2026-11-03 13:45:59 reports that `WEB_PUSH_ENABLED` was not found. The application defaults this setting to `false`, so the Web Push transport is not active in that runtime.
- The read-only database check found no active subscriptions; six recent delivery outboxes ended in `NO_RECIPIENT`. Those historical entries are terminal and are not replayed after a subscription is added.
- The reported profile page hid both status and enable errors behind generic messages, which prevented distinguishing an API/network failure from a disabled server configuration.
- The exact cause of the status request failure is not present in the retained backend log. The profile now displays safe API/service errors to make that failure diagnosable without exposing raw browser exceptions.

## Change

- When the status API reports `enabled: false`, the profile explains that server-side Web Push is disabled and no longer offers a non-working enable action.
- The profile preserves safe normalized API/network errors and known Web Push service errors for status, enable, and disable actions; unexpected browser errors still use the generic message.
- Added profile regression coverage for disabled-server messaging and actionable status/enable errors.

## Verification

- `npm --prefix frontend run test -- tests/push-settings.test.tsx` passed (9 tests).
- `npm --prefix frontend run build` passed.

## Backend startup failure

When Web Push was enabled, Spring failed to create `StandardWebPushTransport` with `No default constructor found`. The transport has a configured public constructor and a package-private test constructor; adding the second constructor removed Spring's implicit single-constructor injection behavior. Added explicit `@Autowired` to the configured constructor and a Spring application-context regression test. The regression test failed before the change with the reported missing-default-constructor error and passed afterward:

- `mvn -q -f backend\pom.xml '-Dtest=StandardWebPushTransportTest#createsEnabledTransportBeanThroughItsConfiguredConstructor' test` passed.
- `mvn -q -f backend\pom.xml '-Dtest=PushDeliveryServiceImplTest' test` passed.
- `git diff --check`

The full `StandardWebPushTransportTest` run also includes a timing-sensitive request-deadline test. It passed once, then failed twice waiting for a simulated blocked connection to be disconnected within four seconds. That test and timeout implementation were not changed; its flaky failure is separate from the constructor regression.

## WNS subscription endpoint

The reported Windows Push Notification Service endpoint uses a query-string `token`. `PushEndpointPolicy` previously rejected every query string before allowing the WNS host, so the valid browser subscription was returned as the generic invalid-subscription error. The endpoint policy now permits only a single non-empty `token` parameter on `*.notify.windows.com`; other query parameters, additional parameters, and query strings on other providers remain rejected. HTTPS, host allowlisting, and public-address DNS checks are unchanged.

Added a synthetic-token policy regression test. The browser endpoint token shared during troubleshooting is a credential; remove the browser subscription and enable Web Push again after deploying this change so a fresh endpoint is registered. No endpoint or token value is retained in this result.

## Required runtime setup

An operator must configure `WEB_PUSH_ENABLED=true` and the approved VAPID public/private key, VAPID subject, and subscription encryption key/version in the backend's runtime secret configuration, then restart the backend. Secret values must not be added to source control or shared in logs/chat. After enabling a device in profile settings, send a new message to verify delivery; past `NO_RECIPIENT` outboxes are not replayed.

## Subscription hash binding failure

After endpoint validation succeeded, registration failed with `Parameter 'endpointHash' not found. Available parameters are [array]`. The DAO passed a raw `byte[]` to MyBatis, whose `DefaultSqlSession` wraps arrays under the `array` key. The mapper instead referenced `endpointHash`. Registration therefore rolled back at its post-upsert lookup.

The DAO now passes a named `endpointHash` map and the mapper declares `parameterType="map"`. SQL, binary hash contents, transaction boundaries, and the post-save tenant/user ownership check are unchanged. The regression test calls the DAO with a synthetic hash through a real MyBatis session and parameter handler, with only the executor/JDBC boundary mocked. It reproduced the exact reported binding error before the fix and verifies `PreparedStatement.setBytes` afterward.

- DB evidence: directly called the default read-only MCP `list_tables` and `describe_table` for `public.tb_push_subscription`; `endpoint_hash` is non-null `bytea`. No data rows were queried and no schema changes were needed.
- `mvn -q -f backend\pom.xml '-Dtest=PushMapperXmlTest,PushSubscriptionServiceImplTest,PushSubscriptionApiControllerTest,PushEndpointPolicyTest' test`: 23 tests passed.
- Changed `PushSubscriptionDAO.java` compiled with JDK 19 `javac --release 8` using the existing test classpath; temporary output was removed.
- No UI changes or new screenshots for this backend-only fix. Actual browser subscription and external notification delivery still require retry after the running backend reloads the Java/XML changes.

## Registered WNS device receives no notification

The default read-only MCP table metadata and last-hour status aggregates showed active subscriptions and four `PERMANENT_FAILURE` deliveries, with no `SENT` deliveries in that window. Outbox `COMPLETED` only means that its deliveries are terminal, not that a notification reached the browser. Permanent failures did not retain an error code, so their exact individual causes cannot be inferred from these aggregates.

Code inspection found a definite dispatch blocker: registration allowed the provider-required WNS token query, but `StandardWebPushTransport.validateEndpoint` still rejected every query before opening a connection. A synthetic WNS transport regression reproduced `INVALID_ENDPOINT` before the fix. Registration and transport now share the same narrowly scoped WNS query predicate; transport preserves the encoded query in its destination URL. Invalid, empty, duplicate, extra, and non-WNS query cases remain rejected before connecting.

- `mvn -q -f backend\pom.xml '-Dtest=StandardWebPushTransportTest,PushEndpointPolicyTest,PushDeliveryServiceImplTest' test`: 30 tests passed, including the full transport timeout test in this run.
- Both changed production classes compiled with `javac --release 8`; temporary output was removed. `git diff --check` passed.
- No schema or screen changes. No credentials, endpoint values, or user rows were read for diagnosis; only metadata and status counts were retrieved.
- Real external delivery is not yet verified. Reload/restart the backend and send a new unread notification to the subscribed recipient; existing permanent failures are not automatically replayed.
- Closing a site tab or minimizing a supported browser differs from fully exiting it. Closed-browser delivery depends on browser/OS background push support and settings; force termination, offline/powered-off devices, or disabled OS notifications cannot be treated as a guaranteed real-time delivery environment.

## Message/work copy, S-ERP logo, and detail navigation

Implemented the requested presentation change:

- Server payload includes only the existing notification metadata and `category`: `DIRECT_MESSAGE_RECEIVED` maps to `message`; other events map to `work`. The notification query now projects the existing `event_type` column. Default read-only MCP `list_tables`/`describe_table` confirmed that column; no rows, credentials, or schema changes were needed.
- Service Worker displays `새 쪽지 알림이 왔습니다.` for messages and `새 업무 알림이 왔습니다.` for work. Old payloads without category retain the work fallback. Caller text, sender, contents, and navigation URL are not rendered.
- `/push-icon.png` is a 256px PNG converted from the repository's existing `/logo.ico`. The app notification image changes; the browser/OS-owned application badge cannot be replaced by this setting.
- Click navigation retains the fixed same-origin notification inbox, then calls the authenticated owner-scoped read API and uses the existing message/document resolver. Unauthenticated clicks preserve only a positive safe notification ID through login, never an arbitrary return URL. After login, permission checks still occur before detail access.

Verification:

- Backend payload/worker/notification mapper/push mapper suites passed (32 tests). The factory category regression failed before implementation, and the worker test verifies message category reaches the transport.
- Frontend SW/login-return/inbox suites passed (18 tests). Existing login suite passed separately (10 tests); one combined run exceeded the dashboard lazy-load timeout.
- Frontend build passed. Scoped lint for all presentation changes passed. Full lint remains blocked by the pre-existing conditional `useImperativeHandle` error in `tests/common-code-management-page.test.tsx:53`, with existing repository warnings; unrelated files were not changed.
- Changed Java classes compiled with `javac --release 8`; temporary class output was removed.
- `node tests\push-presentation.browser.mjs` passed against the existing S-ERP server at `127.0.0.1:4173`. Chromium decoded the logo, verified both detail routes with synthetic authorized service responses, and checked no horizontal overflow at 375/768/1280px. The existing server was left running.

Screenshots show a clearly labelled browser preview of the real SW-generated title/body/icon, not native OS notification screenshots:

- [375px](screenshots/push-presentation-375.png)
- [768px](screenshots/push-presentation-768.png)
- [1280px](screenshots/push-presentation-1280.png)

Restart/reload the backend and refresh the frontend after deployment. If an old Service Worker remains waiting, close all S-ERP tabs and reopen the app to activate it. New notifications use the new category and icon; already displayed notifications do not change. Native OS rendering and external push delivery with the new copy are not asserted by the synthetic browser checks.
