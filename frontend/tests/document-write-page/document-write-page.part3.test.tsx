import {
  composerApi,
  composerNotifications,
  clickDocumentMenuItem,
  muiTheme,
  defaultDocumentRecords,
  toFeedRecord,
  clickComposerClose,
  toPage,
  mockPaginatedDocumentLists,
  mockPendingFeedForCurrentApprover,
  pageProps,
} from './documentWritePage.harness';
import { act, fireEvent, render, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { DocumentApprovalDetailFeed } from '../../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import type { DocumentApprovalDetail, DocumentApprovalRecord, DocumentApprovalSummary } from '../../src/pages/groupware/documents/write/types/documentWrite.types';

describe('Document write page', () => {
  it('posts a new comment through the approval API without reloading the first page', async () => {
    const createdComment = {
      commentId: 32,
      ownerId: 1,
      parentCommentId: null,
      content: '<p>새 검토 의견</p>',
      commentType: 'USER',
      writerId: 'writer-1',
      writerName: '박서준',
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    };
    composerApi.createApprovalComment.mockResolvedValueOnce(createdComment);
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));
    const editor = await screen.findByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(editor, { target: { innerHTML: '<p>새 검토 의견</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(composerApi.createApprovalComment).toHaveBeenCalledWith(
        1,
        '<p>새 검토 의견</p>',
        undefined,
        [],
        false,
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('새 검토 의견'),
    );
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('전자결재 댓글 응답을 확인할 수 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('loads and prepends an earlier approval comment page', async () => {
    const createComment = (commentId: number, content: string) => ({
      commentId,
      ownerId: 1,
      parentCommentId: null,
      content: `<p>${content}</p>`,
      commentType: 'USER',
      writerId: `writer-${commentId}`,
      writerName: `작성자 ${commentId}`,
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    });
    const createSystemEvent = (
      commentId: number,
      content: string,
      createdAt: string,
    ) => ({
      commentId,
      ownerId: 1,
      commentType: 'SYSTEM',
      eventType: 'SUBMITTED',
      content,
      writerName: '시스템',
      createdAt,
    });
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [createComment(30, '최근 댓글')],
        systemEvents: [
          createSystemEvent(31, '최신 페이지 시스템 메시지', '2026-10-12T09:00:00Z'),
        ],
        hasPrevious: true,
        nextBeforeCommentId: 31,
        resultCnt: 4,
      })
      .mockRejectedValueOnce(new Error('이전 페이지를 불러오지 못했습니다.'))
      .mockResolvedValueOnce({
        comments: [createComment(20, '이전 댓글')],
        systemEvents: [
          createSystemEvent(19, '이전 페이지 시스템 메시지', '2026-10-12T08:00:00Z'),
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 4,
      });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('최근 댓글'),
    );
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('댓글 4')).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenNthCalledWith(1, 1, {
      limit: 3,
      beforeCommentId: undefined,
    });
    fireEvent.click(screen.getByRole('button', { name: '이전 댓글 보기 (2)' }));
    expect(
      await screen.findByText('이전 페이지를 불러오지 못했습니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 댓글 보기 (2)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await waitFor(() =>
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('이전 댓글'),
    );
    expect(screen.getByText('이전 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('최신 페이지 시스템 메시지')).toBeInTheDocument();
    expect(screen.getByText('댓글 4')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /이전 댓글 보기/ }),
    ).not.toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenNthCalledWith(2, 1, {
      limit: 20,
      beforeCommentId: 31,
    });
    expect(composerApi.listApprovalComments).toHaveBeenLastCalledWith(1, {
      limit: 20,
      beforeCommentId: 31,
    });
  });

  it('keeps loaded approval comments and the remaining count after creating a comment', async () => {
    const createComment = (commentId: number, content: string) => ({
      commentId,
      ownerId: 1,
      parentCommentId: null,
      content: `<p>${content}</p>`,
      commentType: 'USER',
      writerId: `writer-${commentId}`,
      writerName: `작성자 ${commentId}`,
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    });
    const latestComments = [25, 24, 23].map((id) =>
      createComment(id, `최근 댓글 ${id}`),
    );
    const previousComments = [createComment(22, '이전 댓글 22')];
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: latestComments,
        systemEvents: [],
        hasPrevious: true,
        nextBeforeCommentId: 23,
        resultCnt: 5,
      })
      .mockResolvedValueOnce({
        comments: previousComments,
        systemEvents: [],
        hasPrevious: true,
        nextBeforeCommentId: 22,
        resultCnt: 5,
      });
    composerApi.createApprovalComment
      .mockResolvedValueOnce(createComment(26, '새 검토 의견'))
      .mockResolvedValueOnce({
        ...createComment(27, '새 검토 답글'),
        parentCommentId: 26,
      });

    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
        limit: 3,
        beforeCommentId: undefined,
      }),
    );
    await screen.findByText('최근 댓글 25');
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (2)' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: '이전 댓글 보기 (2)' }),
    );
    await screen.findByText('이전 댓글 22');
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();

    const editor = screen.getByRole('textbox', { name: '댓글 입력' });
    fireEvent.input(editor, { target: { innerHTML: '<p>새 검토 의견</p>' } });
    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await screen.findByText('새 검토 의견');
    expect(screen.getByText('이전 댓글 22')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
    expect(composerApi.listApprovalComments).toHaveBeenLastCalledWith(1, {
      limit: 20,
      beforeCommentId: 23,
    });

    const replyButtons = within(
      screen.getByTestId('post-detail-panel'),
    ).getAllByRole('button', { name: '답글' });
    expect(replyButtons.length).toBeGreaterThan(0);
    fireEvent.click(replyButtons[replyButtons.length - 1]);
    const replyEditor = screen.getByRole('textbox', { name: '답글 입력' });
    fireEvent.input(replyEditor, {
      target: { innerHTML: '<p>새 검토 답글</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답글 등록' }));

    await screen.findByText('새 검토 답글');
    expect(screen.getByText('이전 댓글 22')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '이전 댓글 보기 (1)' }),
    ).toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
  }, 15000);

  it('opens a revision-requested draft in the composer with its persisted content and approvers', async () => {
    mockPaginatedDocumentLists();
    composerApi.listApprovalComments.mockReset();
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [
          {
            commentId: 40,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RETURNED',
            content: '문서 보완이 요청되었습니다.',
            writerName: '홍길동',
            attachments: [],
          },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 1,
      })
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [
          {
            commentId: 41,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RESUBMITTED',
            content: '문서가 재상신되었습니다.',
            writerName: '김민수',
            attachments: [],
          },
          {
            commentId: 40,
            ownerId: 4,
            commentType: 'SYSTEM',
            eventType: 'RETURNED',
            content: '문서 보완이 요청되었습니다.',
            writerName: '홍길동',
            attachments: [],
          },
        ],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 2,
      });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '004',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '보완할 기안서',
      drafterName: '김민수',
      draftingWorkCategoryId: 77,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: JSON.stringify({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '기존 본문' }] }],
      }),
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
        },
        {
          electronicApprovalLineId: 12,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'RETURNED',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 D/ }),
    );
    const detailPanel = await screen.findByTestId('post-detail-panel');
    await within(detailPanel).findByText('문서 보완이 요청되었습니다.');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));
    const composer = await screen.findByRole('dialog', { name: '문서 작성' });
    await screen.findByRole('textbox', { name: '기안자' }, { timeout: 10000 });

    expect(detailPanel).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '보완할 기안서',
    );
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent(
      '기존 본문',
    );
    const approvalPeople = screen.getAllByTestId('document-approval-person');
    expect(approvalPeople[0]).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    expect(approvalPeople[1]).toHaveAttribute('aria-label', '결재 2 김민수');

    await waitFor(() =>
      expect(within(composer).getByRole('button', { name: '결재신청' })).toBeEnabled(),
    );
    fireEvent.click(within(composer).getByRole('button', { name: '결재신청' }));
    await waitFor(() =>
      expect(composerApi.submitDocumentApproval).toHaveBeenCalled(),
    );
    await waitForElementToBeRemoved(composer);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    expect(
      await within(detailPanel).findByText('문서가 재상신되었습니다.'),
    ).toBeInTheDocument();
  }, 15000);

  it('shows and preserves existing attachments when editing a revision-requested document', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '첨부파일이 있는 문서',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: '{"type":"doc","content":[{"type":"paragraph"}]}',
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
        },
      ],
      attachments: [
        { fileId: 62, fileName: '기존자료.pdf', fileSize: 128, mimeType: 'application/pdf' },
      ],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /^문서 D/ }),
    );
    await screen.findByTestId('post-detail-panel');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));

    const dialog = await screen.findByRole('dialog', { name: '문서 작성' });
    await within(dialog).findByRole('textbox', { name: '기안자' }, { timeout: 10000 });
    expect(await within(dialog).findByText('기존자료.pdf')).toBeInTheDocument();
    const uploadedRow = within(dialog).getByTestId(
      'document-composer-attachment-uploaded',
    );
    const uploadedBadge = within(uploadedRow).getByTestId(
      'document-composer-attachment-status',
    );
    expect(uploadedBadge).toHaveTextContent('완료');
    expect(within(uploadedRow).queryByText('업로드 완료')).not.toBeInTheDocument();
    const uploadedRemoveButton = within(uploadedRow).getByRole('button', {
      name: '첨부 파일 삭제',
    });
    expect(
      uploadedBadge.compareDocumentPosition(uploadedRemoveButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText('첨부 파일 선택'), {
      target: {
        files: [
          new File(['new'], 'new-file.xlsx', {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }),
        ],
      },
    });
    const pendingRow = within(dialog).getByTestId(
      'document-composer-attachment-pending',
    );
    const pendingBadge = within(pendingRow).getByTestId(
      'document-composer-attachment-status',
    );
    expect(pendingBadge).toHaveTextContent('대기');
    expect(within(pendingRow).queryByText('저장 후 업로드')).not.toBeInTheDocument();
    fireEvent.click(
      within(pendingRow).getByRole('button', { name: '첨부 파일 삭제' }),
    );

    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
        expect.any(Object),
        4,
      ),
    );
    expect(composerApi.uploadDocumentDraftAttachment).not.toHaveBeenCalled();
  }, 15000);

  it('loads protected existing images in the edit composer without saving blob URLs', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:approval-image-preview'),
      revokeObjectURL: vi.fn(),
    });
    try {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
        electronicApprovalId: 4,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        isDrafter: true,
        title: '이미지가 있는 문서',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        viewCount: 0,
        summary: '기존 내용',
        contentsJson: '{"type":"doc","content":[{"type":"paragraph"}]}',
        contentsHtml:
          '<p>기존 본문</p><img src="/api/v1/groupware/approvals/4/embedded-images/51" alt="영수증" data-file-id="51" data-upload-token="image-token" />',
        approvalLines: [
          {
            electronicApprovalLineId: 11,
            stageOrder: 1,
            participantOrder: 1,
            participantType: 'APPROVAL',
            participantUserId: 'emp-1',
            participantName: '홍길동',
            actionStatus: 'APPROVED',
          },
        ],
        attachments: [],
        systemEvents: [],
      });
      render(<DashboardContent {...pageProps} />);
      const listRegion = await screen.findByRole('region', {
        name: '리스트형 문서 목록',
      });
      fireEvent.click(
        await within(listRegion).findByRole('button', { name: /문서 D/ }),
      );
      await screen.findByTestId('post-detail-panel');
      fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));

      const dialog = await screen.findByRole('dialog', { name: '문서 작성' });
      await within(dialog).findByRole('textbox', { name: '기안자' }, { timeout: 10000 });
      await waitFor(() =>
        expect(
          dialog.querySelector('.document-composer-editor .ProseMirror img'),
        ).toHaveAttribute('src', 'blob:approval-image-preview'),
      );
      expect(composerApi.fetchApprovalEmbeddedImageBlob).toHaveBeenCalledWith(4, 51);

      const image = dialog.querySelector<HTMLImageElement>(
        '.document-composer-editor .ProseMirror img',
      );
      if (!image) throw new Error('Expected the existing document image in the editor');
      const elementFromPointDescriptor = Object.getOwnPropertyDescriptor(
        document,
        'elementFromPoint',
      );
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: vi.fn(() => image),
      });
      try {
        fireEvent.mouseDown(image);
      } finally {
        if (elementFromPointDescriptor) {
          Object.defineProperty(
            document,
            'elementFromPoint',
            elementFromPointDescriptor,
          );
        } else {
          delete (document as Document & { elementFromPoint?: unknown })
            .elementFromPoint;
        }
      }
      const resizeHandle = await screen.findByLabelText(
        'se 방향 이미지 크기 조절',
      );
      fireEvent.pointerDown(resizeHandle, { clientX: 0, clientY: 0 });
      fireEvent.pointerMove(window, { clientX: 50, clientY: 50 });
      fireEvent.pointerUp(window);
      await waitFor(() =>
        expect(
          dialog.querySelector('.document-composer-editor .ProseMirror img'),
        ).toHaveAttribute('src', 'blob:approval-image-preview'),
      );
      expect(
        dialog.querySelector('.document-composer-editor .ProseMirror img'),
      ).toHaveAttribute('width', '400px');
      expect(
        dialog.querySelector('.document-composer-editor .ProseMirror img'),
      ).toHaveAttribute('height', '250px');

      fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
      await waitFor(() =>
        expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
          expect.objectContaining({
            contentsHtml: expect.stringContaining(
              '/api/v1/groupware/approvals/4/embedded-images/51',
            ),
          }),
          4,
        ),
      );
      const savedRequest = composerApi.saveDocumentDraft.mock.calls.at(-1)?.[0];
      expect(savedRequest?.contentsHtml).not.toContain('blob:approval-image-preview');
      expect(savedRequest?.contentsHtml).toContain('width="400px"');
      expect(savedRequest?.contentsHtml).toContain('height="250px"');
      const savedContentsJson = JSON.stringify(savedRequest?.contentsJson);
      expect(savedContentsJson).toContain(
        '/api/v1/groupware/approvals/4/embedded-images/51',
      );
      expect(savedContentsJson).toContain('"width":"400px"');
      expect(savedContentsJson).toContain('"height":"250px"');
      expect(savedContentsJson).not.toContain('blob:approval-image-preview');
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);

  it('keeps the detail panel open and refreshes it quietly after closing the composer', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 4,
      eabusNo: '004',
      documentType: 'DRAFTING',
      documentStatus: 'REVISION_REQUESTED',
      isDrafter: true,
      title: '보완할 기안서',
      drafterName: '김민수',
      draftingWorkCategoryId: 77,
      viewCount: 0,
      summary: '기존 내용',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>기존 본문</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 D/ }),
    );
    const detailPanel = await screen.findByTestId('post-detail-panel');
    await within(detailPanel).findByText('기존 본문');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '수정 후 재상신' }));
    await screen.findByRole('dialog', { name: '문서 작성' });
    await screen.findByRole('textbox', { name: '기안자' }, { timeout: 10000 });

    let resolveDocuments!: (page: {
      resultList: DocumentApprovalRecord[];
      totalRowCount: number;
    }) => void;
    let resolveSummary!: (summary: DocumentApprovalSummary) => void;
    let resolveDetail!: (detail: DocumentApprovalDetail) => void;
    composerApi.listDocumentApprovals.mockImplementationOnce(
      () =>
        new Promise<{ resultList: DocumentApprovalRecord[]; totalRowCount: number }>((resolve) => {
          resolveDocuments = resolve;
        }),
    );
    composerApi.getDocumentApprovalSummary.mockImplementationOnce(
      () =>
        new Promise<DocumentApprovalSummary>((resolve) => {
          resolveSummary = resolve;
        }),
    );
    composerApi.getDocumentApprovalDetail.mockImplementationOnce(
      () =>
        new Promise<DocumentApprovalDetail>((resolve) => {
          resolveDetail = resolve;
        }),
    );

    clickComposerClose();
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() => {
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(2);
      expect(composerApi.getDocumentApprovalSummary).toHaveBeenCalledTimes(2);
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('기존 본문');
    expect(screen.queryByTestId('list-view-skeleton')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '문서 상세 불러오는 중' }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveDocuments({ resultList: [], totalRowCount: 0 });
      resolveSummary({
        actionRequiredCount: 0,
        inProgressCount: 0,
        draftCount: 0,
        completedCount: 0,
        revisionRequestedCount: 0,
        rejectedCount: 0,
        referenceConfirmationRequiredCount: 0,
        referenceConfirmationItems: [],
        notices: [],
      });
      resolveDetail({
        electronicApprovalId: 4,
        eabusNo: '004',
        documentType: 'DRAFTING',
        documentStatus: 'REVISION_REQUESTED',
        isDrafter: true,
        title: '수정된 기안서',
        drafterName: '김민수',
        draftingWorkCategoryId: 77,
        viewCount: 1,
        summary: '수정된 요약',
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml: '<p>수정된 본문</p>',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
    });
    expect(
      await within(screen.getByTestId('post-detail-panel')).findByText('수정된 본문'),
    ).toBeInTheDocument();
  }, 30000);

  it('renders type-specific system badges in document feed cards', async () => {
    const events = [
      ['DRAFT_SAVED', '임시저장', 'Default'],
      ['SUBMITTED', '결재신청', 'Info'],
      ['REJECTED', '반려', 'Error'],
      ['APPROVED', '승인', 'Success'],
      ['RETURNED', '보완요청', 'Warning'],
      ['COMPLETED', '완료', 'Success'],
      ['UNKNOWN', null, null],
    ] as const;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve({ resultList: includeDetails
          ? [...defaultDocumentRecords, { ...defaultDocumentRecords[0], electronicApprovalId: 7 }].map((record, index) => {
              const [eventType] = events[index];
              return toFeedRecord(record, {
                systemEvents: [{
                  eventType,
                  writerName: '시스템',
                  content: `시스템 처리 ${eventType}`,
                  createdAt: '2026-10-16T09:00:00Z',
                }],
              });
            })
          : defaultDocumentRecords, totalRowCount: includeDetails ? defaultDocumentRecords.length + 1 : defaultDocumentRecords.length }),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const feed = await screen.findByTestId('document-feed');
    await waitFor(() => {
      expect(within(feed).getAllByTestId('system-event-badge')).toHaveLength(6);
    });
    const cards = within(feed).getAllByTestId('document-write-item');
    events.forEach(([eventType, label, color], index) => {
      const card = within(cards[index]);
      expect(card.getByText(`시스템 처리 ${eventType}`)).toBeInTheDocument();
      if (label) {
        expect(card.getByTestId('system-event-badge')).toHaveTextContent(label);
        expect(card.getByTestId('system-event-badge')).toHaveClass(`MuiChip-color${color}`);
        expect(card.queryByTestId('system-event-icon')).not.toBeInTheDocument();
      } else {
        expect(card.queryByTestId('system-event-badge')).not.toBeInTheDocument();
        expect(card.getByTestId('system-event-icon')).toBeInTheDocument();
      }
    });
  });

  it.each(['feed', 'panel'] as const)(
    'keeps comments visible with replies initially collapsed in %s presentation',
    async (presentation) => {
      const feedData = toFeedRecord(defaultDocumentRecords[0], {
        comments: [
          {
            commentId: 1001,
            ownerId: 1,
            content: '<p>상위 댓글</p>',
            commentType: 'USER',
            writerName: '댓글 작성자',
            attachments: [],
          },
          {
            commentId: 1002,
            ownerId: 1,
            parentCommentId: 1001,
            content: '<p>접을 답글</p>',
            commentType: 'USER',
            writerName: '답글 작성자',
            attachments: [],
          },
        ],
      });
      composerApi.listApprovalComments.mockResolvedValue({
        comments: feedData.comments,
        systemEvents: [],
        resultCnt: 1,
        hasPrevious: false,
        nextBeforeCommentId: null,
      });
      const sharedProps = {
        open: true,
        electronicApprovalId: 1,
        detailRefreshToken: 0,
        onActionComplete: () => undefined,
        onEditDocument: () => undefined,
      };
      render(
        <ThemeProvider theme={muiTheme}>
          {presentation === 'feed' ? (
            <DocumentApprovalDetailFeed
              {...sharedProps}
              presentation="feed"
              employeeId="emp-1"
              feedItem={{
                id: 1,
                title: '문서 A',
                kind: '기안서',
                status: '결재진행중',
                author: '김민수',
                date: '2026.10.29',
                summary: '문서 요약',
                feedData,
              }}
            />
          ) : (
            <DocumentApprovalDetailFeed
              {...sharedProps}
              presentation="panel"
              onClose={() => undefined}
            />
          )}
        </ThemeProvider>,
      );
      await waitFor(() => {
        expect(screen.getByText('상위 댓글')).toBeInTheDocument();
      });
      expect(await screen.findByRole('textbox', { name: '댓글 입력' })).toBeInTheDocument();
      const toggle = screen.getByRole('button', { name: '답글 1개' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('접을 답글')).not.toBeInTheDocument();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('접을 답글')).toBeInTheDocument();
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('접을 답글')).not.toBeInTheDocument();
      expect(screen.getByText('상위 댓글')).toBeInTheDocument();
    },
  );

  it('renders every filtered document as a complete feed card with comments and reactions', async () => {
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve(toPage(
          includeDetails
            ? defaultDocumentRecords.map((record) =>
                toFeedRecord(record, {
                  ...(record.electronicApprovalId === 1
                    ? {
                        submittedAt: '2026-10-14T11:00:00Z',
                        updatedAt: '2026-10-15T11:00:00Z',
                        createdAt: '2026-10-12T09:00:00Z',
                      }
                    : {}),
                  title: `상세 문서 ${record.electronicApprovalId}`,
                  viewCount: 3,
                  contentsHtml: `<p>전체 본문 ${record.electronicApprovalId}</p>`,
                  approvalLines: [
                    {
                      electronicApprovalLineId: record.electronicApprovalId,
                      stageOrder: 1,
                      participantOrder: 1,
                      participantType: 'APPROVAL',
                      participantUserId: 'reviewer-1',
                      participantName: `결재자 ${record.electronicApprovalId}`,
                      actionStatus: 'WAITING',
                    },
                  ],
                  attachments: [
                    {
                      fileId: record.electronicApprovalId + 100,
                      fileName: `첨부 ${record.electronicApprovalId}.pdf`,
                      fileSize: 1,
                    },
                  ],
                  commentCount: 4,
                  hasPreviousComments: true,
                  nextBeforeCommentId: record.electronicApprovalId + 1000,
                }),
              )
            : defaultDocumentRecords,
        )),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const documentFeed = await screen.findByTestId('document-feed');
    const cards = await within(documentFeed).findAllByTestId('document-write-item');
    expect(cards).toHaveLength(6);

    for (let index = 0; index < cards.length; index += 1) {
      const documentId = index + 1;
      const card = cards[index];
      if (!card) throw new Error(`Missing document card ${documentId}.`);
      if (documentId === 1) {
        expect(card).toHaveTextContent('기안자 · 2026.10.14 · 조회 3');
      }
      expect(
        await within(card).findByText(`전체 본문 ${documentId}`),
      ).toBeInTheDocument();
      expect(within(card).queryByTestId('approval-line-readonly')).not.toBeInTheDocument();
      const expandBodyButton = within(card).queryByRole('button', { name: '더보기' });
      if (expandBodyButton) fireEvent.click(expandBodyButton);
      if (documentId === 1) {
        expect(within(card).getByText('기안', { exact: true })).toBeInTheDocument();
        expect(within(card).getByText('결재진행중')).toBeInTheDocument();
      }
      expect(within(card).getByText(`결재자 ${documentId}`)).toBeInTheDocument();
      expect(within(card).getByText(`첨부 ${documentId}.pdf`)).toBeInTheDocument();
      expect(
        within(card).getByRole('button', { name: '좋아요 0' }),
      ).toHaveAttribute('aria-pressed', 'false');
      expect(
        within(card).getByRole('textbox', { name: '댓글 입력' }),
      ).toBeInTheDocument();
      expect(within(card).getByText(`초기 댓글 ${documentId}`)).toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: '승인' }),
      ).not.toBeInTheDocument();
      expect(
        within(card).queryByRole('button', { name: '상신 취소' }),
      ).not.toBeInTheDocument();
    }
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).not.toHaveBeenCalled();
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: [
        {
          commentId: 501,
          ownerId: 1,
          content: '<p>이전 페이지 댓글</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [],
        },
      ],
      systemEvents: [],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 4,
    });
    const firstCard = cards[0];
    if (!firstCard) throw new Error('No document feed cards were rendered.');
    fireEvent.click(
      within(firstCard).getByRole('button', { name: '이전 댓글 보기 (3)' }),
    );
    await waitFor(() =>
      expect(
        within(screen.getByTestId('document-feed')).getByText('이전 페이지 댓글'),
      ).toBeInTheDocument(),
    );
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      limit: 20,
      beforeCommentId: 1001,
    });
    expect(composerApi.listDocumentApprovals).toHaveBeenCalledWith(
      'ALL',
      undefined,
      undefined,
      true,
      { offset: 0, limit: 20 },
    );
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  }, 20000);

  it('shows approval actions first in the more menu for a feed approver', async () => {
    mockPendingFeedForCurrentApprover();
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const card = await screen.findByTestId('document-write-item');
    const toolbar = within(card).getByTestId('document-approval-toolbar');
    await waitFor(() =>
      expect(composerApi.fetchMyProfile).toHaveBeenCalledTimes(1),
    );
    expect(within(toolbar).queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: '반려' })).not.toBeInTheDocument();
    expect(within(toolbar).queryByRole('button', { name: '보완요청' })).not.toBeInTheDocument();
    const statusChip = within(toolbar).getByText('결재진행중').closest('.MuiChip-root');
    const kindChip = within(toolbar).getByText('기안').closest('.MuiChip-root');
    if (!statusChip || !kindChip) throw new Error('Missing document badges.');
    const divider = within(toolbar).getByRole('separator');
    const pin = within(toolbar).getByRole('button', {
      name: '상단 고정 문서 A',
    });
    fireEvent.click(within(toolbar).getByRole('button', { name: '문서 더보기' }));
    const menu = await screen.findByRole('menu');
    const menuItems = within(menu).getAllByRole('menuitem');
    expect(menuItems.map((item) => item.textContent)).toEqual([
      '승인',
      '반려',
      '보완요청',
      '문서 공유하기',
      '참조자 추가하기',
    ]);
    const menuDividers = within(menu).getAllByRole('separator');
    expect(menuDividers).toHaveLength(1);
    expect(
      menuItems[2]?.compareDocumentPosition(menuDividers[0]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(
      menuDividers[0]?.compareDocumentPosition(menuItems[3]!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);
    expect(getComputedStyle(statusChip).height).toBe('28px');
    expect(getComputedStyle(kindChip).height).toBe('28px');
    expect(getComputedStyle(toolbar).columnGap).toBe('4px');
    expect(getComputedStyle(divider).marginRight).toBe('0px');
    expect(statusChip).toHaveClass('MuiChip-filled');
    expect(statusChip).toHaveStyle({ borderRadius: '4px' });
    expect(kindChip).toHaveStyle({ borderRadius: '4px' });
    expect(
      within(menu).queryByRole('menuitem', { name: '상신 취소' }),
    ).not.toBeInTheDocument();
    expect(
      within(menu).queryByRole('menuitem', { name: '승인 취소' }),
    ).not.toBeInTheDocument();
    expect(getComputedStyle(pin).marginLeft).toBe('0px');
    expect(screen.getByTestId('approval-line-participant-90')).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
    });
  });

  it('does not expose approval actions in the detail toolbar and keeps the opinion field', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      isDrafter: false,
      title: '결재할 문서',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 93,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'PENDING',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );

    const toolbar = await screen.findByTestId('document-approval-toolbar');
    await waitFor(() =>
      expect(composerApi.fetchMyProfile).toHaveBeenCalledTimes(1),
    );
    expect(within(toolbar).queryByRole('button', { name: '승인' })).not.toBeInTheDocument();
    expect(
      await screen.findByRole('textbox', { name: '처리 의견' }),
    ).toBeInTheDocument();
    fireEvent.click(within(toolbar).getByRole('button', { name: '문서 더보기' }));
    const menu = await screen.findByRole('menu');
    const menuItems = within(menu).getAllByRole('menuitem');
    expect(menuItems.slice(0, 3).map((item) => item.textContent)).toEqual([
      '승인',
      '반려',
      '보완요청',
    ]);
    expect(menuItems[3]).toHaveTextContent('문서 공유하기');
  });

  it.each([
    ['REJECTED', '반려', '반려 사유', '반려 확인'],
    ['RETURNED', '보완요청', '보완요청 사유', '보완요청 확인'],
  ] as const)('processes a detail %s through a reason dialog with retry', async (
    action, label, dialogTitle, confirmLabel,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      documentStatus: 'PENDING',
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    await clickDocumentMenuItem(screen.getByTestId('approval-detail-card'), label);
    let dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(dialog).toHaveStyle({ maxWidth: '480px' });
    expect(dialog).toHaveAccessibleDescription('처리 사유를 입력해 주세요.');
    expect(within(dialog).getByTestId('common-dialog-actions')).toContainElement(
      within(dialog).getByRole('button', { name: confirmLabel }),
    );
    expect(within(dialog).getByRole('button', { name: '닫기', exact: true })).toBeInTheDocument();
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: '취소할 사유' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    await clickDocumentMenuItem(screen.getByTestId('approval-detail-card'), label);
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue('');
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    await clickDocumentMenuItem(screen.getByTestId('approval-detail-card'), label);
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue('');
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: ' \n ' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('반려 또는 보완요청 사유를 입력해 주세요.');
    expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
    const reason = '첫 번째 사유\n두 번째 사유\n\n마지막 사유 <b>확인</b>';
    fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
      target: { value: `  ${reason}  ` },
    });
    composerApi.processDocumentApprovalAction.mockRejectedValueOnce(new Error('결재 처리 실패'));
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('결재 처리 실패');
    expect(within(dialog).getByRole('textbox', { name: '처리 사유' })).toHaveValue(`  ${reason}  `);
    expect(onClose).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledTimes(2);
    expect(composerApi.processDocumentApprovalAction).toHaveBeenLastCalledWith(1, {
      action, actionComment: reason,
    });
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument());
  }, 15000);

  it('submits a detail approval directly with its optional opinion', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 0,
      })
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [{
          commentId: 501,
          ownerId: 1,
          commentType: 'SYSTEM',
          eventType: 'APPROVED',
          content: '승인 액션 시스템 메시지',
          writerName: '결재자',
          createdAt: '2026-10-16T09:00:00Z',
        }],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 1,
      });
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    fireEvent.change(await screen.findByRole('textbox', { name: '처리 의견' }), {
      target: { value: '승인 의견' },
    });
    await clickDocumentMenuItem(screen.getByTestId('approval-detail-card'), '승인');
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledWith(1, {
      action: 'APPROVED', actionComment: '승인 의견',
    });
    expect(onActionComplete).toHaveBeenCalledWith({ quiet: true });
    expect(screen.getByText('승인 액션 시스템 메시지')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps an approval successful when refreshing comments fails', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: false,
      approvalLines: [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'PENDING',
      }],
    }));
    composerApi.listApprovalComments
      .mockResolvedValueOnce({
        comments: [],
        systemEvents: [],
        hasPrevious: false,
        nextBeforeCommentId: null,
        resultCnt: 0,
      })
      .mockRejectedValueOnce(new Error('댓글 재조회 실패'));
    const onClose = vi.fn();
    const onActionComplete = vi.fn();
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);

    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    await clickDocumentMenuItem(screen.getByTestId('approval-detail-card'), '승인');

    expect(await screen.findByText('댓글 재조회 실패')).toBeInTheDocument();
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '문서가 승인되었습니다.',
    );
    expect(onActionComplete).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['submission', '상신 취소', '결재신청 취소'],
    ['approval', '승인 취소', '승인 취소'],
  ] as const)('submits the detail %s cancellation from its confirmation dialog', async (
    kind, buttonLabel, dialogTitle,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.getDocumentApprovalDetail.mockResolvedValue(toFeedRecord(record, {
      isDrafter: kind === 'submission',
      documentStatus: kind === 'submission' ? 'PENDING' : 'IN_PROGRESS',
      approvalLines: kind === 'approval' ? [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'APPROVED',
      }] : [],
    }));
    const onActionComplete = vi.fn();
    const onClose = vi.fn();
    const cancelApi = kind === 'submission'
      ? composerApi.cancelDocumentSubmission : composerApi.cancelDocumentApproval;
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={onClose} onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(1),
    );
    await clickDocumentMenuItem(
      screen.getByTestId('approval-detail-card'),
      buttonLabel,
    );
    const dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(cancelApi).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    await waitFor(() => expect(cancelApi).toHaveBeenCalledWith(1));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2),
    );
    expect(cancelApi).toHaveBeenCalledWith(1);
    expect(onClose).not.toHaveBeenCalled();
  }, 15000);

  it.each([
    ['submission', '상신 취소', '결재신청 취소'],
    ['approval', '승인 취소', '승인 취소'],
  ] as const)('confirms and retries feed %s cancellation with a list refresh', async (
    kind, buttonLabel, dialogTitle,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const feedRecord = toFeedRecord(record, {
      isDrafter: kind === 'submission',
      documentStatus: kind === 'submission' ? 'PENDING' : 'IN_PROGRESS',
      approvalLines: kind === 'approval' ? [{
        electronicApprovalLineId: 93,
        stageOrder: 2,
        participantOrder: 1,
        participantType: 'APPROVAL',
        participantUserId: 'emp-1',
        participantName: '결재자',
        actionStatus: 'APPROVED',
      }] : [],
    });
    const onActionComplete = vi.fn();
    const cancelApi = kind === 'submission'
      ? composerApi.cancelDocumentSubmission : composerApi.cancelDocumentApproval;
    cancelApi.mockRejectedValueOnce(new Error('취소 처리 실패'));
    render(<DocumentApprovalDetailFeed
      open presentation="feed" electronicApprovalId={1} detailRefreshToken={0}
      feedItem={{
        id: 1, title: record.title, author: record.drafterName,
        kind: '기안서', status: '결재진행중', date: '', summary: record.summary, feedData: feedRecord,
      }}
      employeeId="emp-1"
      onActionComplete={onActionComplete} onEditDocument={vi.fn()}
    />);
    const toolbar = screen.getByTestId('document-approval-toolbar');
    fireEvent.click(within(toolbar).getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: buttonLabel, exact: true }));
    let dialog = await screen.findByRole('dialog', { name: dialogTitle });
    expect(cancelApi).not.toHaveBeenCalled();
    const footerClose = within(dialog)
      .getAllByRole('button', { name: '닫기' })
      .find((button) => button.textContent === '닫기');
    if (!footerClose) throw new Error('Missing dialog close action.');
    fireEvent.click(footerClose);
    await waitForElementToBeRemoved(dialog);
    expect(cancelApi).not.toHaveBeenCalled();
    fireEvent.click(within(toolbar).getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: buttonLabel, exact: true }));
    dialog = await screen.findByRole('dialog', { name: dialogTitle });
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    expect(await within(dialog).findByText('취소 처리 실패')).toBeInTheDocument();
    expect(onActionComplete).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: buttonLabel, exact: true }));
    await waitFor(() => expect(onActionComplete).toHaveBeenCalledOnce());
    expect(cancelApi).toHaveBeenCalledTimes(2);
    expect(cancelApi).toHaveBeenLastCalledWith(1);
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      beforeCommentId: undefined, limit: 3,
    });
  }, 20000);

  it.each([
    ['not the drafter', 'PENDING', false, 'WAITING', false],
    ['already in progress', 'IN_PROGRESS', true, 'WAITING', false],
    ['completed', 'COMPLETED', true, 'APPROVED', false],
    ['a later stage acted', 'IN_PROGRESS', false, 'APPROVED', true],
  ] as const)('hides ineligible feed cancellation when %s', async (
    _reason, documentStatus, isDrafter, ownStatus, laterActed,
  ) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const feedRecord = toFeedRecord(record, {
      documentStatus, isDrafter,
      approvalLines: [{
        electronicApprovalLineId: 93, stageOrder: 2, participantOrder: 1,
        participantType: 'APPROVAL', participantUserId: 'emp-1',
        participantName: '결재자', actionStatus: ownStatus,
      }, ...(laterActed ? [{
        electronicApprovalLineId: 94, stageOrder: 3, participantOrder: 1,
        participantType: 'APPROVAL' as const, participantUserId: 'emp-2',
        participantName: '후속 결재자', actionStatus: 'APPROVED' as const,
      }] : [])],
    });
    render(<DocumentApprovalDetailFeed
      open presentation="feed" electronicApprovalId={1} detailRefreshToken={0}
      feedItem={{
        id: 1, title: record.title, author: record.drafterName,
        kind: '기안서', status: '결재진행중', date: '', summary: record.summary, feedData: feedRecord,
      }}
      employeeId="emp-1" onActionComplete={vi.fn()} onEditDocument={vi.fn()}
    />);
    const toolbar = await screen.findByTestId('document-approval-toolbar');
    expect(
      within(toolbar).queryByRole('button', { name: /상신 취소|승인 취소/ }),
    ).toBeNull();
    fireEvent.click(within(toolbar).getByRole('button', { name: '문서 더보기' }));
    const menu = await screen.findByRole('menu');
    expect(
      within(menu).queryByRole('menuitem', { name: /상신 취소|승인 취소/ }),
    ).toBeNull();
  });

  it('shows a feed approval error when the direct approval request fails', async () => {
    mockPendingFeedForCurrentApprover();
    composerApi.processDocumentApprovalAction.mockRejectedValueOnce(
      new Error('승인 처리에 실패했습니다.'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const card = await screen.findByTestId('document-write-item');
    await clickDocumentMenuItem(card, '승인');

    expect(
      await within(card).findByText('승인 처리에 실패했습니다.'),
    ).toBeInTheDocument();
  });

  it('shows a retryable page error when feed employee identity cannot be loaded', async () => {
    mockPendingFeedForCurrentApprover();
    composerApi.fetchMyProfile.mockRejectedValueOnce(
      new Error('프로필 조회에 실패했습니다.'),
    ).mockResolvedValueOnce({
      userId: 'emp-1',
      employeeId: 'emp-1',
      name: '홍길동',
    });
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    expect(
      await screen.findByText('프로필 조회에 실패했습니다.'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: '사원 정보 다시 시도' }),
    ).toBeInTheDocument();
    expect(
      within(await screen.findByTestId('document-write-item')).queryByRole('button', {
        name: '승인',
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '사원 정보 다시 시도' }));
    expect(
      within(await screen.findByTestId('document-write-item')).getByRole(
        'button',
        { name: '문서 더보기' },
      ),
    ).toBeInTheDocument();
    const card = await screen.findByTestId('document-write-item');
    fireEvent.click(within(card).getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '승인' })).toBeInTheDocument();
    expect(composerApi.fetchMyProfile).toHaveBeenCalledTimes(2);
  });
});
