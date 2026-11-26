import { isHexColor } from '../data/workspaceColors';
import { hasCommentContent } from '../data/workspaceFeedAdapter';
import { can, resolveLevel } from '../data/workspacePermissions';
import { defaultPrefs, reconcilePrefs } from '../data/workspacePrefs';
import { createSampleStore } from '../data/workspaceSamples';
import type {
  WorkspaceAttachment,
  WorkspaceComment,
  WorkspaceLevel,
  WorkspacePost,
  WorkspaceRoom,
  WorkspaceStore,
  WorkspaceViewPrefs,
} from '../types/workspace.types';

// 백엔드가 생기면 이 파일만 API 호출로 교체한다. 화면은 이 파일의 함수만 사용한다.

const DATA_KEY = 's-erp:workspace:data';
const prefsKey = (userId: string, roomId: string) => `s-erp:workspace:${userId}:prefs:${roomId}`;

let memoryStore: WorkspaceStore | null = null;
// 저장소 쓰기가 실패하면 이후에는 localStorage의 옛 값 대신 메모리 상태를 기준으로 동작한다.
let persistFailed = false;
let idSeq = 0;

const nextId = (prefix: string) => {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
};

const isStore = (value: unknown): value is WorkspaceStore =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as WorkspaceStore).rooms) &&
  Array.isArray((value as WorkspaceStore).posts);

function readStore(): WorkspaceStore {
  if (persistFailed && memoryStore) return memoryStore;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DATA_KEY);
  } catch {
    return (memoryStore ??= createSampleStore());
  }
  if (raw === null) return (memoryStore ??= createSampleStore());
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isStore(parsed)) {
      memoryStore = parsed;
      return parsed;
    }
  } catch {
    // 깨진 값은 샘플로 되돌린다.
  }
  memoryStore = createSampleStore();
  return memoryStore;
}

function writeStore(store: WorkspaceStore): void {
  memoryStore = store;
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(store));
  } catch {
    // 저장이 막혀도 메모리 상태로 계속 동작한다.
    persistFailed = true;
  }
}

export function resetWorkspaceStore(): void {
  memoryStore = null;
  persistFailed = false;
  try {
    localStorage.removeItem(DATA_KEY);
  } catch {
    // 무시
  }
}

const requireRoom = (store: WorkspaceStore, roomId: string): WorkspaceRoom => {
  const room = store.rooms.find((item) => item.id === roomId);
  if (!room) throw new Error('방을 찾을 수 없습니다.');
  return room;
};

const requireLevel = (room: WorkspaceRoom, userId: string, need: WorkspaceLevel, message: string) => {
  if (!can(resolveLevel(room, userId), need)) throw new Error(message);
};

const NO_WRITE = '저장 권한이 없습니다.';

export async function listRooms(userId: string): Promise<WorkspaceRoom[]> {
  return readStore().rooms.filter((room) => resolveLevel(room, userId) !== null);
}

export async function saveRoom(room: WorkspaceRoom, actorId: string): Promise<WorkspaceRoom> {
  const store = readStore();
  const existing = store.rooms.find((item) => item.id === room.id);
  if (existing) requireLevel(existing, actorId, 'admin', '방 설정 권한이 없습니다.');
  if (!room.name.trim()) throw new Error('방 이름을 입력하세요.');
  if (room.columns.some((column) => column.color !== undefined && !isHexColor(column.color))) {
    throw new Error('컬럼 색상 형식이 올바르지 않습니다.');
  }
  if (!room.groups.some((group) => group.level === 'admin')) {
    throw new Error('방 설정 권한 그룹은 최소 1개 필요합니다.');
  }
  if (!room.groups.some((group) => group.level === 'admin' && group.members.length > 0)) {
    throw new Error('방 설정 권한 그룹에는 구성원이 1명 이상 필요합니다.');
  }
  // 저장 후 본인이 방을 관리할 수 없게 되는 설정(스스로 권한 제거, 남의 방 만들기)은 막는다.
  if (!can(resolveLevel(room, actorId), 'admin')) {
    throw new Error('본인의 방 설정 권한을 제거할 수 없습니다.');
  }
  if (existing) {
    const keptIds = new Set(room.columns.map((column) => column.id));
    const removedWithCards = existing.columns.some(
      (column) =>
        !keptIds.has(column.id) &&
        store.posts.some((post) => post.roomId === room.id && post.columnId === column.id),
    );
    if (removedWithCards) throw new Error('카드가 있는 컬럼은 삭제할 수 없습니다.');
  }
  const saved: WorkspaceRoom = {
    ...room,
    name: room.name.trim(),
    defaultView: room.columns.length === 0 ? 'feed' : room.defaultView,
  };
  const rooms = existing
    ? store.rooms.map((item) => (item.id === saved.id ? saved : item))
    : [...store.rooms, saved];
  // 컬럼이 없던 방에 처음 컬럼이 생기면, 컬럼 없이 쓴 글이 칸반에서 사라지지 않게 첫 컬럼으로 옮긴다.
  const gainedColumns = existing !== undefined && existing.columns.length === 0 && saved.columns.length > 0;
  const posts = gainedColumns
    ? store.posts.map((post) =>
        post.roomId === saved.id && post.columnId === null ? { ...post, columnId: saved.columns[0].id } : post,
      )
    : store.posts;
  writeStore({ rooms, posts });
  return saved;
}

export async function listPosts(roomId: string): Promise<WorkspacePost[]> {
  return readStore()
    .posts.filter((post) => post.roomId === roomId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function createPost(
  input: Omit<WorkspacePost, 'id' | 'createdAt' | 'comments'>,
  actorId: string,
): Promise<WorkspacePost> {
  const store = readStore();
  const room = requireRoom(store, input.roomId);
  requireLevel(room, actorId, 'write', NO_WRITE);
  if (!input.title.trim()) throw new Error('제목을 입력하세요.');
  const columnValid = room.columns.some((column) => column.id === input.columnId);
  const columnId = room.columns.length === 0 ? null : columnValid ? input.columnId : room.columns[0].id;
  const post: WorkspacePost = {
    ...input,
    title: input.title.trim(),
    columnId,
    id: nextId('post'),
    createdAt: new Date().toISOString(),
    comments: [],
  };
  writeStore({ ...store, posts: [...store.posts, post] });
  return post;
}

export type PostUpdateInput = Pick<WorkspacePost, 'title' | 'body' | 'columnId' | 'attachments'>;

/** 작성자 본인만 글을 수정할 수 있다. 댓글·작성자·작성일은 유지한다. */
export async function updatePost(postId: string, input: PostUpdateInput, actorId: string): Promise<WorkspacePost> {
  const store = readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) throw new Error('글을 찾을 수 없습니다.');
  if (post.authorId !== actorId) throw new Error('수정 권한이 없습니다.');
  const room = requireRoom(store, post.roomId);
  requireLevel(room, actorId, 'write', NO_WRITE);
  if (!input.title.trim()) throw new Error('제목을 입력하세요.');
  const columnValid = room.columns.some((column) => column.id === input.columnId);
  const columnId = room.columns.length === 0 ? null : columnValid ? input.columnId : (post.columnId ?? room.columns[0].id);
  const updated: WorkspacePost = {
    ...post,
    title: input.title.trim(),
    body: input.body,
    columnId,
    attachments: input.attachments,
  };
  savePost(store, updated);
  return updated;
}

export async function movePost(
  postId: string,
  columnId: string | null,
  actorId: string,
): Promise<WorkspacePost> {
  const store = readStore();
  const post = store.posts.find((item) => item.id === postId);
  if (!post) throw new Error('글을 찾을 수 없습니다.');
  const room = requireRoom(store, post.roomId);
  requireLevel(room, actorId, 'write', NO_WRITE);
  const valid = columnId === null ? room.columns.length === 0 : room.columns.some((c) => c.id === columnId);
  if (!valid) throw new Error('이동할 수 없는 컬럼입니다.');
  const moved = { ...post, columnId };
  writeStore({ ...store, posts: store.posts.map((item) => (item.id === postId ? moved : item)) });
  return moved;
}

const insertComment = (
  comments: WorkspaceComment[],
  parentId: string | null,
  comment: WorkspaceComment,
): WorkspaceComment[] => {
  if (parentId === null) return [...comments, comment];
  return comments.map((current) =>
    current.id === parentId
      ? { ...current, replies: [...current.replies, comment] }
      : { ...current, replies: insertComment(current.replies, parentId, comment) },
  );
};

const mapComment = (
  comments: WorkspaceComment[],
  commentId: string,
  update: (comment: WorkspaceComment) => WorkspaceComment,
): WorkspaceComment[] =>
  comments.map((current) =>
    current.id === commentId
      ? update(current)
      : { ...current, replies: mapComment(current.replies, commentId, update) },
  );

const findComment = (comments: WorkspaceComment[], commentId: string): WorkspaceComment | undefined => {
  for (const current of comments) {
    if (current.id === commentId) return current;
    const nested = findComment(current.replies, commentId);
    if (nested) return nested;
  }
  return undefined;
};

const requirePost = (store: WorkspaceStore, postId: string): WorkspacePost => {
  const post = store.posts.find((item) => item.id === postId);
  if (!post) throw new Error('글을 찾을 수 없습니다.');
  return post;
};

const savePost = (store: WorkspaceStore, post: WorkspacePost) =>
  writeStore({ ...store, posts: store.posts.map((item) => (item.id === post.id ? post : item)) });

export async function addComment(
  postId: string,
  parentCommentId: string | null,
  body: string,
  actorId: string,
  attachments: WorkspaceAttachment[] = [],
): Promise<WorkspaceComment> {
  const store = readStore();
  const post = requirePost(store, postId);
  requireLevel(requireRoom(store, post.roomId), actorId, 'write', NO_WRITE);
  if (!hasCommentContent(body, attachments.length)) throw new Error('댓글 내용을 입력하세요.');
  const comment: WorkspaceComment = {
    id: nextId('cm'),
    authorId: actorId,
    body: body.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
    ...(attachments.length > 0 ? { attachments } : {}),
  };
  savePost(store, { ...post, comments: insertComment(post.comments, parentCommentId, comment) });
  return comment;
}

export async function updateComment(
  postId: string,
  commentId: string,
  body: string,
  actorId: string,
  attachments?: WorkspaceAttachment[],
): Promise<WorkspaceComment> {
  const store = readStore();
  const post = requirePost(store, postId);
  const target = findComment(post.comments, commentId);
  if (!target || target.deleted) throw new Error('댓글을 찾을 수 없습니다.');
  if (target.authorId !== actorId) throw new Error('수정 권한이 없습니다.');
  requireLevel(requireRoom(store, post.roomId), actorId, 'write', NO_WRITE);
  const nextAttachments = attachments ?? target.attachments ?? [];
  if (!hasCommentContent(body, nextAttachments.length)) throw new Error('댓글 내용을 입력하세요.');
  let updated = target;
  const comments = mapComment(post.comments, commentId, (current) => {
    updated = { ...current, body: body.trim(), attachments: nextAttachments };
    return updated;
  });
  savePost(store, { ...post, comments });
  return updated;
}

export async function deleteComment(postId: string, commentId: string, actorId: string): Promise<void> {
  const store = readStore();
  const post = requirePost(store, postId);
  const target = findComment(post.comments, commentId);
  if (!target || target.deleted) throw new Error('댓글을 찾을 수 없습니다.');
  const room = requireRoom(store, post.roomId);
  if (target.authorId !== actorId && !can(resolveLevel(room, actorId), 'admin')) {
    throw new Error('삭제 권한이 없습니다.');
  }
  savePost(store, {
    ...post,
    comments: mapComment(post.comments, commentId, (current) => ({
      ...current,
      body: '',
      attachments: [],
      deleted: true,
    })),
  });
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export function loadPrefs(userId: string, room: WorkspaceRoom): WorkspaceViewPrefs {
  const base = defaultPrefs(room.columns);
  try {
    const raw = localStorage.getItem(prefsKey(userId, room.id));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<WorkspaceViewPrefs>;
    const prefs: WorkspaceViewPrefs = {
      hiddenColumnIds: isStringArray(parsed.hiddenColumnIds) ? parsed.hiddenColumnIds : [],
      collapsedColumnIds: isStringArray(parsed.collapsedColumnIds) ? parsed.collapsedColumnIds : [],
      columnOrder: isStringArray(parsed.columnOrder) ? parsed.columnOrder : base.columnOrder,
      columnColors:
        parsed.columnColors && typeof parsed.columnColors === 'object'
          ? Object.fromEntries(Object.entries(parsed.columnColors).filter(([, color]) => isHexColor(color)))
          : {},
      onlyMine: parsed.onlyMine === true,
      keyword: typeof parsed.keyword === 'string' ? parsed.keyword : '',
    };
    return reconcilePrefs(prefs, room.columns);
  } catch {
    return base;
  }
}

export function savePrefs(userId: string, roomId: string, prefs: WorkspaceViewPrefs): void {
  try {
    localStorage.setItem(prefsKey(userId, roomId), JSON.stringify(prefs));
  } catch {
    // 저장이 막혀도 화면은 계속 동작한다.
  }
}
