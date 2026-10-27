import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUnsavedChangesBeforeUnload } from '../src/shared/hooks/useUnsavedChangesBeforeUnload';

function Guard({ dirty }: { dirty: boolean }) {
  useUnsavedChangesBeforeUnload(dirty);
  return null;
}

function requestsUnloadWarning() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('shared unsaved changes beforeunload guard', () => {
  it('only protects dirty state and releases protection when changes are saved or reverted', () => {
    const view = render(<Guard dirty={false} />);
    expect(requestsUnloadWarning()).toBe(false);

    view.rerender(<Guard dirty />);
    expect(requestsUnloadWarning()).toBe(true);

    view.rerender(<Guard dirty={false} />);
    expect(requestsUnloadWarning()).toBe(false);
  });

  it('removes its listener on unmount including StrictMode effect replay', () => {
    const view = render(<StrictMode><Guard dirty /></StrictMode>);
    expect(requestsUnloadWarning()).toBe(true);
    view.unmount();
    expect(requestsUnloadWarning()).toBe(false);
  });

  it('keeps remaining dirty consumers protected when another consumer becomes clean or closes', () => {
    const page = render(<Guard dirty />);
    const dialog = render(<Guard dirty />);
    expect(requestsUnloadWarning()).toBe(true);

    page.rerender(<Guard dirty={false} />);
    expect(requestsUnloadWarning()).toBe(true);
    page.unmount();
    expect(requestsUnloadWarning()).toBe(true);

    dialog.unmount();
    expect(requestsUnloadWarning()).toBe(false);
  });
});
