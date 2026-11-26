import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addComment,
  createPost,
  deleteComment,
  listPosts,
  listRooms,
  loadPrefs,
  movePost,
  resetWorkspaceStore,
  savePrefs,
  saveRoom,
  updateComment,
  updatePost,
} from '../src/pages/groupware/community/workspace/services/workspace.service';

// u1: 영업 admin, u2/u3: 영업 write, u4: 영업 read (workspaceSamples 기준)
const newPost = (overrides = {}) => ({
  roomId: 'room-sales',
  title: '새 글',
  body: '본문',
  authorId: 'u2',
  columnId: 'col-request',
  attachments: [],
  ...overrides,
});

describe('workspace service', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWorkspaceStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('lists only rooms the user can read', async () => {
    const rooms = await listRooms('u4');
    expect(rooms.map((room) => room.id).sort()).toEqual(['room-design', 'room-free', 'room-sales']);
    const none = await listRooms('nobody');
    expect(none).toEqual([]);
  });

  it('rejects creating a post for a read-only user', async () => {
    await expect(createPost(newPost({ authorId: 'u4' }), 'u4')).rejects.toThrow('저장 권한이 없습니다.');
  });

  it('creates a post and puts it first in the list', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-27T00:00:00Z'));
    const created = await createPost(newPost(), 'u2');
    const posts = await listPosts('room-sales');
    expect(posts[0].id).toBe(created.id);
    expect(created.comments).toEqual([]);
  });

  it('falls back to the first column when the column is missing in a room with columns', async () => {
    const created = await createPost(newPost({ columnId: null }), 'u2');
    expect(created.columnId).toBe('col-request');
  });

  it('lets only the author update a post and keeps comments and author', async () => {
    const created = await createPost(newPost(), 'u2');
    const input = { title: ' 수정 제목 ', body: '<p>수정</p>', columnId: 'col-done', attachments: [] };
    await expect(updatePost(created.id, input, 'u3')).rejects.toThrow('수정 권한이 없습니다.');
    await expect(updatePost(created.id, { ...input, title: ' ' }, 'u2')).rejects.toThrow('제목을 입력하세요.');
    const updated = await updatePost(created.id, input, 'u2');
    expect(updated).toMatchObject({ title: '수정 제목', body: '<p>수정</p>', columnId: 'col-done', authorId: 'u2' });
    expect(updated.createdAt).toBe(created.createdAt);
    const stored = (await listPosts('room-sales')).find((post) => post.id === created.id);
    expect(stored?.title).toBe('수정 제목');
  });

  it('moves a post and every user sees the same column', async () => {
    await movePost('post-1', 'col-done', 'u2');
    const asAdmin = (await listPosts('room-sales')).find((post) => post.id === 'post-1');
    expect(asAdmin?.columnId).toBe('col-done');
    await expect(movePost('post-1', 'col-done', 'u4')).rejects.toThrow('저장 권한이 없습니다.');
    await expect(movePost('post-1', 'unknown', 'u2')).rejects.toThrow();
  });

  it('adds a comment and a nested reply', async () => {
    const comment = await addComment('post-3', null, '첫 댓글', 'u3');
    await addComment('post-3', comment.id, '답글', 'u2');
    const post = (await listPosts('room-sales')).find((item) => item.id === 'post-3');
    expect(post?.comments[0].replies[0].body).toBe('답글');
    await expect(addComment('post-3', null, '   ', 'u3')).rejects.toThrow();
  });

  it('stores comment attachments and accepts an attachment-only comment', async () => {
    const file = { name: 'a.png', size: 3, type: 'image/png', dataUrl: 'data:image/png;base64,AAAA' };
    const created = await addComment('post-3', null, '<p></p>', 'u3', [file]);
    expect(created.attachments).toEqual([file]);
    await expect(addComment('post-3', null, '<p> </p>', 'u3')).rejects.toThrow('댓글 내용을 입력하세요.');
  });

  it('lets only the author edit a comment', async () => {
    const created = await addComment('post-3', null, '<p>원본</p>', 'u3');
    await expect(updateComment('post-3', created.id, '<p>남의 수정</p>', 'u2')).rejects.toThrow('수정 권한이 없습니다.');
    const updated = await updateComment('post-3', created.id, '<p>수정본</p>', 'u3');
    expect(updated.body).toBe('<p>수정본</p>');
    const post = (await listPosts('room-sales')).find((item) => item.id === 'post-3');
    expect(post?.comments[0].body).toBe('<p>수정본</p>');
  });

  it('deletes a comment by marking it and keeping its replies', async () => {
    const parent = await addComment('post-3', null, '<p>부모</p>', 'u3');
    await addComment('post-3', parent.id, '<p>답글</p>', 'u2');
    await expect(deleteComment('post-3', parent.id, 'u2')).rejects.toThrow('삭제 권한이 없습니다.');
    await deleteComment('post-3', parent.id, 'u3');
    const post = (await listPosts('room-sales')).find((item) => item.id === 'post-3');
    expect(post?.comments[0]).toMatchObject({ deleted: true, body: '' });
    expect(post?.comments[0].replies[0].body).toBe('<p>답글</p>');
  });

  it('lets a room admin delete a comment written by someone else', async () => {
    const created = await addComment('post-3', null, '<p>삭제 대상</p>', 'u3');
    await deleteComment('post-3', created.id, 'u1');
    const post = (await listPosts('room-sales')).find((item) => item.id === 'post-3');
    expect(post?.comments[0].deleted).toBe(true);
  });

  it('rejects room settings changes from a non-admin', async () => {
    const [room] = (await listRooms('u2')).filter((item) => item.id === 'room-sales');
    await expect(saveRoom({ ...room, name: '변경' }, 'u2')).rejects.toThrow('방 설정 권한이 없습니다.');
  });

  it('rejects deleting a column that still has cards', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    const withoutRequest = { ...room, columns: room.columns.filter((column) => column.id !== 'col-request') };
    await expect(saveRoom(withoutRequest, 'u1')).rejects.toThrow('카드가 있는 컬럼은 삭제할 수 없습니다.');
  });

  it('rejects a save that leaves no admin group', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    const noAdmin = { ...room, groups: room.groups.filter((group) => group.level !== 'admin') };
    await expect(saveRoom(noAdmin, 'u1')).rejects.toThrow('방 설정 권한 그룹은 최소 1개 필요합니다.');
  });

  it('forces the feed view when a room has no columns', async () => {
    const [room] = (await listRooms('u2')).filter((item) => item.id === 'room-design');
    const saved = await saveRoom({ ...room, defaultView: 'kanban' }, 'u2');
    expect(saved.defaultView).toBe('feed');
  });

  it('creates a new room with at least one admin group', async () => {
    const saved = await saveRoom(
      {
        id: 'room-new',
        name: '새 방',
        defaultView: 'feed',
        columns: [],
        groups: [{ id: 'g-new', name: '관리자', level: 'admin', members: [{ kind: 'user', userId: 'u3' }] }],
      },
      'u3',
    );
    expect((await listRooms('u3')).some((room) => room.id === saved.id)).toBe(true);
  });

  it('rejects a save whose only admin group has no members', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    const emptied = {
      ...room,
      groups: room.groups.map((group) => (group.level === 'admin' ? { ...group, members: [] } : group)),
    };
    await expect(saveRoom(emptied, 'u1')).rejects.toThrow('방 설정 권한 그룹에는 구성원이 1명 이상 필요합니다.');
  });

  it('rejects a save that would remove the actor’s own admin access', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    const handedOver = {
      ...room,
      groups: room.groups.map((group) =>
        group.level === 'admin' ? { ...group, members: [{ kind: 'user' as const, userId: 'u2' }] } : group,
      ),
    };
    await expect(saveRoom(handedOver, 'u1')).rejects.toThrow('본인의 방 설정 권한을 제거할 수 없습니다.');
  });

  it('rejects creating a room in which the creator is not an admin', async () => {
    await expect(
      saveRoom(
        {
          id: 'room-orphan',
          name: '남의 방',
          defaultView: 'feed',
          columns: [],
          groups: [{ id: 'g-x', name: '관리자', level: 'admin', members: [{ kind: 'user', userId: 'u2' }] }],
        },
        'u3',
      ),
    ).rejects.toThrow('본인의 방 설정 권한을 제거할 수 없습니다.');
  });

  it('moves feed posts into the first column when a room gains its first columns', async () => {
    const [room] = (await listRooms('u2')).filter((item) => item.id === 'room-design');
    await saveRoom({ ...room, columns: [{ id: 'col-new', name: '접수' }] }, 'u2');
    const posts = await listPosts('room-design');
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((post) => post.columnId === 'col-new')).toBe(true);
  });

  it('keeps changes visible when writing to localStorage fails', async () => {
    await createPost(newPost({ title: '먼저 저장된 글' }), 'u2');
    expect(localStorage.getItem('s-erp:workspace:data')).not.toBeNull();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    const created = await createPost(newPost({ title: '저장 실패해도 보임' }), 'u2');
    const posts = await listPosts('room-sales');
    expect(posts.some((post) => post.id === created.id)).toBe(true);
  });

  it('keeps a valid column color and rejects a malformed one', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    const colored = { ...room, columns: room.columns.map((column, index) => (index === 0 ? { ...column, color: '#EF4444' } : column)) };
    const saved = await saveRoom(colored, 'u1');
    expect(saved.columns[0].color).toBe('#EF4444');
    const broken = { ...room, columns: room.columns.map((column, index) => (index === 0 ? { ...column, color: 'red' } : column)) };
    await expect(saveRoom(broken, 'u1')).rejects.toThrow('컬럼 색상 형식이 올바르지 않습니다.');
  });

  it('ignores malformed personal colors when loading prefs', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    localStorage.setItem(
      's-erp:workspace:u1:prefs:room-sales',
      JSON.stringify({ columnColors: { 'col-doing': '#3b82f6', 'col-done': 'javascript:alert(1)', gone: '#ef4444' } }),
    );
    expect(loadPrefs('u1', room).columnColors).toEqual({ 'col-doing': '#3b82f6' });
  });

  it('falls back to samples when stored data is corrupt', async () => {
    localStorage.setItem('s-erp:workspace:data', '{깨진');
    const rooms = await listRooms('u4');
    expect(rooms).toHaveLength(3);
  });

  it('keeps working when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const rooms = await listRooms('u4');
    expect(rooms).toHaveLength(3);
    await expect(createPost(newPost(), 'u2')).resolves.toBeTruthy();
  });

  it('saves per-user prefs and reconciles them against removed columns', async () => {
    const [room] = (await listRooms('u1')).filter((item) => item.id === 'room-sales');
    savePrefs('u1', room.id, {
      hiddenColumnIds: ['col-done', 'col-gone'],
      collapsedColumnIds: [],
      columnOrder: ['col-done', 'col-gone', 'col-request', 'col-doing'],
      columnColors: {},
      onlyMine: true,
      keyword: '',
    });
    const mine = loadPrefs('u1', room);
    expect(mine.hiddenColumnIds).toEqual(['col-done']);
    expect(mine.columnOrder).toEqual(['col-done', 'col-request', 'col-doing']);
    expect(loadPrefs('u2', room).onlyMine).toBe(false);
  });
});
