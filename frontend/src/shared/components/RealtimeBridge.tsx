import { useEffect } from 'react';
import { startRealtimeUpdates } from '../services/realtimeService';

export function RealtimeBridge() {
  useEffect(() => startRealtimeUpdates((areas) => {
    window.dispatchEvent(new CustomEvent('s-erp:realtime', { detail: { areas } }));
  }), []);
  return null;
}
