# Sales Order Customer Picker Icon Implementation Plan

> **For agentic workers:** Implement each step in order and keep the existing worktree changes intact. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the sales-order basic-information customer picker’s separate selection button with a magnifying-glass icon inside its field.

**Architecture:** Add an optional trigger mode to the shared `MasterPicker`, retaining its current button mode as the default. Pass icon mode only through the sales-order `CustomerPicker`; reuse the existing search dialog, customer service, and selection callback.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite.

---

### Task 1: Specify the sales-order-only trigger

**Files:**
- Modify: `frontend/src/shared/components/master-picker/masterPicker.types.ts`
- Modify: `frontend/src/shared/components/master-picker/MasterPicker.tsx`
- Modify: `frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`

- [x] **Step 1: Add a failing shared-picker test**

In `frontend/tests/master-picker.test.tsx`, render `MasterPicker` with
`triggerMode="icon"`, `label="거래처"`, `value={null}`, a resolved search
function, and a no-op `onChange`. Assert that the read-only textbox named
`거래처` contains a button named `거래처 선택` inside its `.MuiInputAdornment`.
Assert there is no separate button whose accessible name is `선택`.

- [x] **Step 2: Run the focused test and confirm it fails**

Run from `frontend`:

```powershell
npm run test -- tests/master-picker.test.tsx
```

Expected: TypeScript/test failure because `triggerMode` is not yet a supported
prop, and the icon is absent from the input adornment.

- [x] **Step 3: Add the optional trigger mode**

Add `triggerMode?: 'button' | 'icon'` to `MasterPickerProps`. In
`MasterPicker.tsx`, import `IconButton` and `InputAdornment` from MUI. Default
`triggerMode` to `'button'`. Keep the existing standalone `Button` for that
mode. For `'icon'`, provide this end adornment to the read-only `TextField`:

```tsx
<InputAdornment position="end">
  <IconButton
    aria-label={`${label} 선택`}
    disabled={disabled}
    edge="end"
    onClick={() => setOpen(true)}
    size="small"
  >
    <SearchIcon fontSize="small" />
  </IconButton>
</InputAdornment>
```

Use the existing `setOpen`, `handleChange`, and `MasterPickerDialog`; do not
change search or selection behavior.

- [x] **Step 4: Opt only the order customer field into icon mode**

Pass `triggerMode="icon"` to the `CustomerPicker` in
`frontend/src/pages/sales/order/create/SalesOrderCreatePage.tsx`. Do not change
the picker wrapper or any material picker usage.

- [x] **Step 5: Run the shared-picker tests**

Run from `frontend`:

```powershell
npm run test -- tests/master-picker.test.tsx
```

Expected: all existing default-button tests and the new icon-trigger test pass.

### Task 2: Verify page integration and regressions

**Files:**
- Modify: `frontend/tests/sales-order-create-page.test.tsx`
- Verify: `frontend/tests/master-picker.test.tsx`

- [x] **Step 1: Update the page assertions**

In the page render test, assert that the 거래처 textbox has a `거래처 선택`
button in its input adornment and that no separate text `선택` button exists.
Keep the layout assertion by locating the picker stack from the textbox rather
than the old standalone button.

- [x] **Step 2: Keep the existing selection-flow test meaningful**

The existing `selectCustomer` helper already clicks the accessible name
`거래처 선택`, searches, and selects `C-10 거래처 10`. Keep that flow and add
an assertion that the textbox named `거래처` displays `C-10 · 거래처 10` after
selection.

- [x] **Step 3: Verify disabled-state behavior**

The shared-picker test renders `MasterPicker` with `triggerMode="icon"` and
`disabled`. Assert the adornment button `거래처 선택` is disabled and clicking
it does not open a dialog. The page continues to pass its existing
`disabled={!isEditable}` state through `CustomerPicker`.

- [x] **Step 4: Run focused frontend tests**

Run from `frontend`:

```powershell
npm run test -- tests/master-picker.test.tsx tests/sales-order-create-page.test.tsx
```

Expected: icon-trigger and selection-flow tests pass. The run reports one
pre-existing sales-order test failure: the fixed-date expectation documented
in the result report.

### Task 3: Validate layout and document the result

**Files:**
- Create: `docs/result/20261030/sales-order-customer-picker/README.md`
- Create: `docs/result/20261030/sales-order-customer-picker/screenshots/` (375px, 768px, 1280px browser captures)

- [x] **Step 1: Run frontend build and lint**

Run from `frontend`:

```powershell
npm run build
npm run lint
```

Expected: build exits successfully; changed-file lint exits 0. Full lint has an
unrelated existing conditional-Hook error in
`tests/common-code-management-page.test.tsx:53`, documented in the result.

- [x] **Step 2: Inspect the browser server and run responsive checks**

Check `http://127.0.0.1:4173` before starting a server. Reuse it only if it is
the existing S-ERP server; otherwise stop and resolve the port conflict rather
than silently switching ports. If no server is running, run
`npm run dev -- --strictPort` and stop only that process after verification.
At 375px, 768px, and 1280px, verify the icon is inside the customer field, the
dialog opens, and selection updates the customer value without page-level
horizontal overflow. Save a screenshot at each width using synthetic results.

- [x] **Step 3: Write the result report**

Record the trigger change, unchanged search/selection contract, test/build/lint
results, browser results for each width, screenshot paths, and any limitation
in `docs/result/20261030/sales-order-customer-picker/README.md`. Do not include
real customer records or credentials.

- [x] **Step 4: Commit only the files for this change**

Stage the direction, plan/spec, implementation, focused tests, result report,
screenshots, and design document by exact path. Commit with a concise message
and the required Copilot co-author trailer. Do not stage the pre-existing
unrelated worktree changes.

## Self-review

- The selected design changes only the sales-order customer trigger and retains
  existing `MasterPicker` button behavior by default.
- Existing required/error states, customer service, lookup dialog, selected
  ID/code/name, and save payload remain covered.
- No backend, database, F1-Grid, or unrelated item-price picker change is
  included.
- Focused UI tests plus build/lint and three viewport browser checks cover the
  design's verification requirements.
