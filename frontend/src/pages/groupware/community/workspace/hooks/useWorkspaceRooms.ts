import { useCallback, useEffect, useRef, useState } from 'react';
import { listRooms, saveRoom as saveRoomRequest } from '../services/workspace.service';
import type { WorkspaceRoom } from '../types/workspace.types';

export function useWorkspaceRooms(userId: string) {
  const [rooms, setRooms] = useState<WorkspaceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const request = (requestRef.current += 1);
    try {
      const next = await listRooms(userId);
      if (request !== requestRef.current) return;
      setRooms(next);
      setError(null);
    } catch (reason) {
      if (request !== requestRef.current) return;
      setError(reason instanceof Error ? reason.message : '방 목록을 불러오지 못했습니다.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [userId]);

  // 저장이 끝나는 시점에는 사용자가 이미 바뀌었을 수 있으므로, 항상 최신 사용자 기준으로 다시 불러온다.
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  // 실패는 호출한 다이얼로그가 보여줄 수 있게 그대로 던진다.
  const saveRoom = useCallback(
    async (room: WorkspaceRoom) => {
      const saved = await saveRoomRequest(room, userId);
      await reloadRef.current();
      return saved;
    },
    [userId],
  );

  return { rooms, loading, error, reload, saveRoom };
}
