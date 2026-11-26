import { useCallback, useState } from 'react';
import { defaultPrefs } from '../data/workspacePrefs';
import { loadPrefs, savePrefs } from '../services/workspace.service';
import type { WorkspaceRoom, WorkspaceViewPrefs } from '../types/workspace.types';

// 사용자·방·컬럼 구성이 바뀌면 저장된 개인 설정을 다시 읽어 보정한다.
export function useWorkspaceViewPrefs(userId: string, room: WorkspaceRoom | null) {
  const key = room ? `${userId}:${room.id}:${room.columns.map((c) => c.id).join(',')}` : 'none';
  const [local, setLocal] = useState<{ key: string; prefs: WorkspaceViewPrefs } | null>(null);

  const prefs: WorkspaceViewPrefs =
    local && local.key === key
      ? local.prefs
      : room
        ? loadPrefs(userId, room)
        : defaultPrefs([]);

  const update = useCallback(
    (partial: Partial<WorkspaceViewPrefs>) => {
      if (!room) return;
      const next = { ...prefs, ...partial };
      setLocal({ key, prefs: next });
      savePrefs(userId, room.id, next);
    },
    [key, prefs, room, userId],
  );

  return { prefs, update };
}
