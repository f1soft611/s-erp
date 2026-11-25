// document-write-page 분할 테스트 공용 모듈: mock 등록, 픽스처, 헬퍼, 전역 훅.
// 각 part 테스트 파일은 이 모듈을 가장 먼저 import해야 vi.mock이 대상 모듈보다 먼저 등록된다.
import { fireEvent, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, expect, vi } from 'vitest';

const composerApi = vi.hoisted(() => ({
  fetchDraftFormOptions: vi.fn(),
  fetchDraftForms: vi.fn(),
  fetchDraftFormTemplate: vi.fn(),
  fetchDraftFormUsers: vi.fn(),
  fetchMyProfile: vi.fn(),
  saveDocumentDraft: vi.fn(),
  submitDocumentApproval: vi.fn(),
  cancelDocumentSubmission: vi.fn(),
  cancelDocumentApproval: vi.fn(),
  listDocumentApprovals: vi.fn(),
  listPinnedDocumentApprovals: vi.fn(),
  pinDocumentApproval: vi.fn(),
  unpinDocumentApproval: vi.fn(),
  getDocumentApprovalSummary: vi.fn(),
  confirmDocumentReference: vi.fn(),
  confirmDocumentFinalConfirmation: vi.fn(),
  addDocumentReferences: vi.fn(),
  getDocumentApprovalDetail: vi.fn(),
  listApprovalComments: vi.fn(),
  fetchApprovalEmbeddedImageBlob: vi.fn(),
  fetchApprovalCommentAttachmentBlob: vi.fn(),
  createApprovalComment: vi.fn(),
  updateApprovalComment: vi.fn(),
  deleteApprovalComment: vi.fn(),
  uploadApprovalCommentAttachment: vi.fn(),
  downloadApprovalCommentAttachment: vi.fn(),
  deleteApprovalCommentAttachment: vi.fn(),
  downloadDocumentApprovalAttachment: vi.fn(),
  processDocumentApprovalAction: vi.fn(),
  uploadDocumentDraftAttachment: vi.fn(),
  uploadDocumentDraftEmbeddedImage: vi.fn(),
  deleteDocumentDraftEmbeddedImage: vi.fn(),
  listDocumentDraftAttachments: vi.fn(),
  deleteDocumentDraftAttachment: vi.fn(),
  deleteDocumentApproval: vi.fn(),
}));

const composerNotifications = vi.hoisted(() => ({
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
  showError: vi.fn(),
}));

const approvalLineTemplateApi = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  rename: vi.fn(),
  delete: vi.fn(),
}));

let restoreImagePreloader: (() => void) | undefined;

export async function clickDocumentMenuItem(scope: HTMLElement, label: string) {
  await waitFor(() => expect(composerApi.fetchMyProfile).toHaveBeenCalled());
  fireEvent.click(await within(scope).findByRole('button', { name: '문서 더보기' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: label, exact: true }));
}

afterEach(() => {
  restoreImagePreloader?.();
  restoreImagePreloader = undefined;
});

vi.mock('../../src/shared/context/notification', () => ({
  useNotification: () => composerNotifications,
}));

vi.mock(
  '../../src/pages/groupware/documents/write/services/approvalLineTemplate.service',
  () => ({
    listApprovalLineTemplates: approvalLineTemplateApi.list,
    getApprovalLineTemplate: approvalLineTemplateApi.get,
    createApprovalLineTemplate: approvalLineTemplateApi.create,
    renameApprovalLineTemplate: approvalLineTemplateApi.rename,
    deleteApprovalLineTemplate: approvalLineTemplateApi.delete,
  }),
);

vi.mock(
  '../../src/pages/co/workflow/form/services/draftFormManagement.service',
  () => ({
    fetchDraftFormOptions: composerApi.fetchDraftFormOptions,
    fetchDraftForms: composerApi.fetchDraftForms,
    fetchDraftFormUsers: composerApi.fetchDraftFormUsers,
  }),
);

vi.mock(
  '../../src/pages/co/workflow/form/services/draftFormTemplate.service',
  () => ({
    fetchDraftFormTemplate: composerApi.fetchDraftFormTemplate,
  }),
);

vi.mock('../../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: composerApi.fetchMyProfile,
}));

vi.mock(
  '../../src/pages/groupware/documents/write/services/documentApproval.service',
  () => ({
    saveDocumentDraft: composerApi.saveDocumentDraft,
    submitDocumentApproval: composerApi.submitDocumentApproval,
    cancelDocumentSubmission: composerApi.cancelDocumentSubmission,
    cancelDocumentApproval: composerApi.cancelDocumentApproval,
    listDocumentApprovals: composerApi.listDocumentApprovals,
    listPinnedDocumentApprovals: composerApi.listPinnedDocumentApprovals,
    pinDocumentApproval: composerApi.pinDocumentApproval,
    unpinDocumentApproval: composerApi.unpinDocumentApproval,
    getDocumentApprovalSummary: composerApi.getDocumentApprovalSummary,
    confirmDocumentReference: composerApi.confirmDocumentReference,
    confirmDocumentFinalConfirmation: composerApi.confirmDocumentFinalConfirmation,
    addDocumentReferences: composerApi.addDocumentReferences,
    getDocumentApprovalDetail: composerApi.getDocumentApprovalDetail,
    getExternalLinkPreview: vi.fn(),
    listApprovalComments: composerApi.listApprovalComments,
    fetchApprovalEmbeddedImageBlob: composerApi.fetchApprovalEmbeddedImageBlob,
    fetchApprovalCommentAttachmentBlob:
      composerApi.fetchApprovalCommentAttachmentBlob,
    createApprovalComment: composerApi.createApprovalComment,
    listApprovalCommentMentionUserIds: vi.fn(async () => []),
    updateApprovalComment: composerApi.updateApprovalComment,
    deleteApprovalComment: composerApi.deleteApprovalComment,
    uploadApprovalCommentAttachment: composerApi.uploadApprovalCommentAttachment,
    downloadApprovalCommentAttachment: composerApi.downloadApprovalCommentAttachment,
    deleteApprovalCommentAttachment: composerApi.deleteApprovalCommentAttachment,
    downloadDocumentApprovalAttachment: composerApi.downloadDocumentApprovalAttachment,
    processDocumentApprovalAction: composerApi.processDocumentApprovalAction,
    uploadDocumentDraftAttachment: composerApi.uploadDocumentDraftAttachment,
    uploadDocumentDraftEmbeddedImage: composerApi.uploadDocumentDraftEmbeddedImage,
    deleteDocumentDraftEmbeddedImage: composerApi.deleteDocumentDraftEmbeddedImage,
    listDocumentDraftAttachments: composerApi.listDocumentDraftAttachments,
    deleteDocumentDraftAttachment: composerApi.deleteDocumentDraftAttachment,
    deleteDocumentApproval: composerApi.deleteDocumentApproval,
    isDefiniteAttachmentUploadFailure: (error: unknown) =>
      error instanceof Error && error.message === 'definite failure',
    UnknownAttachmentUploadOutcomeError: class extends Error {},
  }),
);

import type {
  DocumentApprovalFeedRecord,
  DocumentApprovalRecord,
} from '../../src/pages/groupware/documents/write/types/documentWrite.types';

export const muiTheme = createTheme();

export const defaultDocumentRecords: DocumentApprovalRecord[] = [
  {
    electronicApprovalId: 1,
    documentNo: 'EA-20261012-0001',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'PENDING',
    title: '문서 A',
    drafterName: '김민수',
    summary: '문서 A 요약',
    createdAt: '2026-10-12T09:00:00Z',
  },
  {
    electronicApprovalId: 2,
    documentNo: 'EA-20261012-0002',
    eabusNo: '008',
    documentType: 'BUSINESS_CONTACT',
    documentStatus: 'IN_PROGRESS',
    title: '문서 B',
    drafterName: '김민수',
    summary: '문서 B 요약',
  },
  {
    electronicApprovalId: 3,
    documentNo: 'EA-20261012-0003',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'DRAFT',
    title: '문서 C',
    drafterName: '김민수',
    summary: '문서 C 요약',
  },
  {
    electronicApprovalId: 4,
    documentNo: 'EA-20261012-0004',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'REVISION_REQUESTED',
    title: '문서 D',
    drafterName: '김민수',
    summary: '문서 D 요약',
  },
  {
    electronicApprovalId: 5,
    documentNo: 'EA-20261012-0005',
    eabusNo: '031',
    documentType: 'ATTENDANCE_APPLICATION',
    documentStatus: 'COMPLETED',
    title: '문서 E',
    drafterName: '김민수',
    summary: '문서 E 요약',
  },
  {
    electronicApprovalId: 6,
    documentNo: 'EA-20261012-0006',
    eabusNo: '032',
    documentType: 'EXPENSE_RESOLUTION',
    documentStatus: 'PENDING',
    title: '문서 F',
    drafterName: '김민수',
    summary: '문서 F 요약',
  },
];

export function toFeedRecord(
  record: DocumentApprovalRecord,
  overrides: Partial<DocumentApprovalFeedRecord> = {},
): DocumentApprovalFeedRecord {
  return {
    ...record,
    viewCount: 0,
    isDrafter: false,
    draftingWorkCategoryId: null,
    contentsJson: '{"type":"doc","content":[]}',
    contentsHtml: `<p>선조회 본문 ${record.electronicApprovalId}</p>`,
    contentsText: `선조회 본문 ${record.electronicApprovalId}`,
    approvalLines: [],
    attachments: [],
    systemEvents: [],
    comments: [
      {
        commentId: record.electronicApprovalId + 1000,
        ownerId: record.electronicApprovalId,
        content: `<p>초기 댓글 ${record.electronicApprovalId}</p>`,
        commentType: 'USER',
        writerId: 'commenter',
        writerName: '댓글 작성자',
        attachments: [],
      },
    ],
    commentCount: 1,
    hasPreviousComments: false,
    nextBeforeCommentId: null,
    ...overrides,
  };
}

export function clickComposerClose() {
  const closeButton = within(screen.getByRole('dialog', { name: '문서 작성' }))
    .getAllByRole('button', { name: '닫기' })
    .find((button) => button.textContent === '닫기');
  if (!closeButton) throw new Error('Missing composer close action.');
  fireEvent.click(closeButton);
}

export function toPage<T>(records: T[]) {
  return { resultList: records, totalRowCount: records.length };
}

export function mockPaginatedDocumentLists() {
  composerApi.listDocumentApprovals.mockImplementation(
    (
      _scope: unknown,
      _documentType: unknown,
      _electronicApprovalId: unknown,
      includeDetails: boolean,
      page?: { offset: number; limit: number },
    ) => {
      const records = includeDetails
        ? defaultDocumentRecords.map((record) => toFeedRecord(record))
        : defaultDocumentRecords;
      if (!page) return Promise.resolve(records);
      return Promise.resolve({
        resultList: records.slice(page.offset, page.offset + page.limit),
        totalRowCount: records.length,
      });
    },
  );
}

export function mockPendingFeedForCurrentApprover() {
  const record = defaultDocumentRecords[0];
  if (!record) throw new Error('Missing pending document fixture.');
  const pendingRecord = { ...record, documentStatus: 'PENDING' as const };
  const pendingFeedRecord = toFeedRecord(pendingRecord, {
    isDrafter: false,
    summary: '진행 문서',
    contentsHtml: '<p>진행 문서</p>',
    contentsText: '진행 문서',
    approvalLines: [
      {
        electronicApprovalLineId: 90,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '홍길동',
        actionStatus: 'PENDING',
      },
    ],
  });
  composerApi.listDocumentApprovals.mockImplementation(
    (
      _scope: unknown,
      _documentType: unknown,
      _documentId: unknown,
      includeDetails: boolean,
      page?: { offset: number; limit: number },
    ) => {
      const records = includeDetails ? [pendingFeedRecord] : [pendingRecord];
      if (!page) return Promise.resolve(records);
      return Promise.resolve({
        resultList: records.slice(page.offset, page.offset + page.limit),
        totalRowCount: records.length,
      });
    },
  );
}

export const category = {
  id: '101',
  groupId: '10',
  itemCode: 'WORK',
  itemNm: '업무',
  parentItemId: null,
  parentItemNm: '',
  sortOrder: 10,
  useAt: 'Y' as const,
  itemDc: '',
};

export const anotherCategory = {
  ...category,
  id: '102',
  itemCode: 'PROJECT',
  itemNm: '프로젝트',
  sortOrder: 20,
};

export const composerUser = {
  userId: 'emp-1',
  loginId: 1,
  userNm: '홍길동',
  departmentNm: '기획팀',
  profileImage: '/users/emp-1.png',
  levelNm: '대리',
};

export const anotherComposerUser = {
  userId: 'emp-2',
  loginId: 2,
  userNm: '김민수',
  departmentNm: '개발팀',
  profileImage: '/users/emp-2.png',
  levelNm: '과장',
};

export const thirdComposerUser = {
  userId: 'emp-3',
  loginId: 3,
  userNm: '박서준',
  departmentNm: '재무팀',
  profileImage: '/users/emp-3.png',
  levelNm: '사원',
};

export const fourthComposerUser = {
  userId: 'emp-4',
  loginId: 4,
  userNm: '이수진',
  departmentNm: '인사팀',
  profileImage: '/users/emp-4.png',
  levelNm: '부장',
};

export const fifthComposerUser = {
  userId: 'emp-5',
  loginId: 5,
  userNm: '최민호',
  departmentNm: '영업팀',
  profileImage: '/users/emp-5.png',
  levelNm: '차장',
};

export const draftForm = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  categoryItemId: 101,
  categoryName: '업무',
  regTermId: 201,
  regTerm: '월',
  reviewerId: null,
  reviewerName: '',
  approverId: null,
  approverName: '',
  assigneeIds: [],
  assigneeSummary: '',
  createdByName: '관리자',
  createdAt: '2026-10-02 09:00',
  hasDocument: true,
  useAt: 'Y' as const,
};

export const draftFormTemplate = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  hasDocument: true,
  templateJson: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '양식 본문' }] },
    ],
  },
  templateHtml: '<p>양식 본문</p>',
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(composerApi).forEach((mock) => mock.mockReset());
  Object.values(approvalLineTemplateApi).forEach((mock) => mock.mockReset());
  Object.values(composerNotifications).forEach((mock) => mock.mockReset());
  approvalLineTemplateApi.list.mockResolvedValue([]);
  composerApi.fetchDraftFormUsers.mockResolvedValue([]);
  composerApi.fetchDraftFormOptions.mockResolvedValue({
    categoryGroup: null,
    categoryItems: [category],
    cycleItems: [],
    users: [
      composerUser,
      anotherComposerUser,
      thirdComposerUser,
      fourthComposerUser,
      fifthComposerUser,
    ],
  });
  composerApi.fetchDraftForms.mockResolvedValue([draftForm]);
  composerApi.fetchDraftFormTemplate.mockResolvedValue(draftFormTemplate);
  composerApi.fetchMyProfile.mockResolvedValue({
    userId: composerUser.userId,
    employeeId: composerUser.userId,
    name: '기안자',
  });
  composerApi.saveDocumentDraft.mockResolvedValue({
    electronicApprovalId: 77,
    documentNo: 'EA-20261012-0077',
    documentStatus: 'DRAFT',
  });
  composerApi.submitDocumentApproval.mockResolvedValue({
    electronicApprovalId: 77,
    documentNo: 'EA-20261012-0077',
    eabusNo: '001',
    documentStatus: 'PENDING',
    submittedAt: '2026-10-12T09:00:00Z',
  });
  composerApi.cancelDocumentSubmission.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'DRAFT',
  });
  composerApi.cancelDocumentApproval.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'PENDING',
  });
  mockPaginatedDocumentLists();
  composerApi.listPinnedDocumentApprovals.mockResolvedValue([]);
  composerApi.pinDocumentApproval.mockReset().mockImplementation((electronicApprovalId: number) =>
    Promise.resolve({ electronicApprovalId, pinned: true }),
  );
  composerApi.unpinDocumentApproval.mockReset().mockImplementation((electronicApprovalId: number) =>
    Promise.resolve({ electronicApprovalId, pinned: false }),
  );
  composerApi.getDocumentApprovalSummary.mockResolvedValue({
    actionRequiredCount: 1,
    inProgressCount: 2,
    draftCount: 1,
    completedCount: 1,
    revisionRequestedCount: 1,
    rejectedCount: 0,
    referenceConfirmationRequiredCount: 2,
    referenceConfirmationItems: defaultDocumentRecords.slice(0, 2),
    finalConfirmationRequiredCount: 1,
    finalConfirmationItems: defaultDocumentRecords.slice(0, 1),
    notices: [
      {
        electronicApprovalId: 1,
        documentNo: 'EA-20261012-0001',
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        summary: '문서 A 요약',
        noticeType: 'ACTION_REQUIRED',
      },
      {
        electronicApprovalId: 4,
        documentNo: 'EA-20261012-0004',
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        title: '문서 D',
        drafterName: '김민수',
        summary: '문서 D 요약',
        noticeType: 'REVISION_REQUESTED',
      },
    ],
  });
  composerApi.getDocumentApprovalDetail.mockResolvedValue({
    electronicApprovalId: 1,
    documentNo: 'EA-20261012-0001',
    eabusNo: '001',
    documentType: 'DRAFTING',
    documentStatus: 'PENDING',
    title: '문서 A',
    drafterName: '김민수',
    summary: '문서 A 요약',
    viewCount: 0,
    draftingWorkCategoryId: null,
    contentsJson: '{"type":"doc","content":[]}',
    contentsHtml: '<p>본문 내용</p>',
    approvalLines: [],
    attachments: [],
    systemEvents: [],
  });
  composerApi.processDocumentApprovalAction.mockResolvedValue({
    electronicApprovalId: 1,
    documentStatus: 'IN_PROGRESS',
  });
  composerApi.confirmDocumentReference.mockResolvedValue({
    electronicApprovalId: 1,
    actionStatus: 'CONFIRMED',
  });
  composerApi.confirmDocumentFinalConfirmation.mockReset().mockResolvedValue({
    electronicApprovalId: 1,
    actionStatus: 'CONFIRMED',
    actionAt: '2026-11-02T02:00:00Z',
  });
  composerApi.addDocumentReferences.mockResolvedValue({
    electronicApprovalId: 1,
    addedCount: 1,
  });
  composerApi.listApprovalComments.mockResolvedValue({
    comments: [],
    systemEvents: [],
    hasPrevious: false,
    nextBeforeCommentId: null,
    resultCnt: 0,
  });
  composerApi.fetchApprovalEmbeddedImageBlob.mockResolvedValue(
    new Blob(['image'], { type: 'image/png' }),
  );
  composerApi.fetchApprovalCommentAttachmentBlob.mockResolvedValue(
    new Blob(['image'], { type: 'image/png' }),
  );
  composerApi.createApprovalComment.mockResolvedValue({});
  composerApi.updateApprovalComment.mockResolvedValue({});
  composerApi.deleteApprovalComment.mockResolvedValue(undefined);
  composerApi.deleteDocumentApproval.mockResolvedValue(undefined);
  composerApi.uploadApprovalCommentAttachment.mockResolvedValue({});
  composerApi.downloadApprovalCommentAttachment.mockResolvedValue(undefined);
  composerApi.deleteApprovalCommentAttachment.mockResolvedValue(undefined);
  composerApi.downloadDocumentApprovalAttachment.mockResolvedValue(undefined);
  composerApi.uploadDocumentDraftAttachment.mockResolvedValue({
    fileId: 501,
    fileName: 'evidence.txt',
    fileSize: 8,
  });
  composerApi.uploadDocumentDraftEmbeddedImage.mockResolvedValue({
    src: 'https://minio.example/approval-preview',
    alt: 'pasted.png',
    fileName: 'pasted.png',
    uploadToken: 'approval-image-token',
    fileId: 'approval-image-token',
    objectKey: 'tenant/1/embedded-image-temp/approval-image-token/pasted.png',
    fileSize: 8,
    mimeType: 'image/png',
  });
  composerApi.deleteDocumentDraftEmbeddedImage.mockResolvedValue(undefined);
  composerApi.listDocumentDraftAttachments.mockResolvedValue([]);
  composerApi.deleteDocumentDraftAttachment.mockResolvedValue(undefined);
});

export const pageProps = {
  selectedModule: {
    id: 'groupware',
    name: '그룹웨어',
    icon: <span aria-hidden="true">G</span>,
    tree: [],
    menus: [],
    path: '/groupware',
  },
  currentMenuName: '문서작성',
  currentPageKey: 'write',
  breadcrumbItems: ['그룹웨어', '문서관리', '문서작성'],
  content: {
    title: '문서작성',
    description: '결재 문서를 작성하고 진행 상태를 확인합니다.',
    cards: [],
    items: [],
  },
};

export async function waitForComposerReady() {
  await waitFor(() =>
    expect(screen.getByLabelText('기안자')).toHaveValue(
      '기안자',
    ),
  );
}

export function getPickerListbox(picker: HTMLElement): HTMLElement {
  const listboxId = picker.getAttribute('aria-controls');
  const listbox = listboxId ? document.getElementById(listboxId) : null;
  if (!listbox) throw new Error('User picker listbox is not open.');
  return listbox;
}

export function installApprovalResizeObserverMock() {
  const observers: (
    ResizeObserver & {
      resize: (width: number) => void;
      isObserving: (element: Element) => boolean;
    }
  )[] = [];

  class MockApprovalResizeObserver implements ResizeObserver {
    private target: Element | null = null;

    constructor(private callback: ResizeObserverCallback) {
      observers.push(
        this as ResizeObserver & {
          resize: (width: number) => void;
          isObserving: (element: Element) => boolean;
        },
      );
    }

    observe(target: Element): void {
      this.target = target;
      this.resize(262);
    }

    unobserve(_target: Element): void {}

    disconnect(): void {
      this.target = null;
    }

    isObserving(element: Element): boolean {
      return this.target === element;
    }

    resize(width: number): void {
      if (!this.target) return;
      const entry = {
        target: this.target,
        contentRect: {
          x: 0,
          y: 0,
          top: 0,
          right: width,
          bottom: 0,
          left: 0,
          width,
          height: 0,
          toJSON: () => ({}),
        },
      } as ResizeObserverEntry;
      this.callback([entry], this);
    }
  }

  vi.stubGlobal('ResizeObserver', MockApprovalResizeObserver);
  return observers;
}


export { composerApi, composerNotifications, approvalLineTemplateApi };

/** 테스트 본문에서 이미지 프리로더 복원 함수를 등록한다. 전역 afterEach가 실행 후 해제한다. */
export function setRestoreImagePreloader(restore: (() => void) | undefined) {
  restoreImagePreloader = restore;
}
