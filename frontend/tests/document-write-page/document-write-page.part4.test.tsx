import {
  composerApi,
  clickDocumentMenuItem,
  defaultDocumentRecords,
  toFeedRecord,
  clickComposerClose,
  toPage,
  mockPaginatedDocumentLists,
  mockPendingFeedForCurrentApprover,
  category,
  anotherCategory,
  composerUser,
  draftForm,
  draftFormTemplate,
  pageProps,
  waitForComposerReady,
} from './documentWritePage.harness';
import { act, fireEvent, render, renderHook, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { createAppTheme } from '../../src/theme/theme';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { useDocumentWritePage } from '../../src/pages/groupware/documents/write/hooks/useDocumentWritePage';

describe('Document write page', () => {
  it.each([
    {
      label: '반려',
      dialogTitle: '반려 사유',
      confirmLabel: '반려 확인',
      action: 'REJECTED',
      reason: '결재 내용 확인 필요',
    },
    {
      label: '보완요청',
      dialogTitle: '보완요청 사유',
      confirmLabel: '보완요청 확인',
      action: 'RETURNED',
      reason: '첨부 자료를 보완해 주세요',
    },
  ] as const)(
    'requires a reason before a feed reviewer submits $label',
    async ({ label, dialogTitle, confirmLabel, action, reason }) => {
      mockPendingFeedForCurrentApprover();
      render(<DashboardContent {...pageProps} />);
      fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

      const card = await screen.findByTestId('document-write-item');
      await clickDocumentMenuItem(card, label);

      const dialog = await screen.findByRole('dialog', { name: dialogTitle });
      expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        '반려 또는 보완요청 사유를 입력해 주세요.',
      );
      expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();

      fireEvent.change(within(dialog).getByRole('textbox', { name: '처리 사유' }), {
        target: { value: reason },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: confirmLabel }));

      await waitFor(() =>
        expect(composerApi.processDocumentApprovalAction).toHaveBeenCalledWith(1, {
          action,
          actionComment: reason,
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: dialogTitle })).not.toBeInTheDocument(),
      );
    },
  );

  it('does not offer deletion for a pending drafter document', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      isDrafter: true,
      title: '상신한 문서',
      drafterName: '홍길동',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 91,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-14T09:00:00Z',
        },
        {
          electronicApprovalLineId: 92,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'WAITING',
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
      await within(listRegion).findByRole('button', { name: /^문서 A/ }),
    );

    await screen.findByTestId('approval-detail-card');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '문서 공유하기' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '삭제' })).not.toBeInTheDocument();
  });

  it('keeps the document deletion menu available for a draft', async () => {
    mockPaginatedDocumentLists();
    const draftRecord = defaultDocumentRecords[2];
    if (!draftRecord) throw new Error('Missing draft document fixture.');
    composerApi.listDocumentApprovals.mockResolvedValueOnce({ resultList: [
      {
        ...draftRecord,
        title: '임시저장 문서',
        documentStatus: 'DRAFT',
      },
    ], totalRowCount: 1 });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 3,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'DRAFT',
      isDrafter: true,
      title: '임시저장 문서',
      drafterName: '홍길동',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '본문',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문</p>',
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /^임시저장 문서/ }),
    );

    fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '삭제' })).toBeInTheDocument();
  });

  it('keeps the notice-style owner menu, like toggle, and comments inside the feed card', async () => {
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve(
          { resultList: includeDetails
            ? defaultDocumentRecords.map((record) =>
                toFeedRecord(record, {
                  isDrafter: true,
                  documentStatus: 'DRAFT',
                  contentsHtml: '<p>본문</p>',
                }),
              )
            : defaultDocumentRecords,
            totalRowCount: defaultDocumentRecords.length,
          },
        ),
    );
    composerApi.createApprovalComment.mockResolvedValueOnce({
      commentId: 91,
      ownerId: 1,
      parentCommentId: null,
      content: '<p>피드 댓글</p>',
      commentType: 'USER',
      writerId: 'writer-1',
      writerName: '김민수',
      createdAt: '2026-10-12T10:00:00Z',
      attachments: [],
    }, 20000);
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const firstCard = (
      await within(await screen.findByTestId('document-feed')).findAllByTestId(
        'document-write-item',
      )
    )[0];
    if (!firstCard) throw new Error('No document feed cards were rendered.');

    const likeButton = await within(firstCard).findByRole('button', {
      name: '좋아요 0',
    });
    fireEvent.click(likeButton);
    expect(
      within(firstCard).getByRole('button', { name: '좋아요 취소 0' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const editor = await within(firstCard).findByRole('textbox', {
      name: '댓글 입력',
    });
    fireEvent.input(editor, {
      target: { innerHTML: '<p>피드 댓글</p>' },
    });
    fireEvent.click(within(firstCard).getByRole('button', { name: '등록' }));
    await waitFor(() =>
      expect(composerApi.createApprovalComment).toHaveBeenCalledWith(
        1,
        '<p>피드 댓글</p>',
        undefined,
        [],
        false,
      ),
    );
    expect(within(firstCard).getByText('피드 댓글')).toBeInTheDocument();

    fireEvent.click(
      within(firstCard).getByRole('button', { name: '문서 더보기' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '문서 수정' }));
    expect(
      await screen.findByRole('dialog', { name: '문서 작성' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();

    const closeButton = within(screen.getByRole('dialog', { name: '문서 작성' }))
      .getAllByRole('button', { name: '닫기' })
      .find((button) => button.textContent === '닫기');
    if (!closeButton) throw new Error('Missing composer close action.');
    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(3);
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        true,
        { offset: 0, limit: 20 },
      );
      expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
    });
    expect(screen.queryByTestId('document-feed-skeleton')).not.toBeInTheDocument();
  }, 20000);

  it('retries a failed atomic feed request without showing partial cards', async () => {
    let feedRequest = 0;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) => {
        if (!includeDetails) return Promise.resolve(toPage(defaultDocumentRecords));
        if (feedRequest++ === 0) {
          return Promise.reject(new Error('피드 목록 조회에 실패했습니다.'));
        }
        return Promise.resolve(toPage(
          defaultDocumentRecords.map((record) =>
            toFeedRecord(record, {
              contentsHtml: `<p>재시도한 본문 ${record.electronicApprovalId}</p>`,
            }),
          ),
        ));
      },
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    expect(screen.queryAllByTestId('document-write-item')).toHaveLength(0);
    fireEvent.click(
      screen.getByRole('button', { name: '전자결재 목록 다시 불러오기' }),
    );
    expect(await screen.findAllByTestId('document-write-item')).toHaveLength(6);
    expect(
      await screen.findByText('재시도한 본문 1'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
  }, 20000);

  it('clears feed cards when a filter reload fails after a quiet refresh', async () => {
    let feedRequest = 0;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) => {
        if (!includeDetails) return Promise.resolve(toPage(defaultDocumentRecords));
        feedRequest += 1;
        if (feedRequest === 3) {
          return Promise.reject(new Error('필터 적용 후 피드 조회에 실패했습니다.'));
        }
        return Promise.resolve(toPage(
          defaultDocumentRecords.map((record) => toFeedRecord(record)),
        ));
      },
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(await screen.findAllByTestId('document-write-item')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await screen.findByRole('dialog', { name: '문서 작성' });
    await waitForComposerReady();
    clickComposerClose();
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenCalledTimes(3),
    );

    fireEvent.click(
      screen.getByRole('button', { name: '문서 업무구분 필터' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '기안서' }));

    expect(
      await screen.findByText('필터 적용 후 피드 조회에 실패했습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('document-write-item')).toHaveLength(0);
  }, 20000);

  it('retains feed cards and displays the error when a quiet refresh fails', async () => {
    let feedRequest = 0;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) => {
        if (!includeDetails) return Promise.resolve(toPage(defaultDocumentRecords));
        if (++feedRequest === 2) {
          return Promise.reject(new Error('조용한 갱신에 실패했습니다.'));
        }
        return Promise.resolve(toPage(defaultDocumentRecords.map((record) => toFeedRecord(record))));
      },
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(await screen.findAllByTestId('document-write-item')).toHaveLength(6);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await screen.findByRole('dialog', { name: '문서 작성' });
    await waitForComposerReady();
    clickComposerClose();

    expect(await screen.findByText('조용한 갱신에 실패했습니다.')).toBeInTheDocument();
    expect(screen.getAllByTestId('document-write-item')).toHaveLength(6);
  }, 20000);

  it('clears prior results if a quiet refresh and filter change occur together', async () => {
    const { result } = renderHook(() => useDocumentWritePage());
    await waitFor(() => expect(result.current.listDocuments.length).toBeGreaterThan(0));
    composerApi.listDocumentApprovals.mockRejectedValueOnce(new Error('조회 실패'));

    act(() => {
      result.current.refresh({ quiet: true });
      result.current.setSelectedKind('기안서');
    });

    await waitFor(() => expect(result.current.loadError).toBe('조회 실패'));
    expect(result.current.listDocuments).toHaveLength(0);
    expect(result.current.pinnedDocuments).toHaveLength(0);
  });

  it('switches to feed mode and opens the document composer with available tabs', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByRole('button', { name: '피드형 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await screen.findByTestId('document-feed')).toBeInTheDocument();

    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '문서 상세' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    expect(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).toBeInTheDocument();
    await waitForComposerReady();
    expect(
      screen.getByTestId('document-composer-dialog-root'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '업무연락' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '지출결의서' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: '근태신청' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '제목' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: '본문' }).closest('.rich-text-editor-content'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '툴바 열기' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '첨부 링크' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '툴바 열기' }));
    expect(screen.getByRole('button', { name: '굵게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '표 삽입' })).toBeInTheDocument();
  }, 20000);

  it('uses the shared dark surface and theme-aware editor surface', async () => {
    render(
      <ThemeProvider theme={createAppTheme('dark')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const header = dialog.querySelector('.MuiDialogTitle-root')?.parentElement
      ?.parentElement;
    const content = dialog.querySelector('.MuiDialogContent-root');
    const footer = dialog.querySelector('.MuiDialogActions-root');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');

    [dialog, header, content, footer].forEach((region) => {
      expect(getComputedStyle(region as Element).backgroundColor).toBe(
        'rgb(30, 41, 59)',
      );
    });
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });
    const placeholder = editor.querySelector('p.is-editor-empty');

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(30, 41, 59)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe('rgb(30, 41, 59)');
    expect(getComputedStyle(editor).color).toBe('rgb(226, 232, 240)');
    expect(getComputedStyle(title).fontWeight).toBe('700');
    expect(getComputedStyle(editor).fontWeight).toBe('400');
    expect(placeholder).toBeInTheDocument();
  });

  it('keeps the editor surface white in the light theme', async () => {
    render(
      <ThemeProvider theme={createAppTheme('light')}>
        <DashboardContent {...pageProps} />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const title = screen.getByRole('textbox', { name: '제목' });

    expect(getComputedStyle(editorPanel).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).backgroundColor).toBe(
      'rgb(255, 255, 255)',
    );
    expect(getComputedStyle(editor).color).toBe('rgb(15, 23, 42)');
    // JSDOM computes this MUI font cascade as 400 despite the matching 700 rule.
    const titleFontRule = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules))
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .find((rule) =>
        !rule.selectorText.includes(':') &&
        rule.selectorText.includes('MuiInputBase-input') &&
        title.matches(rule.selectorText) &&
        rule.style.fontWeight === '700',
      );
    expect(titleFontRule).toBeDefined();
    expect(getComputedStyle(editor).fontWeight).toBe('400');
  });

  it('lets the dialog content scroll while the editor surface grows naturally', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    const composerLayout = screen.getByTestId('document-composer-layout');
    const editorPanel = screen.getByTestId('document-composer-editor-panel');
    const dialogContent = editor.closest('.MuiDialogContent-root');

    expect(composerLayout).toHaveStyle({
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '0',
    });
    expect(editorPanel).toHaveStyle({
      flexGrow: '1',
      flexShrink: '0',
      minHeight: '200px',
    });
    expect(editor).toHaveStyle({
      minHeight: '180px',
      maxHeight: 'none',
      flexShrink: '0',
    });
    expect(dialogContent).toHaveStyle({ overflowY: 'auto' });
  });

  it('keeps the editor whitespace even when a template starts with a margined block', async () => {
    composerApi.fetchDraftFormTemplate.mockResolvedValue({
      ...draftFormTemplate,
      templateJson: null,
      templateHtml:
        '<blockquote><p>첫 블록</p></blockquote><p>마지막 블록</p>',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));

    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('마지막 블록'));

    const firstBlock = editor.firstElementChild;
    const lastBlock = editor.lastElementChild;
    if (!firstBlock || !lastBlock) {
      throw new Error('Template blocks were not rendered in the editor.');
    }

    expect(getComputedStyle(editor).paddingTop).toBe(
      getComputedStyle(editor).paddingBottom,
    );
    expect(getComputedStyle(firstBlock).marginTop).toBe('0px');
    expect(getComputedStyle(lastBlock).marginBottom).toBe('0px');
  });

  it('shows read-only draft metadata and the default category and form fields', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const draftDate = await screen.findByRole('textbox', { name: '기안일' });
    const drafter = screen.getByRole('textbox', { name: '기안자' });
    expect(draftDate).toHaveValue();
    expect(draftDate.getAttribute('value')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(draftDate).toHaveAttribute('readonly');
    expect(draftDate.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(drafter).toHaveValue('기안자');
    expect(drafter).toHaveAttribute('readonly');
    const categorySelector = screen.getByRole('combobox', { name: '구분' });
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    expect(categorySelector).toHaveTextContent('전체');
    expect(categorySelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(formSelector).toBeInTheDocument();
    expect(formSelector.closest('.MuiInputBase-root')).toHaveStyle({
      minHeight: '38px',
    });
    expect(composerApi.fetchDraftFormOptions).toHaveBeenCalledOnce();
    expect(composerApi.fetchDraftForms).toHaveBeenCalledOnce();
    expect(composerApi.fetchMyProfile).toHaveBeenCalledOnce();
  });

  it('shows a visible error when initial draft lookup fails', async () => {
    composerApi.fetchDraftFormOptions.mockRejectedValue(
      new Error('기안 분류를 불러오지 못했습니다.'),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    const error = await screen.findByText('기안 분류를 불러오지 못했습니다.');
    expect(error).toBeInTheDocument();
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(screen.getByTestId('document-composer-layout').firstElementChild)
      .toHaveClass('MuiAlert-colorError');
    expect(
      screen.queryByRole('progressbar', { name: '문서 정보 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('shows a loading status while initial draft lookups are pending', async () => {
    composerApi.fetchDraftFormOptions.mockReturnValue(
      new Promise(() => undefined),
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    expect(
      await screen.findByRole('progressbar', {
        name: '문서 정보 불러오는 중',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '기안자' })).toBeNull();
    expect(screen.getByRole('tab', { name: '기안서' })).toBeDisabled();
    expect(
      screen.getByLabelText('첨부 파일 선택'),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: '결재선 설정' }),
    ).not.toBeInTheDocument();
  });

  it('shows an error when the profile has no drafter name and explicit empty states', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'writer',
      employeeId: 'writer',
      name: ' ',
    });
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [],
      cycleItems: [],
      users: [],
    });
    composerApi.fetchDraftForms.mockResolvedValue([]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: '기안자' }),
      ).toBeInTheDocument(),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 이름을 확인할 수 없습니다.',
    );
    expect(screen.getByText('등록된 분류가 없습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('선택 가능한 기안양식이 없습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('선택 가능한 사용자가 없습니다.'),
    ).not.toBeInTheDocument();
  });

  it('shows an error when the profile has no employee identity', async () => {
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: ' ',
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그인 사용자의 사원 ID를 확인할 수 없습니다.',
    );
    expect(screen.queryByTestId('document-approval-person')).toBeNull();
  });

  it('filters the selectable forms by active category and available body', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category, anotherCategory],
      cycleItems: [],
      users: [composerUser],
    });
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 분류 양식',
        categoryItemId: 102,
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 79,
        codeName: '사용 중지 양식',
        useAt: 'N',
      },
      {
        ...draftForm,
        draftingWorkCategoryId: 80,
        codeName: '본문 미등록 양식',
        hasDocument: false,
      },
    ]);
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '구분' }));
    fireEvent.click(await screen.findByRole('option', { name: '업무' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));

    expect(
      await screen.findByRole('option', { name: '정기점검' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '다른 분류 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '사용 중지 양식' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '본문 미등록 양식' }),
    ).not.toBeInTheDocument();
  });
});
