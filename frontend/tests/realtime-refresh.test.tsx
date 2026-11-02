import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRealtimeRefresh } from '../src/shared/hooks/useRealtimeRefresh';

describe('realtime UI refresh coordination', () => {
  it('serializes refreshes and reruns when an event arrives during a request', async () => {
    let resolve!: () => void;
    const refresh = vi.fn().mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }))
      .mockResolvedValue(undefined);
    function Consumer() {
      useRealtimeRefresh('MESSAGE', refresh);
      return null;
    }
    const view = render(<Consumer />);
    const signal = () => window.dispatchEvent(new CustomEvent('s-erp:realtime', { detail: { areas: ['MESSAGE'] } }));
    act(() => { signal(); signal(); signal(); });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    expect(refresh).toHaveBeenCalledTimes(2);
    view.unmount();
    act(signal);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
