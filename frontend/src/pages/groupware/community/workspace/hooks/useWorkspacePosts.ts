import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addComment as addCommentRequest,
  createPost as createPostRequest,
  deleteComment as deleteCommentRequest,
  listPosts,
  movePost as movePostRequest,
  updateComment as updateCommentRequest,
} from '../services/workspace.service';
import type { WorkspaceAttachment, WorkspacePost } from '../types/workspace.types';

export type NewPostInput = {
  title: string;
  body: string;
  columnId: string | null;
  attachments: WorkspaceAttachment[];
};

export function useWorkspacePosts(roomId: string | null, userId: string) {
  const [posts, setPosts] = useState<WorkspacePost[]>([]);
  const [loading, setLoading] = useState(roomId !== null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const request = (requestRef.current += 1);
    if (roomId === null) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      const next = await listPosts(roomId);
      if (request !== requestRef.current) return;
      setPosts(next);
      setError(null);
    } catch (reason) {
      if (request !== requestRef.current) return;
      setError(reason instanceof Error ? reason.message : '글 목록을 불러오지 못했습니다.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [roomId]);

  // 변경 요청이 끝나는 시점에는 사용자가 이미 다른 방으로 옮겼을 수 있으므로, 항상 최신 방 기준으로 다시 불러온다.
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    setLoading(roomId !== null);
    void reload();
  }, [reload, roomId]);

  // 변경 함수는 실패를 호출한 쪽(알림/다이얼로그)이 보여주도록 그대로 던진다.
  const createPost = useCallback(
    async (input: NewPostInput) => {
      if (roomId === null) throw new Error('방을 선택하세요.');
      const created = await createPostRequest({ ...input, roomId, authorId: userId }, userId);
      await reloadRef.current();
      return created;
    },
    [roomId, userId],
  );

  const movePost = useCallback(
    async (postId: string, columnId: string | null) => {
      await movePostRequest(postId, columnId, userId);
      await reloadRef.current();
    },
    [userId],
  );

  const addComment = useCallback(
    async (postId: string, parentCommentId: string | null, body: string, attachments: WorkspaceAttachment[] = []) => {
      await addCommentRequest(postId, parentCommentId, body, userId, attachments);
      await reloadRef.current();
    },
    [userId],
  );

  const updateComment = useCallback(
    async (postId: string, commentId: string, body: string, attachments?: WorkspaceAttachment[]) => {
      await updateCommentRequest(postId, commentId, body, userId, attachments);
      await reloadRef.current();
    },
    [userId],
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      await deleteCommentRequest(postId, commentId, userId);
      await reloadRef.current();
    },
    [userId],
  );

  return { posts, loading, error, reload, createPost, movePost, addComment, updateComment, deleteComment };
}
