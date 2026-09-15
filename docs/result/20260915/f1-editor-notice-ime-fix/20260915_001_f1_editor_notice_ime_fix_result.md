# F1 Editor notice IME input fix result

## Date

2026-09-15

## Scope

- Notice composer dialog on `/groupware/community/notice`
- Shared `F1Editor` title/body contentEditable input handling

## Issue

Korean input in the notice composer title/body was broken while English and numbers worked. Browser verification showed Korean text being duplicated, reordered, or not entered after clicking the editable area.

## Cause

The editor committed `contentEditable` text into React state during active typing and IME composition. That caused React to re-render the editable node while the browser was still managing caret/composition state.

A second issue was that the empty editable heading/body needed explicit focus handling when opened inside the modal.

## Changes

- Kept active title/body editing DOM-owned while the user is typing.
- Split pending editable text from committed document text.
- Finalized editable DOM text on blur or submit.
- Prevented pending text in another editable node from being overwritten during rerenders.
- Added explicit focus handling and `tabIndex` for editable title/body nodes.
- Added/updated regression tests for Korean IME composition and rerender stability.

## Verification

### Unit regression

Command:

```powershell
cd 'd:\f1soft\dev\react\S-ERP\frontend' ; npm run test -- tests/f1-editor.test.tsx
```

Result:

- Test file: 1 passed
- Tests: 14 passed, 0 failed

### Browser dialog verification

Target:

- `http://127.0.0.1:4173/groupware/community/notice`

Steps:

1. Opened the notice page.
2. Opened `새 공지 작성` dialog.
3. Entered Korean text one character at a time in the title editor.
4. Entered Korean text one character at a time in the body editor.

Observed values:

- Title: `한` -> `한글` -> `한글자`
- Body: `한` -> `한글` -> `한글자`

Screenshot:

- [screenshots/notice-dialog-ime-input.png](screenshots/notice-dialog-ime-input.png)
