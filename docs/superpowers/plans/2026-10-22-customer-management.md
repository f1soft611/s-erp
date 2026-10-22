# Customer Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tenant-scoped customer management page at `/co/master/customers` backed by `tb_customer_info`, with F1-Grid search, create/update, and six-digit customer-code generation.

**Architecture:** Connect the existing `co` dashboard page key `customers` to a page feature package under `pages/co/master/customers`. The React page calls a new tenant-scoped Spring API, whose service/DAO/Mapper operate on `tb_customer_info`; `customer_id` remains DB-generated and a new PostgreSQL sequence supplies exactly six-digit customer codes when none is provided. Tenant admins with the relevant menu permissions can write; list/search always uses the authenticated tenant.

**Tech Stack:** React 19, TypeScript, MUI, F1-Grid, Vitest, Spring Boot/eGovFrame, MyBatis, PostgreSQL, Maven.

---

## Approved Inputs

- Design: [2026-10-22-customer-management-design.md](../specs/2026-10-22-customer-management-design.md)
- Reference page: `frontend/src/pages/co/workflow/form/DraftFormManagementPage.tsx`
- Reference F1-Grid columns/forms: `frontend/src/pages/co/workflow/form/components/DraftFormGrid.tsx`
- Reference frontend API flow: `frontend/src/pages/co/workflow/form/services/draftFormManagement.service.ts`
- Reference backend tenant/master-data pattern: `backend/src/main/java/egovframework/let/co/workflow/form/` and `backend/src/main/java/egovframework/let/co/master/commoncode/`
- Database evidence: tenant MCP `tb_customer_info` column metadata and PostgreSQL constraints. No data rows were read.

## File Structure

### Project instructions and specifications

- Create `docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md` for scope, required steps, and completion conditions.
- Create `docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md` from the work instruction.
- Create `docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md` from the plan, including the database-backed API and field/search contract.

### Database sequence

- Create matching migration, change record, and rollback files under `backend/DATABASE/20261022/` and `docs/database/20261022/`, numbered `20261022_005`.
- Modify `docs/database/db-schema.md` to document the confirmed `tb_customer_info` structure and the new customer-code sequence.

### Backend

- Create `backend/src/main/java/egovframework/let/co/master/customer/controller/CustomerInfoApiController.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/service/CustomerInfoService.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/service/impl/CustomerInfoServiceImpl.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/domain/model/CustomerInfoVO.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/domain/model/CustomerInfoSearchConditionVO.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/domain/model/CustomerInfoSaveRequestVO.java`.
- Create `backend/src/main/java/egovframework/let/co/master/customer/domain/repository/CustomerInfoDAO.java`.
- Create `backend/src/main/resources/egovframework/mapper/let/co/master/customer/CustomerInfo_SQL_postgresql.xml`.
- Create `backend/src/test/java/egovframework/let/co/master/customer/controller/CustomerInfoApiControllerTest.java`.
- Create `backend/src/test/java/egovframework/let/co/master/customer/service/impl/CustomerInfoServiceImplTest.java`.

### Frontend

- Modify `frontend/src/pages/dashboard/components/DashboardContent.tsx` to route the `co` module's `customers` key to the page.
- Modify `frontend/src/pages/dashboard/services/dashboardData.tsx` to define `customers` page title/description.
- Create `frontend/src/pages/co/master/customers/CustomerManagementPage.tsx`.
- Create `frontend/src/pages/co/master/customers/components/CustomerManagementGrid.tsx`.
- Create `frontend/src/pages/co/master/customers/hooks/useCustomerManagement.ts`.
- Create `frontend/src/pages/co/master/customers/services/customerManagement.service.ts`.
- Create `frontend/src/pages/co/master/customers/types/customerManagement.types.ts`.
- Create `frontend/tests/customer-management-page.test.tsx`.
- Create `frontend/tests/customer-management-service.test.ts`.
- Update `frontend/src/pages/f1-grid-docs/F1-GRID.md` with a concise real-page example of metadata-driven detailed search and row-form use, as required for F1-Grid feature documentation.

### Result

- Create `docs/result/20261022/customer-management/20261022_008_customer_management_result.md`.
- Save browser screenshots under `docs/result/20261022/customer-management/screenshots/`.

## Task 1: Create the dated project work instruction, plan, and detailed specification

**Files:**
- Create the three `docs/directions/20261022/`, `docs/plan/20261022/`, and `docs/spec/20261022/` files listed above.

- [ ] **Step 1: Write the work instruction from the approved design**

Record the `/co/master/customers` route, tenant-scoped `tb_customer_info` CRUD-without-delete scope, approved search and field list, admin/menu permission behavior, six-digit code sequence, F1-Grid row form, responsive checks, and result/screenshot requirements. State that no tenant data rows were inspected and no MCP writes are allowed.

- [ ] **Step 2: Write the dated project plan and detailed spec**

Make the project plan point to the work instruction and this implementation plan. In the detailed spec, define the request/response properties in camelCase for all `tb_customer_info` fields, query parameters, status/error behavior, permission checks, six-digit sequence exhaustion behavior, and the exact search/grid/form fields listed below.

- [ ] **Step 3: Verify document consistency before changing application code**

Run:

```powershell
git add -- docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md
git diff --cached --check -- docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md
```

Expected: no whitespace errors, and each document references its predecessor and the approved design.

- [ ] **Step 4: Commit the dated project documents**

Stage only the three named customer documents and commit with:

```powershell
git add -- docs/directions/20261022/20261022_008_거래처_관리_페이지_작업지시서.md docs/plan/20261022/20261022_008_거래처_관리_페이지_계획서.md docs/spec/20261022/20261022_008_거래처_관리_페이지_상세사양서.md
git commit -m "docs(co): specify customer management page" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 2: Add the customer-code sequence migration and schema history

**Files:**
- Create matching SQL, change-record Markdown, and rollback SQL under `backend/DATABASE/20261022/` and `docs/database/20261022/` with prefix `20261022_005`.
- Modify `docs/database/db-schema.md`.

- [ ] **Step 1: Create the forward migration**

Create `tb_customer_info_customer_code_seq` as a global, non-cycling PostgreSQL sequence. Initialize it from the maximum existing numeric `customer_code` matching one to six digits across `tb_customer_info`; start at 1 if no positive numeric code exists. Do not select or export business rows. Do not change the existing `customer_id` sequence or table columns.

Use this migration structure, adding the standard transaction wrapper used by the dated schema scripts:

```sql
CREATE SEQUENCE tb_customer_info_customer_code_seq
    AS BIGINT
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    NO CYCLE;

DO $$
DECLARE
    max_code BIGINT;
BEGIN
    SELECT COALESCE(MAX(customer_code::BIGINT), 0)
      INTO max_code
      FROM tb_customer_info
     WHERE customer_code ~ '^[0-9]{1,6}$';

    IF max_code = 0 THEN
        PERFORM setval('tb_customer_info_customer_code_seq', 1, false);
    ELSE
        PERFORM setval('tb_customer_info_customer_code_seq', max_code, true);
    END IF;
END $$;
```

- [ ] **Step 2: Create the rollback and change record**

The rollback drops only `tb_customer_info_customer_code_seq`; it does not alter customer rows or the existing unique constraint. Document that rollback must be coordinated with application rollback and that customer codes already saved remain unchanged. Include date, sequence object, affected application behavior, scope, and rollback instructions.

- [ ] **Step 3: Update the cumulative schema document**

Add the MCP-confirmed `tb_customer_info` column/nullability/default/constraint summary and document `tb_customer_info_customer_code_seq` as the allocator for generated `customer_code` values. Preserve existing document sections.

- [ ] **Step 4: Verify migration copies and patch quality**

Run:

```powershell
Get-FileHash backend\DATABASE\20261022\20261022_005_customer_code_sequence.sql, docs\database\20261022\20261022_005_customer_code_sequence.sql
Get-FileHash backend\DATABASE\20261022\20261022_005_change_customer_code_sequence.md, docs\database\20261022\20261022_005_change_customer_code_sequence.md
Get-FileHash backend\DATABASE\20261022\20261022_005_rollback.sql, docs\database\20261022\20261022_005_rollback.sql
git diff --check
```

Expected: each same-purpose pair has identical hashes and `git diff --check` reports no errors. Do not execute the migration through the read-only MCP.

- [ ] **Step 5: Commit only the database migration and schema documentation**

Stage the six SQL/change-record/rollback files plus `docs/database/db-schema.md`, then commit:

```powershell
git add -- backend/DATABASE/20261022/20261022_005_customer_code_sequence.sql backend/DATABASE/20261022/20261022_005_change_customer_code_sequence.md backend/DATABASE/20261022/20261022_005_rollback.sql docs/database/20261022/20261022_005_customer_code_sequence.sql docs/database/20261022/20261022_005_change_customer_code_sequence.md docs/database/20261022/20261022_005_rollback.sql docs/database/db-schema.md
git commit -m "feat(db): add customer code sequence" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 3: Implement and test the tenant-scoped backend API

**Files:**
- Create the backend files and tests listed under Backend.

- [ ] **Step 1: Write controller tests first**

In `CustomerInfoApiControllerTest`, test that GET forwards the authenticated tenant plus all keyword/detail filters; POST and PUT use the authenticated tenant and actor ID; non-admin writes return 403; service validation errors return 400; missing/foreign-tenant update targets return 404. Construct `LoginVO` principals using the existing standalone MockMvc resolver pattern from `DraftingWorkApiControllerTest`.

Use these endpoint expectations:

```java
mockMvc.perform(get("/api/v1/co/master/customers")
        .param("keyword", "Acme")
        .param("presidentName", "Lee")
        .param("useAt", "Y")
        .principal(authenticationForTenant(9L)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.result.resultList").isArray());

verify(customerInfoService).listCustomers(eq(9L), argThat(condition ->
        "Acme".equals(condition.getKeyword())
            && "Lee".equals(condition.getPresidentName())
            && "Y".equals(condition.getUseAt())));
```

- [ ] **Step 2: Run controller tests and confirm failure**

Run from `backend`:

```powershell
mvn -Dtest=CustomerInfoApiControllerTest test
```

Expected before implementation: FAIL because the customer controller and service do not exist.

- [ ] **Step 3: Write service and mapper tests**

In `CustomerInfoServiceImplTest`, assert that list conditions contain the authenticated tenant and trimmed filters; reject blank `customer_name` and `use_at` values other than `Y`/`N`; retain supplied customer codes; format generated codes as six digits; skip a generated code already in use; reject values beyond `999999`; reject same-tenant duplicates; and prevent updates to another tenant's row. Parse `CustomerInfo_SQL_postgresql.xml` with `XMLMapperBuilder` and assert list, insert, update, existence-check, and `nextval` statements are registered. Assert list/update SQL includes tenant predicates and update SQL cannot change `customer_id` or `tenant_id`.

The service contract is:

```java
List<CustomerInfoVO> listCustomers(Long tenantId, CustomerInfoSearchConditionVO condition)
        throws Exception;
CustomerInfoVO createCustomer(
        Long tenantId, Long currentUserId, CustomerInfoSaveRequestVO payload) throws Exception;
CustomerInfoVO updateCustomer(
        Long tenantId, Long currentUserId, Long customerId,
        CustomerInfoSaveRequestVO payload) throws Exception;
```

For example, the generated-code test sets the DAO sequence values to `1L` then `2L`, marks `"000001"` as already used and `"000002"` as unused, and asserts the inserted customer code is `"000002"`. A sequence value of `1_000_000L` must throw `IllegalArgumentException` before insert.

- [ ] **Step 4: Run service tests and confirm failure**

Run from `backend`:

```powershell
mvn -Dtest=CustomerInfoServiceImplTest test
```

Expected before implementation: FAIL because the customer service, DAO, and mapper are absent.

- [ ] **Step 5: Implement models, DAO, and MyBatis statements**

Map the database fields to typed `CustomerInfoVO` properties: `customerId`, `tenantId`, `customerCode`, `customerName`, `custNameAbbr`, `presidentName`, `businessNo`, `juridNo`, `businessStatus1`, `businessItem1`, `postCode`, `address`, `telephoneNo`, `facsimileNo`, `custMemo`, `useAt`, `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`. The search condition contains tenant ID, keyword, president name, business number, juridical number, business status, business item, and use status. Add tenant-scoped list/detail/duplicate queries, sequence `nextval`, insert with `RETURNING customer_id`, and tenant-scoped update. Search is partial-match for text fields and exact-match for `use_at`; order by customer code then customer ID.

Expose these mapper operations from the DAO: `selectCustomerList(condition)`, `selectCustomerById(params)`, `selectCustomerIdByCode(params)`, `selectNextCustomerCode()`, `insertCustomer(params)`, and `updateCustomer(params)`. The insert omits `customer_id` so its existing default remains authoritative; the insert returns that ID, then the service reloads the row using both ID and tenant.

- [ ] **Step 6: Implement service and controller**

Create and update require a tenant-admin principal, trim text input, require customer name, strictly validate `use_at`, and check duplicates within the tenant. A blank create code uses the dedicated sequence, formats with `String.format("%06d", value)`, checks for an existing tenant code, and tries the next sequence value up to 10 times before returning a clear validation error. Values above `999999` produce an explicit exhaustion error. Insert leaves `customer_id` to its existing database default. Update preserves server-owned tenant/identity/audit fields and returns 404 if the tenant-scoped row does not exist. GET derives tenant ID from `LoginVO`; clients cannot provide it.

Format generated values with `Locale.ROOT`, and stop before insert when the value is greater than `999999`. If a provided code or update code already exists in the same tenant, return a validation error; do not silently replace it with an automatically generated value.

- [ ] **Step 7: Run backend focused tests**

Run from `backend`:

```powershell
mvn -Dtest=CustomerInfoApiControllerTest,CustomerInfoServiceImplTest test
```

Expected: both new suites pass; mapper parsing confirms the XML statements and tenant constraints.

- [ ] **Step 8: Commit the backend API**

Stage only the new `co/master/customer` Java, mapper, and customer test paths, then commit:

```powershell
git add -- backend/src/main/java/egovframework/let/co/master/customer/ backend/src/main/resources/egovframework/mapper/let/co/master/customer/ backend/src/test/java/egovframework/let/co/master/customer/
git commit -m "feat(co): add tenant-scoped customer API" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 4: Implement the customer frontend service and state hook

**Files:**
- Create `customerManagement.types.ts`, `customerManagement.service.ts`, and `useCustomerManagement.ts`.
- Create `frontend/tests/customer-management-service.test.ts`.

- [ ] **Step 1: Write service tests first**

Test API row normalization for nullable strings/IDs and `Y`/`N`; GET query serialization for keyword and each detail filter; POST and PUT paths/payloads; and preservation of backend error messages.

Use a typed filter contract matching the API:

```ts
export type CustomerManagementFilters = {
  keyword?: string;
  presidentName?: string;
  businessNo?: string;
  juridNo?: string;
  businessStatus1?: string;
  businessItem1?: string;
  useAt?: 'Y' | 'N';
};
```

Assert that `fetchCustomerRows({ keyword: 'Acme', useAt: 'Y' })` calls `/api/v1/co/master/customers?keyword=Acme&useAt=Y` and that `createCustomer(payload)` and `updateCustomer(42, payload)` call POST `/api/v1/co/master/customers` and PUT `/api/v1/co/master/customers/42`.

- [ ] **Step 2: Run service tests and confirm failure**

Run from `frontend`:

```powershell
npm run test -- tests/customer-management-service.test.ts
```

Expected before implementation: FAIL because the service module is absent.

- [ ] **Step 3: Implement typed filters, row, payload, and API mapping**

Define a row type using database-backed camelCase fields and `useAt: 'Y' | 'N'`; define optional keyword/detail filters and a save payload excluding server-managed identity, tenant, and audit values. Use `apiGet`, `apiPost`, and `apiPut` from `apiClient`; map `resultList` and `item` using explicit typed normalization, not `any`.

The frontend row carries `customerId: number | string`, the 13 customer business strings (`customerCode`, `customerName`, `custNameAbbr`, `presidentName`, `businessNo`, `juridNo`, `businessStatus1`, `businessItem1`, `postCode`, `address`, `telephoneNo`, `facsimileNo`, `custMemo`), `useAt: 'Y' | 'N'`, and `createdAt: string`. The save payload carries those 13 editable business strings plus `useAt`, excluding `customerId`, `tenantId`, and audit actor/timestamp fields.

- [ ] **Step 4: Implement page state and request lifecycle**

The hook loads the initial unfiltered list, exposes explicit `applyFilters`, tracks initial/subsequent loading, stores errors from failed requests, saves inserted/updated rows, reloads the currently applied filters after success, and reports success through `useNotification`. Preserve current rows when a later request fails and surface the error.

- [ ] **Step 5: Run frontend service tests**

Run from `frontend`:

```powershell
npm run test -- tests/customer-management-service.test.ts
```

Expected: all service tests pass.

- [ ] **Step 6: Commit the frontend data layer**

Stage only the customer service, types, hook, and service test, then commit:

```powershell
git add -- frontend/src/pages/co/master/customers/types/customerManagement.types.ts frontend/src/pages/co/master/customers/services/customerManagement.service.ts frontend/src/pages/co/master/customers/hooks/useCustomerManagement.ts frontend/tests/customer-management-service.test.ts
git commit -m "feat(co): add customer management data layer" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 5: Implement the F1-Grid page and dashboard route

**Files:**
- Create `CustomerManagementPage.tsx` and `components/CustomerManagementGrid.tsx`.
- Modify `DashboardContent.tsx` and `dashboardData.tsx`.
- Create `frontend/tests/customer-management-page.test.tsx`.

- [ ] **Step 1: Write page and column tests first**

Test `customers` dashboard key selects the customer page; columns place a `rownumber` column first and define each data field once; search metadata produces president/business number/legal number/business status/business item/use status filters; query submission combines keyword and detail values; admin and menu permissions gate add/update; row-form create/update sends correct payloads; save errors are shown and success reloads the current search.

The search test asserts the applied filter object has both kinds of conditions:

```ts
expect(fetchCustomerRows).toHaveBeenLastCalledWith({
  keyword: 'Acme',
  presidentName: 'Lee',
  useAt: 'Y',
});
```

- [ ] **Step 2: Run page tests and confirm failure**

Run from `frontend`:

```powershell
npm run test -- tests/customer-management-page.test.tsx
```

Expected before implementation: FAIL because the page and grid are absent.

- [ ] **Step 3: Implement F1-Grid columns and row form**

Use the existing `F1Grid`, `F1GridRef`, and `rowFormPlugin` patterns. Define row number, customer code, customer name, abbreviation, president, business number, business status, business item, telephone, address, and use status columns. Define form fields for all customer business columns. Mark customer name required; give use status `Y`/`N` options; allow blank code at creation for backend generation; keep tenant/audit fields out of the form. Keep the grid's standard filtering, sorting, row selection, Excel permission, and internal horizontal scroll behavior.

- [ ] **Step 4: Implement search and page actions**

Compose `PageHeader`, one integrated keyword `TextField`, `PageSearchArea` with `toPageSearchFields(columns)`, `PageMessageArea`, and the grid. Keyword fields are customer code/name/abbreviation. Detailed conditions are the approved metadata fields. Submit detailed search explicitly and combine it with the keyword. Initially query without a use-status filter. Gate read by read permission and writes by tenant-admin plus create/update menu permissions. Do not add delete actions.

- [ ] **Step 5: Connect the dashboard menu key**

Add the `co && currentPageKey === 'customers'` branch in `DashboardContent.tsx`, pass module, title, content, breadcrumb, permissions, and tenant-admin state, and add the `customers` content entry in `dashboardData.tsx`.

- [ ] **Step 6: Run focused frontend tests**

Run from `frontend`:

```powershell
npm run test -- tests/customer-management-page.test.tsx tests/customer-management-service.test.ts
```

Expected: all customer page and service tests pass.

- [ ] **Step 7: Commit the page and dashboard wiring**

Stage only the customer page/grid, dashboard route/content, and customer page test, then commit:

```powershell
git add -- frontend/src/pages/co/master/customers/CustomerManagementPage.tsx frontend/src/pages/co/master/customers/components/CustomerManagementGrid.tsx frontend/src/pages/dashboard/components/DashboardContent.tsx frontend/src/pages/dashboard/services/dashboardData.tsx frontend/tests/customer-management-page.test.tsx
git commit -m "feat(co): add customer management page" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Task 6: Update F1-Grid documentation, verify builds, and record results

**Files:**
- Modify `frontend/src/pages/f1-grid-docs/F1-GRID.md`.
- Create the result report and screenshots under `docs/result/20261022/customer-management/`.

- [ ] **Step 1: Document the page-level F1-Grid example**

Add a concise example describing customer column `search` metadata → `toPageSearchFields()` → `PageSearchArea` → tenant-scoped API filters, and the grid row form's optional backend-generated customer code. Do not alter F1-Grid core behavior or describe features not used by the page.

- [ ] **Step 2: Run focused verification**

Run from `frontend`:

```powershell
npm run test -- tests/customer-management-page.test.tsx tests/customer-management-service.test.ts
npm run build
```

Run from `backend`:

```powershell
mvn -Dtest=CustomerInfoApiControllerTest,CustomerInfoServiceImplTest test
```

Expected: all targeted tests pass and the TypeScript/Vite build succeeds.

- [ ] **Step 3: Verify browser behavior at required widths**

Use the existing S-ERP Vite server on `http://127.0.0.1:4173` only after confirming it is this workspace's frontend. If a server must be started, use `npm run dev -- --strictPort` and stop only the process started for this verification. Check `/co/master/customers` at 375px, 768px, and 1280px. Verify search/detail search, list rendering, add/update row form, automatic code hint, permissions, empty/loading/error states, and that only the grid scrolls horizontally.

- [ ] **Step 4: Save screenshots and the result report**

Save viewport screenshots with lowercase ASCII filenames in `docs/result/20261022/customer-management/screenshots/`. The result report records implementation files, approved requirements, DB MCP metadata evidence, sequence migration files, tests/build/browser results, and any limitations. Do not record tenant data rows, credentials, or connection details.

- [ ] **Step 5: Perform final review**

Run `git diff --check`, compare duplicate database scripts by hash, verify the dated direction/plan/spec/result links, and confirm `.mcp.json` or other pre-existing changes were not staged or modified by this work.

- [ ] **Step 6: Commit the usage and result documentation**

Stage only the F1-Grid usage documentation and customer result report/screenshots, then commit:

```powershell
git add -- frontend/src/pages/f1-grid-docs/F1-GRID.md docs/result/20261022/customer-management/
git commit -m "docs(co): document customer grid workflow" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Spec Coverage Review

- Route, dashboard content, breadcrumb, and permissions: Task 5.
- Tenant-scoped list, create, update, and no-delete use status: Tasks 3 and 5.
- Integrated and metadata-driven detailed search: Tasks 3, 4, and 5.
- `tb_customer_info` field mapping and validation: Tasks 2, 3, and 5.
- Exact six-digit automatic code and exhaustion behavior: Tasks 2 and 3.
- Loading/error/success and responsive behavior: Tasks 4, 5, and 6.
- Date-based project/database documentation, F1-Grid documentation, screenshots, and result report: Tasks 1, 2, and 6.
- MCP data safety: database inspection uses metadata only; no tenant rows are queried and no migration is run through MCP.
