import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  listPosts: vi.fn(),
  movePost: vi.fn(),
  createPost: vi.fn(),
  addComment: vi.fn(),
  listRooms: vi.fn(),
  saveRoom: vi.fn(),
}));

vi.mock('../src/pages/groupware/community/workspace/services/workspace.service', () => service);

import { useWorkspacePosts } from '../src/pages/groupware/community/workspace/hooks/useWorkspacePosts';
import { useWorkspaceRooms } from '../src/pages/groupware/community/workspace/hooks/useWorkspaceRooms';

const post = (roomId: string) => ({ id: `${roomId}-post`, roomId });

describe('workspace hooks ignore stale results', () => {
  it('keeps the new room’s posts when a move started in the previous room finishes later', async () => {
    service.listPosts.mockImplementation((roomId: string) => Promise.resolve([post(roomId)]));
    let finishMove: () => void = () => undefined;
    service.movePost.mockImplementation(() => new Promise<void>((resolve) => { finishMove = resolve; }));

    const { result, rerender } = renderHook(({ roomId }) => useWorkspacePosts(roomId, 'u1'), {
      initialProps: { roomId: 'room-a' as string | null },
    });
    await waitFor(() => expect(result.current.posts[0]?.id).toBe('room-a-post'));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.movePost('room-a-post', 'col-1');
    });
    rerender({ roomId: 'room-b' });
    await waitFor(() => expect(result.current.posts[0]?.id).toBe('room-b-post'));

    await act(async () => {
      finishMove();
      await pending;
    });
    expect(result.current.posts.map((item) => item.id)).toEqual(['room-b-post']);
  });

  it('keeps the new user’s rooms when a save started for the previous user finishes later', async () => {
    const room = (id: string) => ({ id, name: id, defaultView: 'feed', columns: [], groups: [] });
    service.listRooms.mockImplementation((userId: string) => Promise.resolve([room(`rooms-of-${userId}`)]));
    let finishSave: () => void = () => undefined;
    service.saveRoom.mockImplementation(
      () => new Promise((resolve) => { finishSave = () => resolve(room('saved')); }),
    );

    const { result, rerender } = renderHook(({ userId }) => useWorkspaceRooms(userId), {
      initialProps: { userId: 'u1' },
    });
    await waitFor(() => expect(result.current.rooms[0]?.id).toBe('rooms-of-u1'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.saveRoom(room('x'));
    });
    rerender({ userId: 'u2' });
    await waitFor(() => expect(result.current.rooms[0]?.id).toBe('rooms-of-u2'));

    await act(async () => {
      finishSave();
      await pending;
    });
    expect(result.current.rooms.map((item) => item.id)).toEqual(['rooms-of-u2']);
  });
});
