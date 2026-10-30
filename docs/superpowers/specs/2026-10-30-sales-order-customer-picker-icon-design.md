# Sales Order Customer Picker Icon Design

## Context

In the sales-order basic-information form, the customer value is displayed in a
read-only field beside a separate "선택" button. The item/partner price form
opens the same customer lookup dialog from a magnifying-glass icon inside its
field. The requested change is limited to matching that trigger style on the
sales-order customer field.

## Approaches considered

1. Add an icon-trigger option to the shared `MasterPicker` and enable it only
   for the sales-order customer field. This reuses the existing dialog and
   selection behavior without changing other picker call sites.
2. Build the icon field and dialog locally in the sales-order page. This
   isolates the change but duplicates shared picker behavior.
3. Change every `MasterPicker` to use an icon. This is concise but could alter
   unrelated current or future consumers.

Approach 1 is selected for its narrow impact and reuse of the existing picker.

## Approved behavior

- Replace the separate customer "선택" button in the sales-order basic
  information section with a magnifying-glass icon at the end of the customer
  field.
- Clicking the icon opens the existing customer lookup dialog.
- Preserve the selected customer's code/name display, required validation,
  error/helper text, disabled state, search service, and selection callback.
- Keep the default `MasterPicker` trigger unchanged; opt into the icon only for
  the sales-order customer field.
- Do not change the customer search contract, dialog contents, or sales-order
  persistence behavior.

## Verification

- Add focused coverage that the sales-order customer field opens the existing
  lookup through its icon and returns the selected customer.
- Verify the icon respects the disabled state and the selected customer stays
  displayed.
- Run the sales-order page and shared picker tests plus the frontend build.
- Check the field at 375px, 768px, and 1280px in a real browser; keep the icon
  aligned within the existing responsive basic-information grid.
