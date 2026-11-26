import { describe, expect, it } from 'vitest';
import {
  can,
  resolveLevel,
} from '../src/pages/groupware/community/workspace/data/workspacePermissions';
import type { WorkspaceRoom } from '../src/pages/groupware/community/workspace/types/workspace.types';

const room: WorkspaceRoom = {
  id: 'r1',
  name: '테스트 방',
  defaultView: 'feed',
  columns: [],
  groups: [
    { id: 'g1', name: '읽기', level: 'read', members: [{ kind: 'user', userId: 'u1' }, { kind: 'user', userId: 'u2' }] },
    { id: 'g2', name: '저장', level: 'write', members: [{ kind: 'user', userId: 'u2' }] },
  ],
};

describe('workspace permissions', () => {
  it('returns the highest level among the groups a user belongs to', () => {
    expect(resolveLevel(room, 'u2')).toBe('write');
    expect(resolveLevel(room, 'u1')).toBe('read');
  });

  it('returns null when the user is in no group', () => {
    expect(resolveLevel(room, 'nobody')).toBeNull();
  });

  it('treats levels as cumulative', () => {
    expect(can('write', 'read')).toBe(true);
    expect(can('admin', 'write')).toBe(true);
    expect(can('read', 'write')).toBe(false);
    expect(can(null, 'read')).toBe(false);
  });
});
