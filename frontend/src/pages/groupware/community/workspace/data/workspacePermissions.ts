import type { WorkspaceLevel, WorkspaceRoom } from '../types/workspace.types';

const LEVEL_RANK: Record<WorkspaceLevel, number> = { read: 1, write: 2, admin: 3 };

export function resolveLevel(room: WorkspaceRoom, userId: string): WorkspaceLevel | null {
  let best: WorkspaceLevel | null = null;
  room.groups.forEach((group) => {
    const isMember = group.members.some((member) => member.kind === 'user' && member.userId === userId);
    if (isMember && (best === null || LEVEL_RANK[group.level] > LEVEL_RANK[best])) {
      best = group.level;
    }
  });
  return best;
}

export function can(level: WorkspaceLevel | null, need: WorkspaceLevel): boolean {
  return level !== null && LEVEL_RANK[level] >= LEVEL_RANK[need];
}
