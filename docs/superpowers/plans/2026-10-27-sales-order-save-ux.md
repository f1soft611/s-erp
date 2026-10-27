# Sales Order Save API and Entry UX Implementation Plan

> **For agentic workers:** Implement each task in order. Keep the existing eGovFrame layers and do not create or apply sales-order tables.

**Goal:** Enable reliable, tenant-safe sales-order registration and improve the form so users can validate, save, and protect their work comfortably.

**Architecture:** Implement the create endpoint first using the established eGovFrame Controller → Service → DAO/MyBatis structure and the existing ID sequence service. Then connect the form through the shared authenticated API client, followed by focused unsaved-change and item/mobile usability improvements.

**Tech Stack:** Java 17, Spring Boot/eGovFrame 4.3, MyBatis PostgreSQL, JUnit 5/Mockito/MockMvc, React 19, TypeScript, React Router 7, MUI, Vitest, Playwright.

---

## Scope and known constraints

- The API contract is defined in
  `docs/superpowers/specs/2026-10-27-sales-order-save-and-ux-design.md`.
- The existing order schema contract is in
  `docs/spec/20261026/20261026_008_수주등록_페이지_및_DDL_상세사양서.md`.
- Read-only DB MCP confirmed the default database currently has no
  `tb_sales_order_hd` or `tb_sales_order_dt`. The user will create those tables.
- Do not add DDL, run migrations, or write data to the database. Test the API
  with mocked DAOs and document that live integration awaits table creation.
- Keep tenant ID and audit identity server-derived from authenticated `LoginVO`.
- Do not add list/read/update/delete API or change the registered menu.
- No commit steps are included; do not create commits unless requested.
- The later unsaved-change, item-discovery, and responsive-grid improvements
  are separate tasks in this plan and must not be mixed into the API contract.

## File map

### Documents

- Create
  `docs/directions/20261027/20261027_001_수주등록_저장API_및_사용성개선_작업지시서.md`
  for scope and exit criteria.
- Create
  `docs/plan/20261027/20261027_001_수주등록_저장API_및_사용성개선_계획서.md`
  and
  `docs/spec/20261027/20261027_001_수주등록_저장API_및_사용성개선_상세사양서.md`
  before implementation.
- Keep
  `docs/superpowers/specs/2026-10-27-sales-order-save-and-ux-design.md`
  as the API and UX source of truth; the 2026-10-26 design links to this
  addendum.
- Create
  `docs/result/20261027/sales-order-save-ux/20261027_001_수주등록_저장API_및_사용성개선_결과.md`
  and English-named screenshots in the same result directory.

### Backend

- Create request/response value objects and create-only API files under
  `backend/src/main/java/egovframework/let/sales/order/create/`.
- Keep SQL in
  `backend/src/main/resources/egovframework/mapper/let/sales/order/create/EgovSalesOrderCreate_SQL_postgresql.xml`.
- Add focused tests under
  `backend/src/test/java/egovframework/let/sales/order/create/`.
- Reuse
  `egovframework.let.common.idsequence.service.IdSequenceService`.

### Frontend

- Add API contract types and request service in
  `frontend/src/pages/sales/order/create/`.
- Keep validation in `data/salesOrderValidation.ts` and saved/dirty state in
  `SalesOrderCreatePage.tsx` unless the implementation proves a small focused
  hook is required.
- Extend the existing
  `frontend/tests/sales-order-create-page.test.tsx`; add a separate validation
  test only if needed.
- Update
  `frontend/src/pages/f1-grid-docs/F1-GRID.md` for the item-selection and
  narrow-screen order-entry behavior.

## Task 1: Finalize dated project documents

**Files:**
- Create the dated work direction, plan, and detailed specification listed in
  the file map.
- Reference the superpowers design addendum and the original schema spec.

- [ ] **Step 1: Write the direction before implementation**

  State that this work adds only order creation, requires eGovFrame layering,
  uses the authenticated tenant, leaves table creation to the user, and
  excludes DDL and order-list APIs.

- [ ] **Step 2: Write the detailed API contract**

  Record endpoint `POST /api/v1/sales/orders`, request fields, response
  envelope, validation rules, `SO-YYYYMMDD-NNNN` numbering, transaction
  boundary, and error behavior. The user owns table creation; do not generate
  DDL or write to the database.

- [ ] **Step 3: Write and cross-check the dated plan**

  Order work as backend API, frontend save integration, unsaved-change guard,
  item-selection discovery, and responsive detail-grid refinement. Link the
  direction and detailed specification with relative paths.

- [ ] **Step 4: Review document consistency**

  Confirm none of the dated documents asks the implementer to create or apply
  the tables, and that each endpoint/request field matches the design
  addendum.

## Task 2: Implement order request validation and number/amount rules

**Files:**
- Create `backend/src/main/java/egovframework/let/sales/order/create/domain/model/SalesOrderCreateRequestVO.java`
- Create `backend/src/main/java/egovframework/let/sales/order/create/domain/model/SalesOrderDetailCreateRequestVO.java`
- Create `backend/src/main/java/egovframework/let/sales/order/create/domain/model/SalesOrderVO.java`
- Create `backend/src/main/java/egovframework/let/sales/order/create/domain/model/SalesOrderDetailVO.java`
- Create `backend/src/main/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImpl.java`
- Test `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`

- [ ] **Step 1: Write failing service tests**

  Cover: tenant/date-scoped sequence call and number formatting; order date,
  customer, nonempty details, material ID, quantity, unit-price, VAT, and
  numeric bounds; `HALF_UP` line calculations; ordered line numbers; and
  tenant ID never being taken from the payload.

  Representative number assertion:

  ```java
  when(idSequenceService.nextValue("SALES_ORDER_NO", "71", "20261027"))
      .thenReturn(1L);

  SalesOrderVO saved = service.createOrder(71L, "user01", validPayload());

  assertThat(saved.getOrderNo()).isEqualTo("SO-20261027-0001");
  ```

- [ ] **Step 2: Run the service test and confirm it fails**

  Run from the repository root:

  ```powershell
  mvn -f backend/pom.xml -Dtest=SalesOrderServiceImplTest test
  ```

  Expected: test compilation/execution fails because the order service and
  request types do not exist yet.

- [ ] **Step 3: Add typed request and response VOs**

  Use camel-case Java properties corresponding to the JSON contract:
  `orderDt`, `customerId`, `quotNo`, `deliveryDt`, `deliveryPlace`,
  `deliveryMethod`, `remark`, and `details`; detail inputs are `materialId`,
  `orderQty`, `unitPrice`, `vatAmt`, and `deliveryDt`. Do not define request
  properties for tenant, audit, generated IDs/number, statuses, shipped
  quantity, supply amount, or totals.

- [ ] **Step 4: Implement explicit service validation**

  Use `BigDecimal`, reject invalid values with `ResponseStatusException` and
  `HttpStatus.BAD_REQUEST`, reject customer/material IDs not found in the
  authenticated tenant with `NOT_FOUND`, and compute amounts as:

  ```java
  BigDecimal supply = quantity.multiply(unitPrice)
      .setScale(2, RoundingMode.HALF_UP);
  BigDecimal vat = requestedVat == null
      ? supply.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP)
      : requestedVat.setScale(2, RoundingMode.HALF_UP);
  BigDecimal total = supply.add(vat).setScale(2, RoundingMode.HALF_UP);
  ```

  Validate each persisted numeric value fits `NUMERIC(15,2)`. Format the
  sequence with a minimum width of four, never truncate it, and reject a
  formatted number longer than 30 characters. Assign line numbers from 1 in
  request order. Set the order status, line status, and shipped quantity in
  server code.

- [ ] **Step 5: Run the service tests and confirm they pass**

  Run:

  ```powershell
  mvn -f backend/pom.xml -Dtest=SalesOrderServiceImplTest test
  ```

  Expected: all focused service tests pass without a database connection.

## Task 3: Persist the order through eGovFrame layers

**Files:**
- Create `backend/src/main/java/egovframework/let/sales/order/create/domain/repository/SalesOrderDAO.java`
- Create `backend/src/main/java/egovframework/let/sales/order/create/service/SalesOrderService.java`
- Create `backend/src/main/resources/egovframework/mapper/let/sales/order/create/EgovSalesOrderCreate_SQL_postgresql.xml`
- Modify `backend/src/main/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImpl.java`
- Test `backend/src/test/java/egovframework/let/sales/order/create/service/impl/SalesOrderServiceImplTest.java`

- [ ] **Step 1: Add failing DAO/service persistence tests**

  Mock the DAO and ID sequence service. Verify one header insert receives
  authenticated tenant/user, generated order number, requested customer/date,
  server-calculated total, fixed initial state, and optional fields. Verify
  details receive the returned header ID, same tenant, sequential line number,
  selected material, recalculated amounts, and server defaults.

- [ ] **Step 2: Implement the eGov DAO**

  Extend `EgovAbstractMapper`, expose `insertOrderHeader(Map<String,Object>)`
  and `insertOrderDetail(Map<String,Object>)`, and use named statement IDs
  `SalesOrderDAO.insertOrderHeader` and `SalesOrderDAO.insertOrderDetail`.
  Header/detail inserts must return generated IDs using PostgreSQL `RETURNING`.

- [ ] **Step 3: Implement transaction-bounded create service**

  Implement `SalesOrderService.createOrder(Long tenantId, String userId,
  SalesOrderCreateRequestVO payload)`. Annotate the public implementation
  method with `@Transactional(rollbackFor = Exception.class)`. Validate all
  references and values before inserting. Generate the number with
  `idSequenceService.nextValue("SALES_ORDER_NO", tenantId.toString(),
  orderDate.toString().replace("-", ""))`, then insert header and each detail.
  Let DAO exceptions propagate so the transaction rolls back; do not return a
  success-shaped fallback.

- [ ] **Step 4: Add tenant-scoped PostgreSQL mapper statements**

  Insert only documented columns. Do not interpolate SQL identifiers or use
  client values for `tenant_id`, audit, generated state, supply, or totals.
  The service has already checked tenant ownership; keep the tenant column in
  each insert so the schema's composite foreign keys enforce the same scope.

- [ ] **Step 5: Run persistence tests**

  Run:

  ```powershell
  mvn -f backend/pom.xml -Dtest=SalesOrderServiceImplTest test
  ```

  Expected: tests verify exact DAO parameter maps and insertion order.
  Database-backed persistence remains pending until the user creates both
  tables.

## Task 4: Expose the authenticated create endpoint

**Files:**
- Create `backend/src/main/java/egovframework/let/sales/order/create/controller/SalesOrderApiController.java`
- Test `backend/src/test/java/egovframework/let/sales/order/create/controller/SalesOrderApiControllerTest.java`

- [ ] **Step 1: Write failing MockMvc tests**

  Cover `POST /api/v1/sales/orders`, HTTP 201 and `ResultVoHelper` item
  envelope, authenticated tenant/user passed to service, payload tenant fields
  not trusted, missing authentication rejected, and service errors preserved
  as non-success responses.

- [ ] **Step 2: Implement the controller**

  Follow `ArchiveBoardApiController`: inject `ResultVoHelper` and the service,
  accept `@RequestBody SalesOrderCreateRequestVO` and
  `@AuthenticationPrincipal LoginVO`, reject a missing principal/tenant/user
  with 401, and return `ResponseEntity.status(HttpStatus.CREATED)` containing
  the standard result envelope with `item`.

- [ ] **Step 3: Run controller and service tests**

  Run:

  ```powershell
  mvn -f backend/pom.xml -Dtest=SalesOrderApiControllerTest,SalesOrderServiceImplTest test
  ```

  Expected: all endpoint and service tests pass. Keep live database writes out
  of this task and record whether a database integration test was performed.

## Task 5: Add frontend types, validation, and API client integration

**Files:**
- Create `frontend/src/pages/sales/order/create/types/salesOrder.types.ts`
- Create `frontend/src/pages/sales/order/create/data/salesOrderValidation.ts`
- Create `frontend/src/pages/sales/order/create/services/salesOrder.service.ts`
- Test `frontend/tests/sales-order-create-page.test.tsx`
- Optionally create `frontend/tests/sales-order-validation.test.ts` if pure
  validation needs isolated coverage.

- [ ] **Step 1: Write failing frontend tests**

  Cover header and line validation, valid payload mapping, omitted
  tenant/audit/generated/calculated fields, required `item` response
  extraction, and propagation of an API error.

- [ ] **Step 2: Run focused Vitest tests and confirm failure**

  From `frontend`:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  ```

  Expected: new tests fail because the request type, validator, and service
  are not implemented.

- [ ] **Step 3: Implement the typed request and response**

  Mirror the API contract exactly. Represent monetary values as numbers only
  at the client boundary; preserve two decimal places when constructing JSON.
  Build detail payloads from current grid changes and include only material ID,
  quantity, unit price, VAT, and optional delivery date.

- [ ] **Step 4: Implement validation and service**

  Validate order date, selected customer, at least one valid detail row,
  positive quantity, nonnegative unit price/VAT, and selected material IDs.
  Call `apiPost` from `shared/services/apiClient` using
  `/api/v1/sales/orders`; unwrap the `item` envelope and throw if it is absent.

- [ ] **Step 5: Run focused frontend tests**

  Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  ```

  Expected: payload and validation tests pass; API failures remain observable.

## Task 6: Connect form save lifecycle and required-field UX

**Files:**
- Modify `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Modify `frontend/src/pages/sales/order/create/components/SalesOrderDetailGrid.tsx` only if a validated-row read API is needed
- Modify `frontend/tests/sales-order-create-page.test.tsx`

- [ ] **Step 1: Write failing save-flow UI tests**

  Assert that invalid submissions show field/form errors and send no request;
  valid submissions disable the button while pending; successful responses
  show the server-returned order number; failed responses show an error and
  retain header and detail values; and repeated clicks send one request.

- [ ] **Step 2: Run the focused UI tests and confirm failure**

  Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  ```

  Expected: save lifecycle tests fail against the existing permanently
  disabled save action.

- [ ] **Step 3: Implement field errors and pending state**

  Mark required customer/date/detail fields, associate validation feedback
  with the relevant controls, and derive whether save is enabled from
  validation plus `isSaving`. On submit, read the current grid changes,
  validate, call the create service, and do not clear or reset user input on
  failure.

- [ ] **Step 4: Show only server-confirmed success**

  After the API returns, store the response's `orderNo` and display a success
  message with that number. Keep the saved header/details visible. Do not
  generate a local success or a local order number.

- [ ] **Step 5: Run focused frontend tests and build**

  Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  npm run build
  ```

  Expected: focused tests and TypeScript/Vite build pass.

## Task 7: Protect unsaved edits from navigation

**Files:**
- Modify `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Create `frontend/src/pages/sales/order/create/hooks/useSalesOrderNavigationGuard.ts` only if keeping the blocker logic out of the page materially improves clarity
- Modify `frontend/tests/sales-order-create-page.test.tsx`

- [ ] **Step 1: Write failing navigation-guard tests**

  Cover dirty form navigation being blocked, explicit discard allowing
  navigation, cancel keeping the form, browser `beforeunload` warning, and a
  successful save clearing the dirty state. Saving failures must keep the
  form dirty.

- [ ] **Step 2: Run the focused tests and confirm failure**

  Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  ```

  Expected: navigation warning tests fail before the guard is implemented.

- [ ] **Step 3: Implement the Router 7 blocker and unload warning**

  Use the installed `react-router-dom` navigation blocker API to block
  in-app navigation only while a changed, unsaved order exists. Present a
  confirmation with explicit stay/discard actions. Register a `beforeunload`
  listener for tab close/refresh only while dirty, and remove listeners when
  clean or unmounted.

- [ ] **Step 4: Run navigation tests**

  Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  ```

  Expected: in-app and browser-unload guards pass and are absent after
  successful save.

## Task 8: Improve item discovery and narrow-screen detail entry

**Files:**
- Modify `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`
- Modify `frontend/src/pages/sales/order/create/components/SalesOrderDetailGrid.tsx`
- Modify `frontend/src/pages/sales/order/create/data/salesOrderDetail.ts`
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify `frontend/tests/sales-order-create-page.test.tsx`

- [ ] **Step 1: Add failing item-discovery and responsive tests**

  Cover a clear keyboard-accessible item selection action, applying the chosen
  material to the intended row, visible item-selection state, and no
  page-level horizontal overflow at 375px, 768px, and 1280px. Grid-internal
  horizontal scrolling is allowed.

- [ ] **Step 2: Run focused tests and browser checks to identify failures**

  Run the focused Vitest file and the existing browser workflow at the three
  target widths. Record the current page overflow measurement before changes.

- [ ] **Step 3: Make item selection discoverable**

  Keep the existing `MaterialPickerDialog` and row `applyPatch` behavior.
  Add a visible, keyboard-operable row action/empty-row cue that opens the
  picker and preserves the exact row binding. Do not replace the common
  `MasterPicker` or add a new product search API.

- [ ] **Step 4: Refine mobile grid containment**

  Keep horizontal scrolling inside the grid container, allow header controls
  and amount summaries to wrap at narrow widths, and prevent page-level
  horizontal overflow. Do not hide required business values or alter column
  calculations.

- [ ] **Step 5: Update F1-Grid guidance and verify**

  Document the code-picker keyboard/action behavior and responsive scroll
  boundary in `F1-GRID.md`. Run:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  npm run build
  ```

  Verify the 375px, 768px, and 1280px browser states; save screenshots under
  `docs/result/20261027/sales-order-save-ux/screenshots/`.

## Task 9: Final verification and result record

**Files:**
- Create the result report and browser screenshots listed in the file map.
- Do not add or execute any database schema file.

- [ ] **Step 1: Run focused backend verification**

  ```powershell
  mvn -f backend/pom.xml -Dtest=SalesOrderApiControllerTest,SalesOrderServiceImplTest test
  ```

- [ ] **Step 2: Run focused frontend verification**

  From `frontend`:

  ```powershell
  npm run test -- tests/sales-order-create-page.test.tsx
  npm run build
  ```

- [ ] **Step 3: Verify browser behavior at target widths**

  Exercise validation, picker selection, pending, server success, server error,
  retained input, duplicate-submit blocking, and navigation warning at
  375px/768px/1280px with a mocked API response. Record that database-backed
  verification is pending user-created tables.

- [ ] **Step 4: Write the result report**

  Record changed files, endpoint/request contract, test/build/browser outcomes,
  screenshots, MCP table absence, and the fact that no DDL was created or
  applied. Do not claim live database integration.

## Self-review against the design

- The API endpoint, authenticated tenant, eGovFrame layers, transaction,
  sequence, request restrictions, server calculations, response, and errors
  are covered by Tasks 2–4.
- Required validation, duplicate-submit prevention, success/error handling,
  and input retention are covered by Tasks 5–6.
- Unsaved changes, item discovery, and responsive detail entry are covered by
  Tasks 7–8.
- Tests, browser checks, result documentation, and the user-owned table
  creation constraint are covered by Task 9.
- No DDL or database writes are planned.
