import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import dayjs from 'dayjs';
import { useTheme } from '@mui/material/styles';
import {
  fetchDraftFormOptions,
  fetchDraftForms,
} from '../../../../co/workflow/form/services/draftFormManagement.service';
import { fetchDraftFormTemplate } from '../../../../co/workflow/form/services/draftFormTemplate.service';
import { fetchMyProfile } from '../../../../dashboard/services/profileSettings.service';
import type {
  DraftFormRow,
  DraftFormUserOption,
} from '../../../../co/workflow/form/types/draftFormManagement.types';
import type { F1GridUserOption } from '../../../../../shared/components/f1-grid/types/grid.types';
import type {
  DocumentApprovalDraftRequest,
  DocumentApprovalStage,
  DocumentDraftAttachment,
  DocumentDraftAttachmentStatus,
  DocumentKind,
} from '../types/documentWrite.types';
import {
  deleteDocumentDraftAttachment,
  isDefiniteAttachmentUploadFailure,
  listDocumentDraftAttachments,
  saveDocumentDraft,
  UnknownAttachmentUploadOutcomeError,
  uploadDocumentDraftAttachment,
} from '../services/documentApproval.service';
import type { F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';

export const ALL_CATEGORY_VALUE = '__all__';

function getDocumentType(kind: DocumentKind) {
  const documentTypes: Record<DocumentKind, DocumentApprovalDraftRequest['documentType']> = {
    기안서: 'DRAFTING',
    업무연락: 'BUSINESS_CONTACT',
    지출결의서: 'EXPENSE_RESOLUTION',
    근태신청: 'ATTENDANCE_APPLICATION',
  };
  return documentTypes[kind];
}

function toUserOption(user: DraftFormUserOption): F1GridUserOption {
  return {
    value: user.userId.trim(),
    label: user.userNm,
    avatarUrl: user.profileImage,
    positionName: user.levelNm,
    departmentName: user.departmentNm,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '기안서 작성 정보를 불러오지 못했습니다.';
}

function getTemplateErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '기안양식 본문을 불러오지 못했습니다.';
}

function toUserIds(value: F1GridUserValue): string[] {
  if (Array.isArray(value)) return [...new Set(value.map(String))];
  return value == null ? [] : [String(value)];
}

export function useDocumentComposer(open: boolean, onClose: () => void) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const editorSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const fieldSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const [activeDocumentKind, setActiveDocumentKind] =
    useState<DocumentKind>('기안서');
  const [composerTitle, setComposerTitle] = useState('');
  const [attachments, setAttachments] = useState<DocumentDraftAttachment[]>([]);
  const [electronicApprovalId, setElectronicApprovalId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [drafterName, setDrafterName] = useState('');
  const [categoryItems, setCategoryItems] = useState<
    Awaited<ReturnType<typeof fetchDraftFormOptions>>['categoryItems']
  >([]);
  const [draftForms, setDraftForms] = useState<DraftFormRow[]>([]);
  const [userOptions, setUserOptions] = useState<F1GridUserOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(ALL_CATEGORY_VALUE);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateReplaceConfirmOpen, setTemplateReplaceConfirmOpen] =
    useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    categoryId: string;
    formId: string;
  } | null>(null);
  const [approvalStages, setApprovalStages] = useState<
    DocumentApprovalStage[]
  >([]);
  const [selectedApprovalUserIds, setSelectedApprovalUserIds] = useState<
    string[]
  >([]);
  const [referenceUserIds, setReferenceUserIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [initialLookupsComplete, setInitialLookupsComplete] = useState(false);
  const draftDate = open ? dayjs().format('YYYY-MM-DD') : '';
  const isLoading = open && !initialLookupsComplete;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const nextStageId = useRef(1);
  const editorBaseline = useRef<string | null>(null);
  const templateRequestId = useRef(0);
  const nextAttachmentId = useRef(1);
  const draftIdRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    let active = true;
    void Promise.all([
      fetchDraftFormOptions(),
      fetchDraftForms(),
      fetchMyProfile(),
    ])
      .then(([options, forms, profile]) => {
        if (!active) return;

        setCategoryItems(options.categoryItems);
        const availableUsers = options.users.map(toUserOption);
        setUserOptions(availableUsers);
        setDraftForms(forms);
        if (!profile.name?.trim()) {
          setLoadError('로그인 사용자의 이름을 확인할 수 없습니다.');
          return;
        }
        setDrafterName(profile.name.trim());
        const signedInEmployeeId = String(profile.employeeId ?? '').trim();
        if (!signedInEmployeeId) {
          setLoadError('로그인 사용자의 사원 ID를 확인할 수 없습니다.');
          return;
        }
        const signedInUser =
          availableUsers.find(
            (user) => String(user.value).trim() === signedInEmployeeId,
          ) ?? {
            value: signedInEmployeeId,
            label: profile.name.trim(),
            avatarUrl: profile.profileImage,
            positionName: profile.levelName,
            departmentName: profile.departmentName,
          };
        setApprovalStages([
          {
            id: nextStageId.current++,
            kind: 'approval',
            users: [signedInUser],
            isFixed: true,
          },
        ]);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setInitialLookupsComplete(true);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const availableForms = useMemo(
    () =>
      draftForms.filter(
        (form) =>
          form.useAt === 'Y' &&
          form.hasDocument &&
          (selectedCategoryId === ALL_CATEGORY_VALUE ||
            String(form.categoryItemId) === selectedCategoryId),
      ),
    [draftForms, selectedCategoryId],
  );

  const handleEditorReady = useCallback((nextEditor: Editor | null) => {
    setEditor(nextEditor);
    if (nextEditor) {
      editorBaseline.current = JSON.stringify(nextEditor.getJSON());
    }
  }, []);

  const applyDraftSelection = useCallback(
    async (selection: { categoryId: string; formId: string }) => {
      const requestId = ++templateRequestId.current;
      setTemplateError('');
      setTemplateLoading(Boolean(selection.formId));

      try {
        if (!editor) {
          throw new Error('본문 편집기가 준비되지 않았습니다.');
        }
        let content: JSONContent | string = '<p></p>';
        if (selection.formId) {
          const template = await fetchDraftFormTemplate(
            Number(selection.formId),
          );
          if (requestId !== templateRequestId.current) return;
          content =
            (template.templateJson as JSONContent | null) ??
            template.templateHtml ??
            '<p></p>';
        }
        if (requestId !== templateRequestId.current) return;
        editor.commands.setContent(content, { emitUpdate: false });
        editorBaseline.current = JSON.stringify(editor.getJSON());
        setSelectedCategoryId(selection.categoryId);
        setSelectedFormId(selection.formId);
      } catch (error: unknown) {
        if (requestId === templateRequestId.current) {
          setTemplateError(getTemplateErrorMessage(error));
        }
      } finally {
        if (requestId === templateRequestId.current) {
          setTemplateLoading(false);
        }
      }
    },
    [editor],
  );

  const requestDraftSelection = useCallback(
    (selection: { categoryId: string; formId: string }) => {
      if (
        selection.categoryId === selectedCategoryId &&
        selection.formId === selectedFormId
      ) {
        return;
      }
      const bodyHasChanges =
        editor !== null &&
        editorBaseline.current !== null &&
        JSON.stringify(editor.getJSON()) !== editorBaseline.current;
      if (bodyHasChanges) {
        setPendingSelection(selection);
        setTemplateReplaceConfirmOpen(true);
        return;
      }
      void applyDraftSelection(selection);
    },
    [applyDraftSelection, editor, selectedCategoryId, selectedFormId],
  );

  const handleCategoryChange = (categoryId: string) => {
    requestDraftSelection({ categoryId, formId: '' });
  };

  const handleFormChange = (formId: string) => {
    requestDraftSelection({ categoryId: selectedCategoryId, formId });
  };

  const cancelTemplateReplacement = () => {
    setPendingSelection(null);
    setTemplateReplaceConfirmOpen(false);
  };

  const confirmTemplateReplacement = () => {
    const selection = pendingSelection;
    setPendingSelection(null);
    setTemplateReplaceConfirmOpen(false);
    if (selection) void applyDraftSelection(selection);
  };

  const selectedApprovalUsers = useMemo(
    () =>
      selectedApprovalUserIds
        .map((id) =>
          userOptions.find((user) => String(user.value) === id),
        )
        .filter((user): user is F1GridUserOption => Boolean(user)),
    [selectedApprovalUserIds, userOptions],
  );

  const addApproval = useCallback(() => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;
    const nextStages: DocumentApprovalStage[] = eligibleUsers.map((user) => ({
        id: nextStageId.current++,
        kind: 'approval',
        users: [user],
      }));
    setApprovalStages((current) => [...current, ...nextStages]);
    setSelectedApprovalUserIds([]);
  }, [approvalStages, referenceUserIds, selectedApprovalUsers]);

  const addAgreement = useCallback(() => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    const eligibleUsers = selectedApprovalUsers.filter(
      (user) =>
        !assignedUserIds.has(String(user.value)) &&
        !referenceIds.has(String(user.value)),
    );
    if (eligibleUsers.length === 0) return;
    setApprovalStages((current) => [
      ...current,
      {
        id: nextStageId.current++,
        kind: 'agreement',
        users: eligibleUsers,
      },
    ]);
    setSelectedApprovalUserIds([]);
  }, [approvalStages, referenceUserIds, selectedApprovalUsers]);

  const removeApprovalUser = useCallback((stageId: number, userId: string) => {
    setApprovalStages((current) =>
      current.flatMap((stage) => {
        if (stage.id !== stageId) return [stage];
        if (stage.isFixed) return [stage];
        const users = stage.users.filter(
          (user) => String(user.value) !== userId,
        );
        return users.length > 0 ? [{ ...stage, users }] : [];
      }),
    );
  }, []);

  const replaceApprovalLine = useCallback(
    (stages: DocumentApprovalStage[], references: string[]) => {
      const assignedUserIds = new Set(
        stages.flatMap((stage) =>
          stage.users.map((user) => String(user.value)),
        ),
      );
      const referenceIds = new Set(references);
      const nextStageIdValue = stages.reduce(
        (nextId, stage) => Math.max(nextId, stage.id + 1),
        1,
      );
      nextStageId.current = Math.max(nextStageId.current, nextStageIdValue);
      setApprovalStages(stages);
      setReferenceUserIds(references);
      setSelectedApprovalUserIds((current) =>
        current.filter(
          (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
        ),
      );
    },
    [],
  );

  const handleApprovalUserChange = (value: F1GridUserValue) => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const referenceIds = new Set(referenceUserIds);
    setSelectedApprovalUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !referenceIds.has(id),
      ),
    );
  };

  const handleReferenceUserChange = (value: F1GridUserValue) => {
    const assignedUserIds = new Set(
      approvalStages.flatMap((stage) =>
        stage.users.map((user) => String(user.value)),
      ),
    );
    const selectedApprovalIds = new Set(selectedApprovalUserIds);
    setReferenceUserIds(
      toUserIds(value).filter(
        (id) => !assignedUserIds.has(id) && !selectedApprovalIds.has(id),
      ),
    );
  };

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length > 0) {
      setAttachments((current) => [
        ...current,
        ...nextFiles.map((file) => ({
          clientId: `attachment-${nextAttachmentId.current++}`,
          file,
          status: 'pending' as const,
        })),
      ]);
      setSaveNotice('');
    }
    event.target.value = '';
  };

  const uploadAttachment = useCallback(
    async (
      attachment: DocumentDraftAttachment,
      approvalId: number,
    ): Promise<DocumentDraftAttachmentStatus> => {
      try {
        const uploaded = await uploadDocumentDraftAttachment(
          approvalId,
          attachment.file,
        );
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === attachment.clientId
              ? { ...item, status: 'uploaded', fileId: uploaded.fileId, error: undefined }
              : item,
          ),
        );
        return 'uploaded';
      } catch (error: unknown) {
        const status = isDefiniteAttachmentUploadFailure(error) ? 'failed' : 'unknown';
        const message =
          error instanceof UnknownAttachmentUploadOutcomeError
            ? error.message
            : error instanceof Error
              ? error.message
              : '첨부파일 업로드 결과를 확인할 수 없습니다.';
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === attachment.clientId
              ? { ...item, status, error: message }
              : item,
          ),
        );
        return status;
      }
    },
    [],
  );

  const saveDraft = useCallback(async () => {
    if (
      savingRef.current ||
      !editor ||
      !composerTitle.trim() ||
      approvalStages.length === 0
    ) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    setSaveNotice('');
    try {
      const approvalLines: DocumentApprovalDraftRequest['approvalLines'] =
        approvalStages.flatMap((stage, stageIndex) =>
          stage.users.map((user, participantIndex) => ({
            stageOrder: stageIndex + 1,
            participantOrder: participantIndex + 1,
            participantType:
              stage.kind === 'approval' ? ('APPROVAL' as const) : ('AGREEMENT' as const),
            participantUserId: String(user.value),
          })),
        );
      if (referenceUserIds.length > 0) {
        approvalLines.push(
          ...referenceUserIds.map((participantUserId, participantIndex) => ({
            stageOrder: approvalStages.length + 1,
            participantOrder: participantIndex + 1,
            participantType: 'REFERENCE' as const,
            participantUserId,
          })),
        );
      }

      const request: DocumentApprovalDraftRequest = {
        documentType: getDocumentType(activeDocumentKind),
        draftingWorkCategoryId: selectedFormId ? Number(selectedFormId) : null,
        title: composerTitle.trim(),
        contentsJson: editor.getJSON(),
        contentsHtml: editor.getHTML(),
        contentsText: editor.getText({ blockSeparator: '\n' }),
        approvalLines,
      };
      const saved = await saveDocumentDraft(request, draftIdRef.current);
      draftIdRef.current = saved.electronicApprovalId;
      setElectronicApprovalId(saved.electronicApprovalId);

      let failedCount = attachments.filter(
        (attachment) => attachment.status === 'failed' || attachment.status === 'unknown',
      ).length;
      for (const attachment of attachments.filter((item) => item.status === 'pending')) {
        const status = await uploadAttachment(attachment, saved.electronicApprovalId);
        if (status !== 'uploaded') failedCount += 1;
      }
      setSaveNotice(
        failedCount > 0
          ? `문서는 저장되었지만 첨부파일 ${failedCount}건의 상태 확인이 필요합니다.`
          : '문서가 임시저장되었습니다.',
      );
    } catch (error: unknown) {
      setSaveError(
        error instanceof Error ? error.message : '문서 저장에 실패했습니다.',
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    activeDocumentKind,
    approvalStages,
    attachments,
    composerTitle,
    editor,
    referenceUserIds,
    selectedFormId,
    uploadAttachment,
  ]);

  const retryFailedAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      const approvalId = draftIdRef.current;
      if (
        savingRef.current ||
        !attachment ||
        attachment.status !== 'failed' ||
        approvalId === null
      ) {
        return;
      }
      savingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      setSaveNotice('');
      try {
        await uploadAttachment(attachment, approvalId);
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments, uploadAttachment],
  );

  const reconcileUnknownAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      const approvalId = draftIdRef.current;
      if (
        savingRef.current ||
        !attachment ||
        attachment.status !== 'unknown' ||
        approvalId === null
      ) {
        return;
      }
      savingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      try {
        const files = await listDocumentDraftAttachments(approvalId);
        const uploadedIds = new Set(
          attachments
            .filter((item) => item.status === 'uploaded' && item.fileId !== undefined)
            .map((item) => item.fileId),
        );
        const matches = files.filter(
          (file) =>
            file.fileName === attachment.file.name &&
            file.fileSize === attachment.file.size &&
            !uploadedIds.has(file.fileId),
        );
        if (matches.length === 1) {
          setAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? { ...item, status: 'uploaded', fileId: matches[0].fileId, error: undefined }
                : item,
            ),
          );
          setSaveNotice('첨부파일 업로드가 확인되었습니다.');
        } else {
          setAttachments((current) =>
            current.map((item) =>
              item.clientId === clientId
                ? { ...item, error: '파일 목록에서 업로드 여부를 확인하지 못했습니다.' }
                : item,
            ),
          );
        }
      } catch (error: unknown) {
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === clientId
              ? {
                  ...item,
                  error: error instanceof Error ? error.message : '첨부 상태 조회에 실패했습니다.',
                }
              : item,
          ),
        );
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments],
  );

  const removeAttachment = useCallback(
    async (clientId: string) => {
      const attachment = attachments.find((item) => item.clientId === clientId);
      if (!attachment || savingRef.current || attachment.status === 'unknown') return;
      if (attachment.status !== 'uploaded') {
        setAttachments((current) => current.filter((item) => item.clientId !== clientId));
        return;
      }
      const approvalId = draftIdRef.current;
      if (approvalId === null || attachment.fileId === undefined) return;
      savingRef.current = true;
      setIsSaving(true);
      setSaveError('');
      try {
        await deleteDocumentDraftAttachment(approvalId, attachment.fileId);
        setAttachments((current) => current.filter((item) => item.clientId !== clientId));
      } catch (error: unknown) {
        setAttachments((current) =>
          current.map((item) =>
            item.clientId === clientId
              ? { ...item, error: error instanceof Error ? error.message : '첨부파일 삭제에 실패했습니다.' }
              : item,
          ),
        );
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [attachments],
  );

  const closeComposer = useCallback(() => {
    if (savingRef.current) return;
    draftIdRef.current = null;
    setElectronicApprovalId(null);
    setIsSaving(false);
    setSaveError('');
    setSaveNotice('');
    setComposerTitle('');
    setAttachments([]);
    nextAttachmentId.current = 1;
    setDrafterName('');
    setCategoryItems([]);
    setDraftForms([]);
    setUserOptions([]);
    setSelectedCategoryId(ALL_CATEGORY_VALUE);
    setSelectedFormId('');
    setTemplateError('');
    setTemplateLoading(false);
    setTemplateReplaceConfirmOpen(false);
    setPendingSelection(null);
    setApprovalStages([]);
    setSelectedApprovalUserIds([]);
    setReferenceUserIds([]);
    nextStageId.current = 1;
    setLoadError('');
    setInitialLookupsComplete(false);
    templateRequestId.current += 1;
    if (editor) {
      editor.commands.setContent('<p></p>', { emitUpdate: false });
      editorBaseline.current = JSON.stringify(editor.getJSON());
    } else {
      editorBaseline.current = null;
    }
    onClose();
  }, [editor, onClose]);

  return {
    activeDocumentKind,
    setActiveDocumentKind,
    composerTitle,
    setComposerTitle,
    draftDate,
    drafterName,
    categoryItems,
    availableForms,
    userOptions,
    selectedCategoryId,
    selectedFormId,
    handleFormChange,
    handleCategoryChange,
    templateError,
    templateLoading,
    templateReplaceConfirmOpen,
    cancelTemplateReplacement,
    confirmTemplateReplacement,
    approvalStages,
    selectedApprovalUserIds,
    referenceUserIds,
    addApproval,
    addAgreement,
    removeApprovalUser,
    replaceApprovalLine,
    handleApprovalUserChange,
    handleReferenceUserChange,
    loadError,
    isLoading,
    attachments,
    electronicApprovalId,
    isSaving,
    saveError,
    saveNotice,
    saveDraft,
    retryFailedAttachment,
    reconcileUnknownAttachment,
    removeAttachment,
    canSaveDraft:
      !isLoading &&
      !templateLoading &&
      !isSaving &&
      Boolean(composerTitle.trim()) &&
      Boolean(editor) &&
      approvalStages.length > 0,
    attachmentInputRef,
    editor,
    handleEditorReady,
    handleAttachmentSelect,
    closeComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  };
}
