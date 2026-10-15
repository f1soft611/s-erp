import { useState } from 'react';
import {
  createArchivePost,
  deleteArchiveAttachment,
  deleteArchivePost,
  uploadArchiveAttachment,
  updateArchivePost,
} from '../services/archiveBoardService';
import type {
  ArchiveAttachment,
  ArchiveId,
  ArchivePost,
  ArchivePostSavePayload,
} from '../types/archive.types';

export type ArchiveSaveResult = {
  success: boolean;
  postId?: ArchiveId;
  failedUploads: File[];
  failedRemovals: ArchiveAttachment[];
  error?: string;
};

type UseArchiveMutationsOptions = {
  reloadList: () => Promise<void>;
  reloadDetail: (postId: ArchiveId) => Promise<void>;
  onPostDeleted: () => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useArchiveMutations({
  reloadList,
  reloadDetail,
  onPostDeleted,
  showError,
  showSuccess,
}: UseArchiveMutationsOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const savePost = async (
    postId: ArchiveId | null,
    payload: ArchivePostSavePayload,
    files: File[],
    removedAttachments: ArchiveAttachment[],
  ): Promise<ArchiveSaveResult> => {
    setIsSaving(true);
    let savedPost: ArchivePost;
    try {
      savedPost = postId
        ? await updateArchivePost(postId, payload)
        : await createArchivePost(payload);
    } catch (error) {
      const message = `자료 저장에 실패했습니다: ${messageOf(error)}`;
      showError(message);
      setIsSaving(false);
      return {
        success: false,
        postId: postId ?? undefined,
        failedUploads: files,
        failedRemovals: removedAttachments,
        error: message,
      };
    }

    const failedUploads: File[] = [];
    const failedRemovals: ArchiveAttachment[] = [];
    const failureDescriptions: string[] = [];
    for (const file of files) {
      try {
        await uploadArchiveAttachment(savedPost.postId, file);
      } catch (error) {
        failedUploads.push(file);
        failureDescriptions.push(
          `${file.name} 업로드 실패: ${messageOf(error)}`,
        );
      }
    }
    for (const attachment of removedAttachments) {
      try {
        await deleteArchiveAttachment(
          attachment.boardFileId,
          savedPost.postId,
        );
      } catch (error) {
        failedRemovals.push(attachment);
        failureDescriptions.push(
          `${attachment.fileName} 제거 실패: ${messageOf(error)}`,
        );
      }
    }

    await reloadList();
    if (postId) await reloadDetail(savedPost.postId);

    if (failedUploads.length || failedRemovals.length) {
      const message = `게시글은 저장됐지만 일부 파일 작업에 실패했습니다: ${failureDescriptions.join('; ')}`;
      showError(message);
      setIsSaving(false);
      return {
        success: false,
        postId: savedPost.postId,
        failedUploads,
        failedRemovals,
        error: message,
      };
    }

    showSuccess(postId ? '자료를 수정했습니다.' : '자료를 등록했습니다.');
    setIsSaving(false);
    return {
      success: true,
      postId: savedPost.postId,
      failedUploads,
      failedRemovals,
    };
  };

  const deletePost = async (postId: ArchiveId) => {
    setIsDeleting(true);
    try {
      await deleteArchivePost(postId);
      onPostDeleted();
      await reloadList();
      showSuccess('자료를 삭제했습니다.');
      return true;
    } catch (error) {
      showError(`자료 삭제에 실패했습니다: ${messageOf(error)}`);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { savePost, deletePost, isSaving, isDeleting };
}
