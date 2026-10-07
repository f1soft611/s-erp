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
  DocumentApprovalStage,
  DocumentKind,
} from '../types/documentWrite.types';
import type { F1GridUserValue } from '../../../../../shared/components/f1-grid/editing/UserSelectEditor';

export const ALL_CATEGORY_VALUE = '__all__';

function toUserOption(user: DraftFormUserOption): F1GridUserOption {
  return {
    value: user.userId,
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
  if (Array.isArray(value)) return value.map(String);
  return value == null ? [] : [String(value)];
}

export function useDocumentComposer(open: boolean, onClose: () => void) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const editorSurfaceBackground = isDark ? '#0f172a' : '#ffffff';
  const fieldSurfaceBackground = isDark ? '#1e293b' : '#ffffff';
  const [activeDocumentKind, setActiveDocumentKind] =
    useState<DocumentKind>('기안서');
  const [composerTitle, setComposerTitle] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
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
        setUserOptions(options.users.map(toUserOption));
        setDraftForms(forms);
        if (!profile.name?.trim()) {
          setLoadError('로그인 사용자의 이름을 확인할 수 없습니다.');
          return;
        }
        setDrafterName(profile.name.trim());
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
    if (selectedApprovalUsers.length === 0) return;
    const nextStages: DocumentApprovalStage[] = selectedApprovalUsers.map(
      (user) => ({
        id: nextStageId.current++,
        kind: 'approval',
        users: [user],
      }),
    );
    setApprovalStages((current) => [...current, ...nextStages]);
    setSelectedApprovalUserIds([]);
  }, [selectedApprovalUsers]);

  const addAgreement = useCallback(() => {
    if (selectedApprovalUsers.length === 0) return;
    setApprovalStages((current) => [
      ...current,
      {
        id: nextStageId.current++,
        kind: 'agreement',
        users: selectedApprovalUsers,
      },
    ]);
    setSelectedApprovalUserIds([]);
  }, [selectedApprovalUsers]);

  const removeApprovalUser = useCallback((stageId: number, userId: string) => {
    setApprovalStages((current) =>
      current.flatMap((stage) => {
        if (stage.id !== stageId) return [stage];
        const users = stage.users.filter(
          (user) => String(user.value) !== userId,
        );
        return users.length > 0 ? [{ ...stage, users }] : [];
      }),
    );
  }, []);

  const handleApprovalUserChange = (value: F1GridUserValue) => {
    setSelectedApprovalUserIds(toUserIds(value));
  };

  const handleReferenceUserChange = (value: F1GridUserValue) => {
    setReferenceUserIds(toUserIds(value));
  };

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length > 0) {
      setAttachments((current) => [...current, ...nextFiles]);
    }
    event.target.value = '';
  };

  const closeComposer = useCallback(() => {
    setComposerTitle('');
    setAttachments([]);
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
    handleApprovalUserChange,
    handleReferenceUserChange,
    loadError,
    isLoading,
    attachments,
    setAttachments,
    attachmentInputRef,
    editor,
    handleEditorReady,
    handleAttachmentSelect,
    closeComposer,
    editorSurfaceBackground,
    fieldSurfaceBackground,
  };
}
