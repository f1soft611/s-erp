import {
  composerApi,
  composerNotifications,
  muiTheme,
  defaultDocumentRecords,
  toFeedRecord,
  mockPaginatedDocumentLists,
  pageProps,
  waitForComposerReady,
  setRestoreImagePreloader,
} from './documentWritePage.harness';
import { act, fireEvent, render, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { DocumentApprovalDetailFeed } from '../../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import type { DocumentApprovalFeedRecord } from '../../src/pages/groupware/documents/write/types/documentWrite.types';

describe('Document write page', () => {
  it('uses X removal actions for non-fixed approvals and agreement participants', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.change(agreementPicker, { target: { value: '박서준' } });
    fireEvent.click(await screen.findByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

    const removableApproval = screen.getByRole('group', {
      name: '결재 2 김민수',
    });
    const approvalRemoveButton = within(removableApproval).getByRole('button', {
      name: '결재 참여자 2 김민수 삭제',
    });
    const positionRow = within(removableApproval).getByTestId(
      'document-approval-position-row',
    );
    expect(positionRow).toContainElement(approvalRemoveButton);
    expect(
      within(approvalRemoveButton).getByTestId('approval-remove-icon'),
    ).toBeInTheDocument();

    const agreement = screen.getByRole('group', {
      name: '합의 3 박서준',
    });
    const agreementRemoveButton = within(agreement).getByRole('button', {
      name: '합의 참여자 3 박서준 삭제',
    });
    expect(
      within(agreementRemoveButton).getByTestId('agreement-remove-icon'),
    ).toBeInTheDocument();

    const fixedDrafter = screen.getByRole('group', {
      name: '결재 1 홍길동',
    });
    expect(
      within(fixedDrafter).queryByRole('button', { name: /삭제/ }),
    ).toBeNull();
  }, 15000);

  it('renders at the groupware write route instead of the coming-soon page', async () => {
    mockPaginatedDocumentLists();
    render(<DashboardContent {...pageProps} />);
    await screen.findByRole('region', { name: '리스트형 문서 목록' });

    expect(screen.getByTestId('document-write-page')).toHaveStyle({
      minWidth: '0px',
    });
    expect(
      screen.queryByText('요청하신 페이지는 현재 준비 중입니다'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /문서 작성/ }),
    ).toBeInTheDocument();
  });

  it('defaults to list mode and displays approval status and all document kinds', async () => {
    mockPaginatedDocumentLists();
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    await waitFor(() =>
      expect(within(listRegion).getByRole('button', { name: /^문서 A/ })).toBeInTheDocument(),
    );

    expect(
      screen.getByRole('button', { name: '리스트형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: '문서 제목 검색' }),
    ).not.toBeInTheDocument();
    expect(within(listRegion).getAllByTestId('list-item-row')).toHaveLength(6);
    expect(listRegion).toHaveTextContent('문서 A');
    const firstDocumentRow = within(listRegion).getByRole('button', {
      name: /^문서 A/,
    });
    const badgeLabels = Array.from(
      firstDocumentRow.closest('[data-testid="list-item-row"]')!.querySelectorAll('.MuiChip-root'),
      (chip) => chip.textContent,
    );
    expect(badgeLabels).toEqual(['결재진행중', '기안']);
    ['기안', '업무', '지출', '근태'].forEach((kind) => {
      expect(screen.getAllByText(kind).length).toBeGreaterThan(0);
    });
    expect(within(listRegion).getAllByText('결재진행중').length).toBeGreaterThan(0);
    expect(within(listRegion).getByText('승인')).toBeInTheDocument();
    expect(screen.getAllByText('보완요청').length).toBeGreaterThan(0);
  });

  it('shows only approval status and business category badges in list rows', async () => {
    composerApi.listDocumentApprovals.mockResolvedValue({
      resultList: defaultDocumentRecords.map((record) => ({ ...record, isDrafter: true })),
      totalRowCount: 6,
    });
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    const rows = within(list).getAllByTestId('list-item-row');
    expect(rows).toHaveLength(6);
    for (const row of rows) {
      expect(row.querySelectorAll('.MuiChip-root')).toHaveLength(2);
      expect(within(row).queryByRole('separator')).not.toBeInTheDocument();
      expect(within(row).queryByRole('button', { name: /상단 고정|문서 더보기/ }))
        .not.toBeInTheDocument();
      expect(within(row).getAllByRole('button')).toHaveLength(1);
    }
    expect(Array.from(rows[2]!.querySelectorAll('.MuiChip-root'), (chip) => chip.textContent))
      .toEqual(['임시저장', '기안']);
    expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument();
    expect(composerApi.getDocumentApprovalDetail).not.toHaveBeenCalled();
  });

  it('hides list actions regardless of authorship and opens details on selection', async () => {
    composerApi.listDocumentApprovals.mockResolvedValue({
      resultList: [
        { ...defaultDocumentRecords[2], isDrafter: false },
        { ...defaultDocumentRecords[3], isDrafter: true },
        { ...defaultDocumentRecords[2], electronicApprovalId: 99 },
      ],
      totalRowCount: 3,
    });
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    expect(within(list).queryByRole('button', { name: /문서 더보기|상단 고정/ })).toBeNull();
    fireEvent.click(within(list).getByRole('button', { name: /^문서 D/ }));
    await screen.findByTestId('approval-detail-card');
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledWith(4);
  });

  it('reports pin mutation failures after confirmation', async () => {
    mockPaginatedDocumentLists();
    composerApi.pinDocumentApproval.mockRejectedValueOnce(
      new Error('고정 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const pin = await screen.findByRole('button', {
      name: '상단 고정 문서 A',
    });

    fireEvent.click(pin);
    const dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));

    await waitFor(() =>
      expect(composerNotifications.showError).toHaveBeenCalledWith('고정 실패'),
    );
    expect(composerApi.pinDocumentApproval).toHaveBeenCalledTimes(1);
  }, 20000);

  it('does not offer direct unpinning in the pinned panel', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const panel = await screen.findByRole('region', { name: '상단 고정 문서' });
    expect(within(panel).getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: '상단 고정 해제 문서 A' }),
    ).not.toBeInTheDocument();
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
  });

  it('shows the pinned panel in feed mode and highlights the pinned card icon', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        Promise.resolve([includeDetails ? toFeedRecord(documentA) : documentA]),
    );
    render(<DashboardContent {...pageProps} />);
    await screen.findByRole('region', { name: '상단 고정 문서' });
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const feed = await screen.findByTestId('document-feed');
    const panel = screen.getByRole('region', { name: '상단 고정 문서' });
    expect(within(panel).getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(
      within(panel).queryByRole('button', { name: '상단 고정 해제 문서 A' }),
    ).not.toBeInTheDocument();
    const pinnedButton = within(feed).getByRole('button', {
      name: '상단 고정 해제 문서 A',
    });
    expect(within(pinnedButton).getByTestId('PushPinOutlinedIcon'))
      .toHaveClass('MuiSvgIcon-colorPrimary');
    const ordinaryButton = within(feed).getByRole('button', {
      name: '상단 고정 문서 B',
    });
    expect(within(ordinaryButton).getByTestId('PushPinOutlinedIcon'))
      .not.toHaveClass('MuiSvgIcon-colorPrimary');
  });

  it('keeps pinned documents in ordinary list rows without pin actions', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const list = await screen.findByRole('region', { name: '리스트형 문서 목록' });
    expect(within(list).getAllByTestId('list-item-row')).toHaveLength(6);
    expect(within(list).getByRole('button', { name: /^문서 A/ })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '상단 고정 문서' }))
      .getByRole('button', { name: '문서 A' })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: /상단 고정/ })).toBeNull();
    expect(composerApi.pinDocumentApproval).not.toHaveBeenCalled();
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
  }, 20000);

  it('requires confirmation before pinning a feed document', async () => {
    mockPaginatedDocumentLists();
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    const pin = await screen.findByRole('button', {
      name: '상단 고정 문서 A',
    });

    fireEvent.click(pin);
    let dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    expect(
      within(dialog).getByText('이 문서를 상단에 고정하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(composerApi.pinDocumentApproval).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);

    fireEvent.click(pin);
    dialog = await screen.findByRole('dialog', { name: '상단 고정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() =>
      expect(composerApi.pinDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.pinDocumentApproval).toHaveBeenCalledWith(1);
  }, 20000);

  it('reflects pinned state and confirms unpinning from its detail overlay', async () => {
    mockPaginatedDocumentLists();
    const documentA = defaultDocumentRecords[0];
    if (!documentA) throw new Error('Missing pinned document fixture.');
    composerApi.listPinnedDocumentApprovals.mockResolvedValue([documentA]);
    render(<DashboardContent {...pageProps} />);
    const pinnedRegion = await screen.findByRole('region', {
      name: '상단 고정 문서',
    });
    fireEvent.click(within(pinnedRegion).getByText('문서 A'));
    const overlay = await screen.findByTestId('page-area-overlay');
    const pin = await within(overlay).findByRole('button', {
      name: '상단 고정 해제 문서 A',
    });
    expect(within(pin).getByTestId('PushPinOutlinedIcon'))
      .toHaveClass('MuiSvgIcon-colorPrimary');

    fireEvent.click(pin);
    let dialog = await screen.findByRole('dialog', { name: '상단 고정 해제' });
    expect(
      within(dialog).getByText('이 문서의 상단 고정을 해제하시겠습니까?'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    expect(composerApi.unpinDocumentApproval).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);

    fireEvent.click(pin);
    dialog = await screen.findByRole('dialog', { name: '상단 고정 해제' });
    fireEvent.click(within(dialog).getByRole('button', { name: '확인' }));
    await waitFor(() =>
      expect(composerApi.unpinDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.unpinDocumentApproval).toHaveBeenCalledWith(1);
  }, 20000);

  it('shows a removable scope filter chip without leaving list mode', async () => {
    render(<DashboardContent {...pageProps} />);
    await screen.findByTestId('document-list');
    expect(
      screen.queryByRole('button', { name: '전체 조회' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'IN_PROGRESS',
        undefined,
        undefined,
        false,
        { offset: 0, limit: 20 },
      ),
    );

    expect(await screen.findByText('#결재 진행 중')).toBeInTheDocument();
    const scopeChip = screen.getByRole('button', {
      name: '결재 범위 필터 결재 진행 중 취소',
    });
    expect(
      screen.getAllByRole('button', {
        name: '결재 범위 필터 결재 진행 중 취소',
      }),
    ).toHaveLength(1);
    fireEvent.keyUp(scopeChip, { key: 'Delete' });
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        false,
        { offset: 0, limit: 20 },
      ),
    );
    expect(screen.queryByText('#결재 진행 중')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '리스트형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.queryByRole('button', { name: '전체 조회' }),
    ).not.toBeInTheDocument();
  }, 20000);

  it('business contact confirms tab changes after edits made during a pending save', async () => {
    let finishSave: ((value: { electronicApprovalId: number; documentStatus: string }) => void) | undefined;
    composerApi.saveDocumentDraft.mockImplementationOnce(() => new Promise((resolve) => {
      finishSave = resolve;
    }));
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 요청 제목' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('tab', { name: '기안서' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '아직 저장되지 않은 제목' },
    });
    await act(async () => finishSave?.({ electronicApprovalId: 77, documentStatus: 'DRAFT' }));
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(await screen.findByRole('dialog', { name: '문서 유형 변경' })).toBeInTheDocument();
  }, 20000);

  it('removes a scope filter chip without leaving feed mode', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    await screen.findByTestId('document-feed');

    fireEvent.click(screen.getByRole('button', { name: /결재 진행 중/ }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'IN_PROGRESS',
        undefined,
        undefined,
        true,
        { offset: 0, limit: 20 },
      ),
    );

    expect(await screen.findByText('#결재 진행 중')).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('button', {
          name: '결재 범위 필터 결재 진행 중 취소',
        }),
      ).getByTestId('filter-delete-icon-scope'),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        true,
        { offset: 0, limit: 20 },
      ),
    );
    expect(screen.getByTestId('document-feed')).toBeInTheDocument();
    expect(screen.queryByTestId('document-list')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '피드형 보기' }),
    ).toHaveAttribute('aria-pressed', 'true');
  }, 20000);

  it('shows and removes the selected document kind filter chip', async () => {
    render(<DashboardContent {...pageProps} />);
    await screen.findByTestId('document-list');

    fireEvent.click(
      screen.getByRole('button', { name: '문서 업무구분 필터' }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: '기안서' }));
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        'DRAFTING',
        undefined,
        false,
        { offset: 0, limit: 20 },
      ),
    );

    expect(await screen.findByText('#기안서')).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('button', {
          name: '업무구분 필터 기안서 취소',
        }),
      ).getByTestId('filter-delete-icon-kind'),
    );
    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'ALL',
        undefined,
        undefined,
        false,
        { offset: 0, limit: 20 },
      ),
    );
    expect(screen.queryByText('#기안서')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
  }, 20000);

  it('uses the view-specific skeleton while the document list is loading', () => {
    composerApi.listDocumentApprovals.mockReturnValue(
      new Promise(() => undefined),
    );
    render(<DashboardContent {...pageProps} />);

    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
      true,
      { offset: 0, limit: 20 },
    );
    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));
    expect(screen.getByTestId('list-view-skeleton')).toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
      false,
      { offset: 0, limit: 20 },
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('ignores a late feed response after switching back to the lightweight list', async () => {
    let resolveFeed!: (page: {
      resultList: DocumentApprovalFeedRecord[];
      totalRowCount: number;
    }) => void;
    composerApi.listDocumentApprovals.mockImplementation(
      (_scope, _documentType, _documentId, includeDetails) =>
        includeDetails
          ? new Promise((resolve) => {
              resolveFeed = resolve;
            })
          : Promise.resolve({
              resultList: defaultDocumentRecords,
              totalRowCount: defaultDocumentRecords.length,
            }),
    );
    render(<DashboardContent {...pageProps} />);

    await screen.findByRole('region', { name: '리스트형 문서 목록' });
    fireEvent.click(screen.getByRole('button', { name: '피드형 보기' }));
    expect(screen.getByTestId('feed-view-skeleton')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '리스트형 보기' }));

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    expect(within(listRegion).getByRole('button', { name: /문서 A/ })).toBeInTheDocument();

    await act(async () => {
      resolveFeed({
        resultList: defaultDocumentRecords.map((record) =>
          toFeedRecord(record, {
            contentsHtml: '<p>늦게 도착한 피드</p>',
          }),
        ),
        totalRowCount: defaultDocumentRecords.length,
      });
    });

    expect(screen.queryByTestId('document-feed')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-list')).toBeInTheDocument();
    expect(screen.queryByText('늦게 도착한 피드')).not.toBeInTheDocument();
    expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
      'ALL',
      undefined,
      undefined,
      false,
      { offset: 0, limit: 20 },
    );
  });

  it('centers shared loading while an approval detail is pending', async () => {
    let resolveDetail!: (detail: {
      electronicApprovalId: number;
      eabusNo: string;
      documentType: string;
      documentStatus: string;
      title: string;
      drafterName: string;
      draftingWorkCategoryId: null;
      contentsJson: string;
      contentsHtml: string;
      approvalLines: never[];
      attachments: never[];
      systemEvents: never[];
    }) => void;
    composerApi.getDocumentApprovalDetail.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDetail = resolve;
        }),
    );
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(
      await within(listRegion).findByRole('button', { name: /문서 A/ }),
    );

    expect(
      await screen.findByRole('status', { name: '문서 상세 불러오는 중' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel-content')).toHaveStyle({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });

    await act(async () => {
      resolveDetail({
        electronicApprovalId: 1,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml: '<p>로딩 완료 본문</p>',
        viewCount: 0,
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
    });

    expect(await screen.findByText('로딩 완료 본문')).toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: '문서 상세 불러오는 중' }),
    ).not.toBeInTheDocument();
  });

  it('loads related approval documents and opens their detail from the list', async () => {
    render(<DashboardContent {...pageProps} />);

    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    const documentButton = await within(listRegion).findByRole('button', {
      name: /문서 A/,
    });
    expect(composerApi.listDocumentApprovals).toHaveBeenCalledWith(
      'ALL',
      undefined,
      undefined,
      false,
      { offset: 0, limit: 20 },
    );
    fireEvent.click(documentButton);

    expect(await screen.findByTestId('page-area-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '문서 상세' })).not.toBeInTheDocument();
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(screen.getByTestId('approval-document-body')).toHaveTextContent('본문 내용'),
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }));
    await waitFor(() =>
      expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('region', { name: '리스트형 문서 목록' })).toBeInTheDocument();
    fireEvent.click(documentButton);
    await screen.findByTestId('post-detail-panel');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByTestId('page-area-overlay')).not.toBeInTheDocument(),
    );
  });

  it.each(['panel', 'feed'] as const)('renders profile images and existing fallbacks in the %s presentation', async (presentation) => {
    const detail = toFeedRecord(defaultDocumentRecords[0]!, {
      drafterProfileImage: 'data:image/png;base64,drafter',
      approvalLines: [
        {
          electronicApprovalLineId: 72,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'AGREEMENT',
          participantUserId: 'reviewer',
          participantName: '합의자',
          participantProfileImage: 'data:image/png;base64,reviewer',
          actionStatus: 'PENDING',
        },
        {
          electronicApprovalLineId: 73,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'reader',
          participantName: '참조자',
          participantProfileImage: null,
          actionStatus: 'WAITING',
        },
      ],
      comments: [{
        commentId: 1101,
        ownerId: 1,
        commentType: 'USER',
        writerId: 'commenter',
        writerName: '댓글 작성자',
        writerProfileImage: 'data:image/png;base64,commenter',
        content: '<p>프로필 댓글</p>',
      }],
      systemEvents: [{
        commentId: 1102, ownerId: 1, eventType: 'SUBMITTED',
        writerName: '시스템 처리자',
        writerProfileImage: 'data:image/png;base64,event-actor',
        content: '문서가 결재신청되었습니다.',
      }],
    });
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(detail);
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: detail.comments, systemEvents: detail.systemEvents, resultCnt: 2,
      hasPrevious: false, nextBeforeCommentId: null,
    });
    const sharedProps = {
      open: true, electronicApprovalId: 1, detailRefreshToken: 0,
      onActionComplete: vi.fn(), onEditDocument: vi.fn(),
    };
    render(presentation === 'panel'
      ? <DocumentApprovalDetailFeed {...sharedProps} onClose={vi.fn()} />
      : <DocumentApprovalDetailFeed {...sharedProps} presentation="feed"
          employeeId="emp-1"
          feedItem={{ id: 1, title: detail.title, author: detail.drafterName,
            kind: '기안서', status: '결재진행중', summary: '',
            date: '', feedData: detail }} />);

    expect(await screen.findByRole('img', { name: '김민수' }))
      .toHaveAttribute('src', 'data:image/png;base64,drafter');
    if (presentation === 'feed') {
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    }
    const agreement = screen.getByTestId('approval-line-agreement-avatar-72');
    fireEvent.error(within(agreement).getByRole('img', { name: '합의자' }));
    await waitFor(() => expect(agreement).toHaveTextContent('합'));
    expect(screen.getByTestId('approval-line-reference-avatar-73')).toHaveTextContent('참');
    expect(await screen.findByRole('img', { name: '댓글 작성자' }))
      .toHaveAttribute('src', 'data:image/png;base64,commenter');
    expect(await screen.findByRole('img', { name: '시스템 처리자' }))
      .toHaveAttribute('src', 'data:image/png;base64,event-actor');
    expect(screen.getByTestId('system-event-badge')).toHaveTextContent('결재신청');
    expect(screen.queryByRole('button', { name: '댓글 메뉴 시스템 처리자' }))
      .not.toBeInTheDocument();
  });

  it.each(['panel', 'feed'] as const)('formats legacy system reasons in the %s presentation', async (presentation) => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const events = [
      { commentId: 101, ownerId: 1, commentType: 'SYSTEM' as const, eventType: 'RETURNED',
        writerName: '결재자', content: '문서 보완이 요청되었습니다. 사유: 첫 줄\n둘째 줄' },
      { commentId: 102, ownerId: 1, commentType: 'SYSTEM' as const, eventType: 'REJECTED',
        writerName: '결재자', content: '문서가 반려되었습니다. 사유: 첫 줄\n둘째 줄' },
    ];
    const detail = toFeedRecord(record, { systemEvents: events });
    if (presentation === 'panel') {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(detail);
      composerApi.listApprovalComments.mockResolvedValueOnce({
        comments: [], systemEvents: events, resultCnt: 2,
        hasPrevious: false, nextBeforeCommentId: null,
      });
    }
    const sharedProps = {
      open: true, electronicApprovalId: 1, detailRefreshToken: 0,
      onActionComplete: vi.fn(), onEditDocument: vi.fn(),
    };
    render(presentation === 'panel'
      ? <DocumentApprovalDetailFeed {...sharedProps} onClose={vi.fn()} />
      : <DocumentApprovalDetailFeed {...sharedProps} presentation="feed"
          employeeId="emp-1"
          feedItem={{ id: 1, title: detail.title, author: detail.drafterName,
            kind: '기안서', status: '결재진행중', summary: '',
            date: '', feedData: detail }} />);
    for (const prefix of ['문서 보완이 요청되었습니다.', '문서가 반려되었습니다.']) {
      const message = await screen.findByText((_, el) =>
        el?.textContent === `${prefix}\n사유: 첫 줄\n둘째 줄`);
      expect(message).toHaveStyle({ whiteSpace: 'pre-wrap' });
    }
  }, 20000);

  it('opens approval comment image previews in the existing image viewer', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    const imageUrl = 'blob:approval-comment-image';
    vi.mocked(URL.createObjectURL).mockReturnValue(imageUrl);
    const detail = toFeedRecord(record, {
      comments: [
        {
          commentId: 1101,
          ownerId: 1,
          content: '<p>댓글 이미지</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [
            {
              fileId: 91,
              fileName: 'photo.png',
              fileSize: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
    });

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={1}
        detailRefreshToken={0}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        presentation="feed"
        employeeId="emp-1"
        feedItem={{
          id: 1,
          title: detail.title,
          author: detail.drafterName,
          kind: '기안서',
          status: '결재진행중',
          summary: '',
          date: '',
          feedData: detail,
        }}
      />,
    );

    const preview = await screen.findByRole('button', {
      name: '댓글 이미지 미리보기 1: photo.png',
    });
    fireEvent.click(preview);

    const viewer = screen.getByRole('dialog');
    expect(within(viewer).getByRole('img', { name: 'photo.png' })).toHaveAttribute(
      'src',
      imageUrl,
    );
    expect(composerApi.fetchApprovalCommentAttachmentBlob).toHaveBeenCalledWith(
      1,
      1101,
      91,
    );
  });

  it('reports approval comment image preview failures without hiding the file', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing document fixture.');
    composerApi.fetchApprovalCommentAttachmentBlob.mockRejectedValueOnce(
      new Error('image request failed'),
    );
    const detail = toFeedRecord(record, {
      comments: [
        {
          commentId: 1102,
          ownerId: 1,
          content: '<p>댓글 이미지</p>',
          commentType: 'USER',
          writerId: 'commenter',
          writerName: '댓글 작성자',
          attachments: [
            {
              fileId: 92,
              fileName: 'failed.png',
              fileSize: 123,
              mimeType: 'image/png',
            },
          ],
        },
      ],
    });

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={1}
        detailRefreshToken={0}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        presentation="feed"
        employeeId="emp-1"
        feedItem={{
          id: 1,
          title: detail.title,
          author: detail.drafterName,
          kind: '기안서',
          status: '결재진행중',
          summary: '',
          date: '',
          feedData: detail,
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이미지 미리보기를 불러오지 못했습니다.',
    );
    expect(screen.getByText('failed.png')).toBeInTheDocument();
  });

  it('shows rejection and revision reasons only in dismissible message popovers', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'REJECTED',
      title: '문서 A',
      drafterName: '김민수',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 81,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-1',
          participantName: '결재자',
          actionStatus: 'REJECTED',
          actionComment: '결재 내용을 확인해 주세요',
        },
        {
          electronicApprovalLineId: 82,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-2',
          participantName: '다른 결재자',
          actionStatus: 'REJECTED',
          actionComment: '첨부 내역을 확인해 주세요',
        },
        ...[null, '', '   '].map((actionComment, index) => ({
          electronicApprovalLineId: 83 + index,
          stageOrder: 3 + index,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: `empty-reviewer-${index}`,
          participantName: `사유 없는 결재자 ${index}`,
          actionStatus: 'REJECTED',
          actionComment,
        })),
        {
          electronicApprovalLineId: 86,
          stageOrder: 6,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'reviewer-3',
          participantName: '보완 결재자',
          actionStatus: 'RETURNED',
          actionComment: '보완 의견 첫 줄\n둘째 줄\n\n마지막 줄',
        },
        ...[null, '', '   '].map((actionComment, index) => ({
          electronicApprovalLineId: 87 + index,
          stageOrder: 7 + index,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: `empty-revision-${index}`,
          participantName: `사유 없는 보완자 ${index}`,
          actionStatus: 'RETURNED',
          actionComment,
        })),
        {
          electronicApprovalLineId: 90,
          stageOrder: 10,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approved-reviewer',
          participantName: '승인자',
          actionStatus: 'APPROVED',
          actionComment: '승인 의견 유지',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DocumentApprovalDetailFeed
      open electronicApprovalId={1} detailRefreshToken={0}
      onClose={vi.fn()} onActionComplete={vi.fn()} onEditDocument={vi.fn()}
    />);
    const group = await screen.findByTestId('approval-line-group-approval');
    const message = within(group).getByRole('button', {
      name: '결재자 반려 사유 보기', exact: true,
    });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('결재 내용을 확인해 주세요')).not.toBeInTheDocument();
    expect(group).not.toHaveTextContent('보완 의견 첫 줄');
    expect(group).toHaveTextContent('승인 의견 유지');
    const revisionSeal = screen.getByTestId('approval-line-status-seal-86');
    expect(revisionSeal.textContent).toBe('보완\n요청');
    expect(revisionSeal).toHaveStyle({ whiteSpace: 'pre-line', textAlign: 'center' });
    expect(revisionSeal).toHaveAccessibleName('결재 상태 보완요청');

    fireEvent.click(message);
    let popover = await screen.findByRole('dialog', { name: '반려 사유' });
    expect(popover).toHaveTextContent('결재 내용을 확인해 주세요');
    expect(popover).not.toHaveTextContent('첨부 내역을 확인해 주세요');
    fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '반려 사유' }))
      .not.toBeInTheDocument());
    expect(screen.getByTestId('post-detail-panel')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('button', {
      name: '다른 결재자 반려 사유 보기',
    }));
    popover = await screen.findByRole('dialog', { name: '반려 사유' });
    expect(popover).toHaveTextContent('첨부 내역을 확인해 주세요');
    const backdrop = popover.closest('.MuiPopover-root')?.querySelector('.MuiBackdrop-root');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '반려 사유' }))
      .not.toBeInTheDocument());
    fireEvent.click(within(group).getByRole('button', { name: '보완 결재자 보완요청 사유 보기' }));
    popover = await screen.findByRole('dialog', { name: '보완요청 사유' });
    const reason = within(popover).getByText((_, el) =>
      el?.textContent === '보완 의견 첫 줄\n둘째 줄\n\n마지막 줄');
    expect(reason).toHaveStyle({ whiteSpace: 'pre-wrap' });
    expect(popover).not.toHaveTextContent('결재 내용을 확인해 주세요');
    fireEvent.keyDown(popover, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '보완요청 사유' })).not.toBeInTheDocument());
  }, 20000);

  it('matches a pending approval seal to its participant border color', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'IN_PROGRESS',
      title: '문서 A',
      drafterName: '김민수',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 74,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-4',
          participantName: '결재자 D',
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
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    const currentParticipant = await screen.findByTestId('approval-line-participant-74');
    const currentSeal = screen.getByTestId('approval-line-status-seal-74');
    expect(currentParticipant).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
    });
    expect(currentSeal).toHaveStyle({
      borderColor: muiTheme.palette.info.main,
      color: muiTheme.palette.info.main,
    });
    expect(getComputedStyle(currentSeal).borderColor).toBe(
      getComputedStyle(currentParticipant).borderColor,
    );
  });

  it('renders read-only system events and keeps only the required detail separators', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '김민수',
      createdAt: '2026-10-12T09:00:00Z',
      updatedAt: '2026-10-15T11:00:00Z',
      submittedAt: null,
      viewCount: 7,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      approvalLines: [
        {
          electronicApprovalLineId: 71,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-1',
          participantName: '결재자 A',
          participantDepartmentName: '기획팀',
          actionStatus: 'WAITING',
        },
        {
          electronicApprovalLineId: 75,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-3',
          participantName: '결재자 C',
          participantDepartmentName: '운영팀',
          actionStatus: 'APPROVED',
          participantStampImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 74,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'approver-4',
          participantName: '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
          participantDepartmentName: '인사팀',
          actionStatus: 'PENDING',
          participantStampImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 72,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-2',
          participantName: '합의자 B',
          participantDepartmentName: null,
          actionStatus: 'PENDING',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 76,
          stageOrder: 2,
          participantOrder: 2,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-5',
          participantName: '합의자 D',
          participantDepartmentName: '재무팀',
          actionStatus: 'APPROVED',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 77,
          stageOrder: 2,
          participantOrder: 3,
          participantType: 'AGREEMENT',
          participantUserId: 'approver-6',
          participantName: '합의자 E',
          participantDepartmentName: '',
          actionStatus: 'APPROVED',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 73,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'approver-3',
          participantName: '참조자 C',
          participantDepartmentName: '운영팀',
          actionStatus: '',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
        {
          electronicApprovalLineId: 78,
          stageOrder: 3,
          participantOrder: 2,
          participantType: 'REFERENCE',
          participantUserId: 'approver-7',
          participantName: '참조자 공백부서',
          participantDepartmentName: '   ',
          actionStatus: '',
          participantProfileImage: 'data:image/png;base64,AA==',
        },
      ],
      attachments: [],
      systemEvents: [{
        eventType: 'SUBMITTED',
        content: '문서가 결재신청되었습니다.',
        writerName: '김민수',
        createdAt: '2026-10-12T09:00:00Z',
      }],
    });
    composerApi.listApprovalComments.mockResolvedValueOnce({
      comments: [{
        commentId: 31,
        ownerId: 1,
        parentCommentId: null,
        content: '<p>검토 의견입니다.</p>',
        commentType: 'USER',
        writerId: 'writer-1',
        writerName: '박서준',
        createdAt: '2026-10-12T10:00:00Z',
        attachments: [],
      }],
      systemEvents: [{
        commentId: 30,
        ownerId: 1,
        commentType: 'SYSTEM',
        eventType: 'SUBMITTED',
        content: '문서가 결재신청되었습니다.',
        writerName: '김민수',
        createdAt: '2026-10-12T09:00:00Z',
      }],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 2,
    });
    const imagePreloaders: HTMLImageElement[] = [];
    const imagePreloaderSpy = vi.spyOn(window, 'Image').mockImplementation(function MockImage(
      width,
      height,
    ) {
      const image = document.createElement('img');
      if (width !== undefined) image.width = width;
      if (height !== undefined) image.height = height;
      imagePreloaders.push(image);
      return image;
    });
    setRestoreImagePreloader(() => imagePreloaderSpy.mockRestore());
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    await waitFor(() => {
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('검토 의견입니다.');
      expect(screen.getByTestId('post-detail-panel')).toHaveTextContent('문서가 결재신청되었습니다.');
    });
    expect(screen.getByTestId('system-event-badge')).toHaveTextContent('결재신청');
    expect(screen.getByTestId('system-event-badge')).toHaveClass('MuiChip-colorInfo');
    expect(screen.queryByRole('img', { name: '시스템 메시지' })).not.toBeInTheDocument();
    const approvalLine = screen.getByTestId('approval-line-readonly');
    const authorRow = screen.getByTestId('approval-author-row');
    expect(authorRow).toBeInTheDocument();
    expect(within(authorRow).getByText('김민수')).toBeInTheDocument();
    expect(within(authorRow).getByText('결재진행중')).toBeInTheDocument();
    expect(within(authorRow).getByText('기안', { exact: true })).toBeInTheDocument();
    expect(screen.getByTestId('approval-author-meta')).toHaveTextContent(
      '기안자 · 2026.10.15 · 조회 7',
    );
    expect(
      getComputedStyle(screen.getByTestId('approval-author-meta')).whiteSpace,
    ).not.toBe('nowrap');
    expect(screen.getByTestId('approval-line-drafter-meta')).toHaveTextContent(
      '기안자 김민수 · 2026.10.15',
    );
    expect(screen.getByTestId('approval-line-header-title'))
      .toHaveClass('MuiTypography-body1');
    expect(screen.getByTestId('approval-line-drafter-meta'))
      .toHaveClass('MuiTypography-body1');
    expect(screen.getByTestId('approval-line-header')).toHaveTextContent('결재선');
    expect(
      within(screen.getByTestId('approval-line-header')).queryByText('결재', { exact: true }),
    ).not.toBeInTheDocument();
    expect(within(screen.getByTestId('approval-line-group-approval')).queryByRole('button'))
      .not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-group-approval')).toHaveTextContent('결재자 A');
    expect(screen.getByTestId('approval-line-group-agreement')).toHaveTextContent(
      '합의',
    );
    expect(
      within(screen.getByTestId('approval-line-group-agreement')).getAllByText('2', { exact: true }),
    ).toHaveLength(1);
    const agreementStage = screen.getByTestId('approval-line-agreement-stage-2');
    const agreementParticipants = within(agreementStage).getAllByTestId(
      /^approval-line-agreement-participant-/,
    );
    expect(agreementParticipants).toHaveLength(3);
    const agreementStageRow = screen.getByTestId('approval-line-agreement-stage-row-2');
    const agreementStageOrder = within(agreementStageRow).getByTestId(
      'approval-line-agreement-stage-order',
    );
    const agreementSequenceBadge = within(agreementStageRow).getByLabelText(
      /^합의 순번 /,
    );
    expect(agreementSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(agreementStageOrder.parentElement).toBe(agreementStageRow);
    expect(
      within(agreementStageRow).getByTestId('approval-line-agreement-participants').parentElement,
    ).toBe(agreementStageRow);
    expect(agreementParticipants.map((participant) => participant.textContent)).toEqual([
      expect.stringContaining('합의자 B'),
      expect.stringContaining('합의자 D'),
      expect.stringContaining('합의자 E'),
    ]);
    expect(agreementParticipants[0]).toHaveStyle({
      display: 'flex',
      borderRadius: '4px',
    });
    expect(agreementStage).toHaveTextContent('재무팀');
    expect(screen.getByTestId('approval-line-agreement-participant-76')
      .querySelectorAll('.MuiTypography-body1').length)
      .toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('approval-line-agreement-status-72')).toHaveTextContent('처리 중');
    expect(screen.getByTestId('approval-line-agreement-status-76')).toHaveTextContent('승인');
    expect(screen.getByTestId('approval-line-agreement-status-72'))
      .toHaveStyle({ borderRadius: '4px' });
    const agreementWithoutDepartment = screen.getByTestId(
      'approval-line-agreement-participant-72',
    );
    const agreementWithEmptyDepartment = screen.getByTestId(
      'approval-line-agreement-participant-77',
    );
    for (const [lineId, participant] of [
      ['72', agreementWithoutDepartment],
      ['77', agreementWithEmptyDepartment],
    ]) {
      const department = within(participant).getByTestId(
        `approval-line-agreement-department-${lineId}`,
      );
      const status = screen.getByTestId(`approval-line-agreement-status-${lineId}`);
      expect(department).toHaveTextContent('부서없음');
      expect(
        within(participant).getByText(/합의자 [BE]/).parentElement,
      ).not.toBe(department.parentElement);
      expect(department.parentElement).toBe(status.parentElement);
      expect(participant).toHaveStyle({ alignItems: 'center' });
    }
    expect(screen.getByTestId('approval-line-agreement-participants'))
      .toHaveStyle({ flexWrap: 'wrap' });
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent(
      '참조',
    );
    expect(
      within(screen.getByTestId('approval-line-group-reference'))
        .queryByTestId(/^approval-line-reference-sequence-/),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent('참조자 C');
    expect(screen.getByTestId('approval-line-group-reference')).toHaveTextContent('운영팀');
    const referenceParticipant = screen.getByTestId('approval-line-reference-participant-73');
    expect(
      within(referenceParticipant).getByTestId('approval-line-reference-department-73'),
    ).toHaveTextContent('운영팀');
    const referenceWithoutDepartment = screen.getByTestId(
      'approval-line-reference-participant-78',
    );
    expect(
      within(referenceWithoutDepartment).getByTestId(
        'approval-line-reference-department-78',
      ),
    ).toHaveTextContent('부서없음');
    expect(referenceWithoutDepartment).toHaveTextContent('참조자 공백부서');
    expect(
      within(referenceWithoutDepartment).getByTestId(
        'approval-line-reference-avatar-78',
      ),
    ).toBeInTheDocument();
    expect(referenceWithoutDepartment).toHaveStyle({ alignItems: 'center' });
    const participantCards = [
      screen.getByTestId('approval-line-agreement-participant-72'),
      screen.getByTestId('approval-line-reference-participant-73'),
    ];
    for (const card of participantCards) {
      expect(card).toHaveStyle({
        flex: '1 1 240px',
        minWidth: 'min(100%, 190px)',
        maxWidth: '100%',
        height: '56px',
        boxSizing: 'border-box',
        paddingTop: '6px',
        paddingBottom: '6px',
      });
    }
    expect(screen.getByTestId('approval-line-agreement-avatar-72'))
      .toHaveStyle({ width: '32px', height: '32px' });
    expect(screen.getByTestId('approval-line-reference-avatar-73'))
      .toHaveStyle({ width: '32px', height: '32px' });
    expect(
      within(screen.getByTestId('approval-line-participant-71')).getByTitle('결재자 A'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      within(screen.getByTestId('approval-line-agreement-participant-72')).getByTitle('합의자 B'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      within(screen.getByTestId('approval-line-reference-participant-73')).getByTitle('참조자 C'),
    ).toHaveStyle({ fontSize: '14px' });
    expect(
      screen.getByTestId('approval-line-agreement-department-72'),
    ).toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    expect(
      screen.getByTestId('approval-line-reference-department-73'),
    ).toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    expect(screen.getByTestId('approval-line-agreement-status-72'))
      .toHaveStyle({ fontSize: '14px', lineHeight: '18px' });
    const agreementLayoutGroup = screen.getByTestId('approval-line-group-agreement');
    const referenceLayoutGroup = screen.getByTestId('approval-line-group-reference');
    const agreementContent = within(agreementLayoutGroup).getByTestId(
      'approval-line-agreement-content',
    );
    const referenceContent = within(referenceLayoutGroup).getByTestId(
      'approval-line-reference-participants',
    );
    expect(agreementLayoutGroup.children).toHaveLength(2);
    expect(agreementLayoutGroup.children[0]).toHaveTextContent('합의');
    expect(agreementLayoutGroup.children[1]).toBe(agreementContent);
    expect(referenceLayoutGroup.children).toHaveLength(2);
    expect(referenceLayoutGroup.children[0]).toHaveTextContent('참조');
    expect(referenceLayoutGroup.children[1]).toBe(referenceContent);
    for (const row of [agreementLayoutGroup, referenceLayoutGroup]) {
      expect(row).toHaveStyle({
        display: 'grid',
        gridTemplateColumns: '64px minmax(0, 1fr)',
        minHeight: '72px',
      });
    }
    expect(screen.getByTestId('approval-line-group-agreement').querySelector('.MuiChip-root')).toBeNull();
    expect(screen.getByTestId('approval-line-group-reference').querySelector('.MuiChip-root')).toBeNull();
    const approvalParticipants = within(
      screen.getByTestId('approval-line-group-approval'),
    ).getAllByTestId(/^approval-line-participant-/);
    expect(approvalParticipants.map((participant) => participant.textContent)).toEqual([
      expect.stringContaining('결재자 A'),
      expect.stringContaining('결재자 D'),
      expect.stringContaining('결재자 C'),
    ]);
    expect(
      within(screen.getByTestId('approval-line-group-approval')).getAllByTestId(
        'approval-line-connector',
      ),
    ).toHaveLength(2);
    expect(screen.getByTestId('approval-line-participant-71')).toHaveAttribute(
      'data-status-tone',
      'neutral',
    );
    expect(screen.getByTestId('approval-line-participant-74')).toHaveAttribute(
      'data-status-tone',
      'primary',
    );
    expect(screen.getByTestId('approval-line-participant-74')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('approval-line-participant-75')).toHaveAttribute(
      'data-status-tone',
      'success',
    );
    expect(screen.getByTestId('approval-line-participant-75')).not.toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('approval-line-status-seal-71')).toHaveTextContent('대기');
    expect(screen.getByTestId('approval-line-status-seal-71')).toHaveAttribute(
      'data-status-tone',
      'neutral',
    );
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveTextContent('진행');
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveAttribute(
      'data-status-tone',
      'primary',
    );
    expect(screen.getByTestId('approval-line-status-seal-74')).toHaveAttribute(
      'aria-label',
      '결재 상태 처리 중',
    );
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveAttribute(
      'aria-label',
      '결재 상태 승인',
    );
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveAttribute(
      'data-status-tone',
      'success',
    );
    expect(screen.getByTestId('approval-line-status-seal-75').querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    expect(screen.getByTestId('approval-line-status-seal-74').querySelector('img'))
      .toBeNull();
    const agreementAvatar = screen.getByTestId('approval-line-agreement-avatar-72');
    expect(agreementAvatar.querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    const referenceAvatar = screen.getByTestId('approval-line-reference-avatar-73');
    expect(referenceAvatar.querySelector('img'))
      .toHaveAttribute('src', 'data:image/png;base64,AA==');
    await waitFor(() => {
      expect(imagePreloaders.length).toBeGreaterThan(0);
    });
    act(() => {
      imagePreloaders.forEach((image) => image.onerror?.(new Event('error')));
    });
    expect(screen.getByTestId('approval-line-status-seal-75')).toHaveTextContent('승인');
    expect(agreementAvatar.querySelector('img')).toBeNull();
    expect(agreementAvatar).toHaveTextContent('합');
    expect(referenceAvatar.querySelector('img')).toBeNull();
    expect(referenceAvatar).toHaveTextContent('참');
    const centeredStage = screen.getByTestId('approval-line-sequence-74');
    const approvalSequenceBadge = within(centeredStage).getByLabelText(
      /^결재선 순번 /,
    );
    expect(approvalSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(centeredStage).toHaveStyle({ justifyContent: 'center' });
    expect(within(centeredStage).getByText(
      '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
    )).toHaveAttribute(
      'title',
      '결재자 D 아주 긴 이름을 가운데 정렬하고 말줄임 처리해야 합니다',
    );
    expect(screen.getByTestId('approval-line-inner-divider')).toBeInTheDocument();
    expect(screen.queryByTestId('approval-line-chip-agreement-72')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approval-line-chip-reference-73')).not.toBeInTheDocument();
    expect(screen.getByTestId('approval-line-divider')).toBeInTheDocument();
    expect(approvalLine.nextElementSibling).toBe(
      screen.getByTestId('approval-line-divider'),
    );
    expect(screen.getByTestId('approval-line-participant-71')).toHaveStyle({
      gridTemplateRows: '32px 64px 32px',
    });
    expect(screen.getByTestId('feed-reaction-bar')).toBeInTheDocument();
    expect(screen.getByTestId('feed-comments-section')).toBeInTheDocument();
    const detailCard = screen.getByTestId('approval-detail-card');
    expect(
      within(detailCard)
        .getAllByRole('separator')
        .filter(
          (separator) =>
            !separator.closest('[data-testid="document-approval-toolbar"]'),
        ),
    ).toHaveLength(3);
    const footer = screen.getByTestId('approval-feed-footer');
    const reactionBar = screen.getByTestId('feed-reaction-bar');
    const commentsSection = screen.getByTestId('feed-comments-section');
    expect(reactionBar.parentElement).toBe(footer);
    expect(commentsSection.parentElement).toBe(footer);
    expect(parseFloat(getComputedStyle(reactionBar).marginTop)).toBe(0);
    expect(parseFloat(getComputedStyle(commentsSection).marginTop)).toBe(0);
    expect(
      reactionBar.nextElementSibling,
    ).toBe(commentsSection);
    expect(screen.queryByText('첨부파일', { exact: true })).not.toBeInTheDocument();
    expect(composerApi.listApprovalComments).toHaveBeenCalledWith(1, {
      limit: 3,
      beforeCommentId: undefined,
    });
  });

  it('shows the document number beneath the approval detail title', async () => {
    render(
      <ThemeProvider theme={muiTheme}>
        <DocumentApprovalDetailFeed
          open
          presentation="panel"
          electronicApprovalId={1}
          onActionComplete={() => undefined}
          onEditDocument={() => undefined}
          onClose={() => undefined}
          detailRefreshToken={0}
        />
      </ThemeProvider>,
    );

    expect(
      await screen.findByText('문서번호: EA-20261012-0001'),
    ).toBeInTheDocument();
  });

  it('opens approval detail with the body expanded', async () => {
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      documentNo: 'EA-20261012-0001',
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '김민수',
      draftingWorkCategoryId: null,
      viewCount: 0,
      summary: '짧은 요약',
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: `<p>${'긴 본문 내용입니다. '.repeat(100)}</p>`,
      approvalLines: [],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    const detailCard = await screen.findByTestId('approval-detail-card');
    expect(detailCard).toBeVisible();
    expect(screen.getByText('문서번호: EA-20261012-0001')).toBeInTheDocument();
    expect(detailCard).toHaveClass('MuiStack-root');
    const body = screen.getByTestId('approval-document-body');
    expect(body).toHaveAttribute('data-expanded', 'true');
    const collapseButton = screen.getByRole('button', { name: '접기' });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseButton);
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(body).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByTestId('approval-line-readonly')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '더보기' }));
    expect(screen.getByTestId('approval-line-readonly')).toBeInTheDocument();
  });

  it('hides the empty comment message while keeping the comment composer available', async () => {
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    expect(
      await screen.findByRole('textbox', { name: '댓글 입력' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('등록된 댓글이 없습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '등록' })).toBeInTheDocument();
  });

  it('lets the drafter cancel a pending submission after confirmation', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'PENDING',
      title: '문서 A',
      drafterName: '홍길동',
      isDrafter: true,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 11,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    expect(screen.queryByRole('button', { name: '승인 취소' })).not.toBeInTheDocument();
    await screen.findByTestId('approval-detail-card');
    composerApi.cancelDocumentSubmission.mockRejectedValueOnce(
      new Error('문서 상태가 변경되어 취소할 수 없습니다.'),
    );
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '상신 취소' }));
    expect(
      await screen.findByRole('dialog', { name: '결재신청 취소' }),
    ).toHaveTextContent('임시저장 상태로 되돌립니다.');
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: '결재신청 취소' }))
        .getByRole('button', { name: '상신 취소' }),
    );

    expect(
      await screen.findByText('문서 상태가 변경되어 취소할 수 없습니다.'),
    ).toBeInTheDocument();
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: '결재신청 취소' }))
        .getByRole('button', { name: '상신 취소' }),
    );
    await waitFor(() => {
      expect(composerApi.cancelDocumentSubmission).toHaveBeenCalledTimes(2);
    });
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '결재신청이 취소되었습니다.',
    );
  });

  it('lets an approver cancel their own approval only before a later stage acts', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'IN_PROGRESS',
      title: '문서 A',
      drafterName: '김민수',
      isDrafter: false,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 12,
          stageOrder: 2,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
        {
          electronicApprovalLineId: 13,
          stageOrder: 3,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-2',
          participantName: '김민수',
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
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

    await screen.findByTestId('approval-detail-card');
    fireEvent.click(screen.getByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '승인 취소' }));
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: '승인 취소' }))
        .getByRole('button', { name: '승인 취소' }),
    );

    await waitFor(() => {
      expect(composerApi.cancelDocumentApproval).toHaveBeenCalledWith(1);
    });
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '승인이 취소되었습니다.',
    );
  });

  it('does not offer approval cancellation after the final approval completes the document', async () => {
    mockPaginatedDocumentLists();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
      electronicApprovalId: 1,
      eabusNo: '001',
      documentType: 'DRAFTING',
      documentStatus: 'COMPLETED',
      title: '문서 A',
      drafterName: '김민수',
      isDrafter: false,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc","content":[]}',
      contentsHtml: '<p>본문 내용</p>',
      summary: '본문 내용',
      approvalLines: [
        {
          electronicApprovalLineId: 14,
          stageOrder: 4,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'APPROVED',
          actionAt: '2026-10-13T09:00:00Z',
        },
      ],
      attachments: [],
      systemEvents: [],
    });
    render(<DashboardContent {...pageProps} />);
    const listRegion = await screen.findByRole('region', {
      name: '리스트형 문서 목록',
    });
    fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));
    await screen.findByTestId('approval-detail-card');

    expect(screen.queryByRole('button', { name: '승인 취소' })).not.toBeInTheDocument();
  });

  it('shows embedded document images as clickable previews', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:approval-image-preview'),
      revokeObjectURL: vi.fn(),
    });
    try {
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce({
        electronicApprovalId: 1,
        eabusNo: '001',
        documentType: 'DRAFTING',
        documentStatus: 'PENDING',
        title: '문서 A',
        drafterName: '김민수',
        draftingWorkCategoryId: null,
        viewCount: 0,
        summary: '이미지 포함',
        contentsJson: '{"type":"doc","content":[]}',
        contentsHtml:
          '<p>이미지</p><img src="/api/v1/groupware/approvals/1/embedded-images/51" alt="영수증" />',
        approvalLines: [],
        attachments: [],
        systemEvents: [],
      });
      render(<DashboardContent {...pageProps} />);
      const listRegion = await screen.findByRole('region', {
        name: '리스트형 문서 목록',
      });
      fireEvent.click(await within(listRegion).findByRole('button', { name: /문서 A/ }));

      await waitFor(() =>
        expect(composerApi.fetchApprovalEmbeddedImageBlob).toHaveBeenCalledWith(1, 51),
      );
      const body = screen.getByTestId('approval-document-body');
      expect(body).toHaveAttribute('data-expanded', 'true');
      await waitFor(() =>
        expect(body.querySelector('img')).toHaveAttribute(
          'src',
          'blob:approval-image-preview',
        ),
      );
      expect(screen.queryByTestId('feed-body-image-previews')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '접기' }));
      const preview = await screen.findByRole('button', {
        name: '본문 이미지 미리보기 1: 영수증',
      });
      expect(preview.querySelector('img')).toHaveAttribute('alt', '영수증');
      expect(screen.queryByText(/\[본문 이미지/)).not.toBeInTheDocument();
      expect(screen.queryByText('본문 이미지', { exact: true })).not.toBeInTheDocument();
      fireEvent.click(preview);
      expect(await screen.findByRole('dialog', { name: '이미지 보기' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '이미지 뷰어 닫기' }));
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: '이미지 보기' })).not.toBeInTheDocument(),
      );
      fireEvent.click(screen.getByRole('button', { name: '더보기' }));
      await waitFor(() => {
        expect(screen.getByTestId('approval-document-body').querySelector('img')).toHaveAttribute(
          'src',
          'blob:approval-image-preview',
        );
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
