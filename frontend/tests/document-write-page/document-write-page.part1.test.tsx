import {
  composerApi,
  composerNotifications,
  approvalLineTemplateApi,
  muiTheme,
  category,
  composerUser,
  anotherComposerUser,
  thirdComposerUser,
  pageProps,
  waitForComposerReady,
  getPickerListbox,
  installApprovalResizeObserverMock,
} from './documentWritePage.harness';
import { fireEvent, render, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { DocumentComposerDialog } from '../../src/pages/groupware/documents/write/components/DocumentComposerDialog';

describe('Document write page', () => {
  it('opens the approval document requested by a notification', async () => {
    render(
      <DashboardContent
        {...pageProps}
        requestedApprovalId={29}
      />,
    );

    await waitFor(() => {
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledWith(29);
    });
    expect(await screen.findByTestId('approval-document-body'))
      .toHaveTextContent('본문 내용');
  });

  it('business contact always confirms unchanged tab switches in both directions', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    const header = confirmation.querySelector('.MuiDialogTitle-root')?.parentElement;
    expect(header).toHaveTextContent(
      '유형 변경 시 결재선과 참조자가 초기화됩니다.',
    );
    expect(header).not.toHaveTextContent(
      '다른 문서 유형으로 이동하시겠습니까?',
    );
    expect(confirmation.querySelector('.MuiDialogContent-root')).toHaveTextContent(
      '다른 문서 유형으로 이동하시겠습니까? 결재선과 참조자는 초기화되며, 제목과 본문은 유지됩니다.',
    );
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '기안서' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(await screen.findByRole('dialog', { name: '문서 유형 변경' })).toBeInTheDocument();
  }, 20000);

  it('business contact shares metadata and sends references without approvers', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '기안자' })).toHaveValue('기안자');
    expect(screen.getByRole('combobox', { name: '기안양식' })).toBeInTheDocument();
    expect(screen.queryByText('결재선')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재신청' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '공유할 업무' },
    });
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '발송' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(composerApi.saveDocumentDraft).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'BUSINESS_CONTACT', approvalLines: [] }), null,
    ));
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.change(picker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    composerApi.submitDocumentApproval.mockResolvedValueOnce({
      electronicApprovalId: 77, documentStatus: 'COMPLETED', eabusNo: '008',
    });
    fireEvent.click(screen.getByRole('button', { name: '발송' }));
    await waitFor(() => expect(composerApi.submitDocumentApproval).toHaveBeenCalledWith(
      77, expect.objectContaining({
        documentType: 'BUSINESS_CONTACT',
        approvalLines: [{
          stageOrder: 1, participantOrder: 1, participantType: 'REFERENCE',
          participantUserId: anotherComposerUser.userId,
        }],
      }),
    ));
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith('업무연락이 발송되었습니다.');
  }, 60000);

  it('loads reference favorites after cancelling drafting favorites and switching tabs', async () => {
    approvalLineTemplateApi.list.mockImplementation((code: string) =>
      Promise.resolve([
        {
          templateId: code === '001' ? 1 : 8,
          name: code === '001' ? '기안 즐겨찾기' : '업무 참조 즐겨찾기',
          eabusNo: code,
        },
      ]),
    );
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('button', { name: '결재선 설정' }));
    const approvalDialog = await screen.findByRole('dialog', {
      name: '결재선 설정',
    });
    const approvalSelect = within(approvalDialog).getByRole('combobox', {
      name: '자주 쓰는 결재선',
    });
    await waitFor(() => expect(approvalSelect).toBeEnabled());
    fireEvent.mouseDown(approvalSelect);
    expect(
      await screen.findByRole('option', { name: '기안 즐겨찾기' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('option', { name: '자주 쓰는 결재선 선택' }),
    );
    fireEvent.click(within(approvalDialog).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(approvalDialog);

    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', {
      name: '문서 유형 변경',
    });
    fireEvent.click(within(confirmation).getByRole('button', { name: '이동' }));
    await waitForElementToBeRemoved(confirmation);
    fireEvent.click(screen.getByRole('button', { name: '자주 쓰는 참조자' }));
    const referenceDialog = await screen.findByRole('dialog', {
      name: '참조자 설정',
    });
    const referenceSelect = within(referenceDialog).getByRole('combobox', {
      name: '자주 쓰는 참조자',
    });
    await waitFor(() => expect(referenceSelect).toBeEnabled());
    expect(approvalLineTemplateApi.list).toHaveBeenLastCalledWith('008');
    fireEvent.mouseDown(referenceSelect);
    expect(
      await screen.findByRole('option', { name: '업무 참조 즐겨찾기' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: '기안 즐겨찾기' }),
    ).not.toBeInTheDocument();
  }, 30000);

  it('business-contact reference settings button opens the reference-only dialog', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();

    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirmation = await screen.findByRole('dialog', {
      name: '문서 유형 변경',
    });
    fireEvent.click(
      within(confirmation).getByRole('button', { name: '이동' }),
    );
    await waitForElementToBeRemoved(confirmation);

    const referenceRow = screen.getByTestId('document-reference-row');
    const referenceInput = within(referenceRow).getByRole('combobox', {
      name: '참조자 선택',
    });
    const referenceControl = referenceInput.closest('.MuiInputBase-root');
    const referenceSettingsButton = within(referenceRow).getByRole('button', {
      name: '자주 쓰는 참조자',
    });
    expect(referenceControl).toHaveStyle({ height: '40px' });
    expect(referenceSettingsButton).toHaveStyle({
      height: '40px',
      minHeight: '40px',
    });
    fireEvent.click(
      referenceSettingsButton,
    );
    expect(
      await screen.findByTestId('document-approval-settings-dialog'),
    ).toBeInTheDocument();
  }, 30000);

  it('business contact tab confirmation preserves content and resets all participants only after moving', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '기안양식' }));
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('양식 본문'));
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '탭 이동 제목' },
    });
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.change(picker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    const approvalPicker = screen.getByRole('combobox', { name: '결재선 2 사용자 선택' });
    fireEvent.change(approvalPicker, { target: { value: '박서준' } });
    fireEvent.click(within(getPickerListbox(approvalPicker)).getByRole('option', { name: /박서준/ }));
    fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));
    const nextApprovalPicker = screen.getByRole('combobox', { name: '결재선 3 사용자 선택' });
    fireEvent.change(nextApprovalPicker, {
      target: { value: '이수진' },
    });
    fireEvent.click(within(getPickerListbox(nextApprovalPicker)).getByRole('option', { name: /이수진/ }));
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    const confirm = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirm).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirm);
    expect(screen.getByRole('tab', { name: '기안서' })).toHaveAttribute('aria-selected', 'true');
    expect(picker.closest('.MuiAutocomplete-root')).toHaveTextContent('김민수');
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' }))
      .not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('탭 이동 제목');
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('양식 본문');
    expect(screen.getByRole('combobox', { name: '기안양식' })).toHaveTextContent('정기점검');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .not.toHaveTextContent('김민수');
    expect(screen.queryByTestId('document-approval-fields')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '결재 추가' })).toBeDisabled();
    expect(screen.queryByTestId('document-agreement-person')).not.toBeInTheDocument();
    expect(composerApi.fetchDraftFormTemplate).toHaveBeenCalledTimes(1);
  }, 60000);

  it('business contact restores a draft with no drafter approval line', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} initialDocument={{
      electronicApprovalId: 77,
      documentType: 'BUSINESS_CONTACT',
      documentStatus: 'DRAFT',
      title: '저장한 업무연락',
      drafterName: '기안자',
      isDrafter: true,
      viewCount: 0,
      draftingWorkCategoryId: null,
      contentsJson: '{"type":"doc"}',
      contentsHtml: '<p>보존한 본문</p>',
      approvalLines: [{
        electronicApprovalLineId: 1, stageOrder: 1, participantOrder: 1,
        participantType: 'REFERENCE', participantUserId: anotherComposerUser.userId,
        participantName: anotherComposerUser.userNm, actionStatus: '',
      }],
      attachments: [],
      systemEvents: [],
    }} />);
    await waitForComposerReady();
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('저장된 결재선에서 기안자를 확인할 수 없습니다.')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('보존한 본문');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent(anotherComposerUser.userNm);
    expect(screen.getByRole('button', { name: '발송' })).toBeEnabled();
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent(anotherComposerUser.userNm);
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getAllByTestId('document-approval-person')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue('저장한 업무연락');
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('보존한 본문');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .not.toHaveTextContent(anotherComposerUser.userNm);
  });

  it('business contact detects body-only edits and keeps attachments through tab changes', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    const body = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(body, { clipboardData: {
      getData: (type: string) => type === 'text/plain' ? '직접 작성한 본문' : '',
      files: [],
      items: [],
    } });
    await waitFor(() => expect(body).toHaveTextContent('직접 작성한 본문'));
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [new File(['test'], 'contact.txt', { type: 'text/plain' })] },
    });
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent('직접 작성한 본문');
    expect(screen.getByText('contact.txt')).toBeInTheDocument();
  });

  it('business contact reports dispatch failures and always confirms tab changes after saving', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.click(screen.getByRole('tab', { name: '업무연락' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '문서 유형 변경' }))
      .getByRole('button', { name: '이동' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '문서 유형 변경' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '발송 실패 검증' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '참조자 선택' }), {
      target: { value: '김민수' },
    });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    composerApi.submitDocumentApproval.mockRejectedValueOnce(new Error('발송 실패'));
    fireEvent.click(screen.getByRole('button', { name: '발송' }));
    expect(await screen.findByText('발송 실패')).toBeInTheDocument();
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(composerNotifications.showSuccess).toHaveBeenCalledWith('문서가 임시저장되었습니다.'));
    await waitFor(() => expect(screen.getByRole('tab', { name: '기안서' })).toBeEnabled());
    fireEvent.click(screen.getByRole('tab', { name: '기안서' }));
    const confirmation = await screen.findByRole('dialog', { name: '문서 유형 변경' });
    fireEvent.click(within(confirmation).getByRole('button', { name: '취소' }));
    await waitForElementToBeRemoved(confirmation);
    expect(screen.getByRole('tab', { name: '업무연락' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: '참조자 선택' }).closest('.MuiAutocomplete-root'))
      .toHaveTextContent('김민수');
  }, 20000);

  it('does not emit an SSR-unsafe first-child selector warning', async () => {
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    try {
      render(<DashboardContent {...pageProps} />);

      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const consoleCalls = [...errorSpy.mock.calls, ...warnSpy.mock.calls];
      expect(
        consoleCalls.some((call) =>
          call.some((argument) =>
            String(argument).includes(
              'pseudo class ":first-child" is potentially unsafe',
            ),
          ),
        ),
      ).toBe(false);
    } finally {
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 15000);

  it('adds the signed-in user as a non-removable first approver', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 홍길동');
    const approverName = within(firstApprover).getByText('홍길동');
    const approvalSequenceBadge = within(firstApprover).getByLabelText(
      '참여 순번 1',
    );
    expect(approvalSequenceBadge).toHaveStyle({
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
    });
    expect(approverName).not.toHaveStyle({ maxWidth: '3em' });
    expect(approverName.parentElement).toHaveStyle({
      display: 'flex',
      justifyContent: 'center',
    });
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: '결재선 2 사용자 선택' }),
    ).toBeInTheDocument();
  });

  it('uses profile details as the fixed first approver when absent from selectable users', async () => {
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [anotherComposerUser, thirdComposerUser],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'emp-profile-only',
      employeeId: 'emp-profile-only',
      name: '기안자',
      departmentName: '기획팀',
      levelName: '팀장',
      profileImage: '/users/profile-only.png',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));

    const firstApprover = await screen.findByRole('group', {
      name: '결재 1 기안자',
    });
    expect(firstApprover).toHaveTextContent('팀장');
    expect(firstApprover).toHaveTextContent('기안자');
    expect(
      within(firstApprover).queryByRole('button', { name: /삭제/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('로그인 사용자를 결재선 사용자 목록에서 찾을 수 없습니다.'),
    ).not.toBeInTheDocument();
  }, 15000);

  it('uses employee identity to exclude the drafter while retaining same-name users', async () => {
    const sameNameUser = {
      ...composerUser,
      userId: 'emp-same-name',
      departmentNm: '회계팀',
      userNm: '기안자',
    };
    composerApi.fetchDraftFormOptions.mockResolvedValue({
      categoryGroup: null,
      categoryItems: [category],
      cycleItems: [],
      users: [
        {
          ...composerUser,
          userId: ` ${composerUser.userId} `,
          userNm: '기안자',
        },
        sameNameUser,
        anotherComposerUser,
        thirdComposerUser,
      ],
    });
    composerApi.fetchMyProfile.mockResolvedValue({
      userId: 'login-code-1',
      employeeId: composerUser.userId,
      name: '기안자',
    });
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const firstApprover = screen.getByTestId('document-approval-person');
    expect(firstApprover).toHaveAttribute('aria-label', '결재 1 기안자');

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(approvalPicker);
    const approvalListbox = getPickerListbox(approvalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(approvalPicker, { key: 'Escape' });

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /기안자.*기획팀/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const agreementPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.click(agreementPicker);
    const agreementListbox = getPickerListbox(agreementPicker);
    expect(
      within(agreementListbox).queryByRole('option', {
        name: /기안자.*기획팀/,
      }),
    ).toBeNull();
    expect(
      within(agreementListbox).getByRole('option', { name: /기안자.*회계팀/ }),
    ).toBeInTheDocument();
  }, 15000);

  it('prevents the same user from being assigned to approval and reference', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    fireEvent.click(referencePicker);
    const referenceListbox = getPickerListbox(referencePicker);
    expect(
      within(referenceListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(referenceListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
    fireEvent.keyDown(referencePicker, { key: 'Escape' });

    const nextApprovalPicker = screen.getByRole('combobox', {
      name: '결재선 3 사용자 선택',
    });
    fireEvent.click(nextApprovalPicker);
    const approvalListbox = getPickerListbox(nextApprovalPicker);
    expect(
      within(approvalListbox).queryByRole('option', { name: /홍길동/ }),
    ).toBeNull();
    expect(
      within(approvalListbox).queryByRole('option', { name: /김민수/ }),
    ).toBeNull();
  }, 15000);

  it('keeps an actively selected approval user out of reference candidates', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const approvalPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));

    fireEvent.click(screen.getByRole('combobox', { name: '참조자 선택' }));
    const referencePicker = screen.getByRole('combobox', {
      name: '참조자 선택',
    });
    expect(
      within(getPickerListbox(referencePicker)).queryByRole('option', {
        name: /김민수/,
      }),
    ).toBeNull();
  });

  it('shows a complete dashed empty approval and hides the pending agreement seal', async () => {
    installApprovalResizeObserverMock();
    const rendered = render(<DashboardContent {...pageProps} />);

    try {
      fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
      await waitForComposerReady();

      const emptySlot = screen.getAllByTestId('document-empty-approval-slot')[0];
      expect(within(emptySlot).getByLabelText('직위/직함 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('직위/직함')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재 도장 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('도장')).not.toBeInTheDocument();
      expect(within(emptySlot).getByLabelText('결재자 이름 자리')).toBeInTheDocument();
      expect(within(emptySlot).queryByText('이름')).not.toBeInTheDocument();
      expect(emptySlot).toHaveStyle({
        borderStyle: 'dashed',
        borderColor: muiTheme.palette.divider,
      });
      expect(emptySlot.querySelector('[aria-label*="순번"]')).toBeNull();
      expect(emptySlot.querySelector('button')).toBeNull();

      const approvalPicker = screen.getByRole('combobox', {
        name: '결재선 2 사용자 선택',
      });
      fireEvent.change(approvalPicker, { target: { value: '김민수' } });
      fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
      fireEvent.click(screen.getByRole('button', { name: '합의 추가' }));

      const agreement = screen.getByTestId('document-agreement-chip');
      expect(within(agreement).queryByLabelText('합의 도장 자리')).toBeNull();
      const fields = screen.getByTestId('document-approval-fields');
      const children = Array.from(fields.children);
      const approvalRowIndex = children.indexOf(
        screen.getByTestId('document-approval-display-row'),
      );
      const agreementRowIndex = children.indexOf(
        screen.getByTestId('document-agreement-display-row'),
      );
      expect(
        children
          .slice(approvalRowIndex + 1, agreementRowIndex)
          .some((child) => child.classList.contains('MuiDivider-root')),
      ).toBe(false);
    } finally {
      rendered.unmount();
      vi.unstubAllGlobals();
    }
  });

  it('shares one sequence across an agreement stage without numbering participants individually', async () => {
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const addUsers = async (
      selectorNumber: number,
      names: string[],
      actionLabel: '결재 추가' | '합의 추가',
    ) => {
      const picker = screen.getByRole('combobox', {
        name: `결재선 ${selectorNumber} 사용자 선택`,
      });
      for (const name of names) {
        fireEvent.change(picker, { target: { value: name } });
        fireEvent.click(
          await screen.findByRole('option', { name: new RegExp(name) }),
        );
      }
      fireEvent.click(screen.getByRole('button', { name: actionLabel }));
    };

    await addUsers(2, ['김민수', '박서준'], '합의 추가');
    await addUsers(3, ['이수진'], '결재 추가');
    await addUsers(4, ['최민호'], '결재 추가');

    const approvalPeople = screen.getAllByTestId('document-approval-person');
    const agreementChips = screen.getAllByTestId('document-agreement-chip');
    expect(approvalPeople.map((person) => person.getAttribute('aria-label'))).toEqual([
      '결재 1 홍길동',
      '결재 3 이수진',
      '결재 4 최민호',
    ]);
    expect(agreementChips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
      '합의 2 김민수',
      '합의 2 박서준',
    ]);
  }, 15000);
});
