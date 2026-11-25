import {
  composerApi,
  composerNotifications,
  clickDocumentMenuItem,
  defaultDocumentRecords,
  toFeedRecord,
  clickComposerClose,
  mockPaginatedDocumentLists,
  draftForm,
  draftFormTemplate,
  pageProps,
  waitForComposerReady,
  getPickerListbox,
} from './documentWritePage.harness';
import { act, fireEvent, render, renderHook, screen, within, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardContent } from '../../src/pages/dashboard/components/DashboardContent';
import { DocumentApprovalDetailFeed } from '../../src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed';
import { DocumentComposerDialog } from '../../src/pages/groupware/documents/write/components/DocumentComposerDialog';
import type { DocumentApprovalDetail, DocumentApprovalFeedRecord } from '../../src/pages/groupware/documents/write/types/documentWrite.types';
import { useDocumentWritePage } from '../../src/pages/groupware/documents/write/hooks/useDocumentWritePage';
import { getApprovalSystemEventPresentation, parseDocumentApprovalScope } from '../../src/pages/groupware/documents/write/data/documentPresentation';

describe('Document write page', () => {
  it('confirms replacing an edited template and preserves content when cancelled', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));

    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));
    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '취소' }));

    expect(formSelector).toHaveTextContent('정기점검');
    expect(editor).toHaveTextContent('작성자 수정 본문');
    expect(composerApi.fetchDraftFormTemplate).toHaveBeenCalledTimes(1);
  });

  it('replaces the edited body after confirming a different template', async () => {
    composerApi.fetchDraftForms.mockResolvedValue([
      draftForm,
      {
        ...draftForm,
        draftingWorkCategoryId: 78,
        codeName: '다른 양식',
        categoryItemId: 102,
      },
    ]);
    composerApi.fetchDraftFormTemplate.mockImplementation(
      async (formId: number) =>
        formId === 77
          ? draftFormTemplate
          : {
              ...draftFormTemplate,
              draftingWorkCategoryId: 78,
              codeName: '다른 양식',
              templateJson: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', text: '새 양식 본문' },
                    ],
                  },
                ],
              },
              templateHtml: '<p>새 양식 본문</p>',
            },
    );
    render(<DashboardContent {...pageProps} />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const formSelector = screen.getByRole('combobox', { name: '기안양식' });
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '정기점검' }));
    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() => expect(editor).toHaveTextContent('양식 본문'));

    fireEvent.input(editor, {
      target: { innerHTML: '<p>작성자 수정 본문</p>' },
    });
    await waitFor(() => expect(editor).toHaveTextContent('작성자 수정 본문'));
    fireEvent.mouseDown(formSelector);
    fireEvent.click(await screen.findByRole('option', { name: '다른 양식' }));

    const replacementDialog = screen.getByRole('dialog', {
      name: '작성 중인 본문 교체',
    });
    fireEvent.click(within(replacementDialog).getByRole('button', { name: '교체' }));

    await waitFor(() => expect(editor).toHaveTextContent('새 양식 본문'));
    expect(formSelector).toHaveTextContent('다른 양식');
  });

  it('clears the compose title when the dialog closes and reopens', async () => {
    function ComposerSession() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>문서 작성</button>
          <DocumentComposerDialog open={open} onClose={() => setOpen(false)} />
        </>
      );
    }

    render(<ComposerSession />);

    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const approvalPicker = screen.getByLabelText('결재선 2 사용자 선택', { selector: 'input' });
    fireEvent.change(approvalPicker, { target: { value: '김민수' } });
    fireEvent.click(
      await waitFor(() =>
        within(getPickerListbox(approvalPicker)).getByRole('option', { name: /김민수/ }),
      ),
    );
    fireEvent.click(
      within(screen.getByTestId('document-approval-input-row'))
        .getByRole('button', { name: '결재 추가' }),
    );
    fireEvent.keyDown(
      screen.getByLabelText('결재선 3 사용자 선택', { selector: 'input' }),
      { key: 'Escape' },
    );
    const referencePicker = screen.getByLabelText('참조자 선택', { selector: 'input' });
    fireEvent.change(referencePicker, { target: { value: '박서준' } });
    fireEvent.click(
      await waitFor(() =>
        within(getPickerListbox(referencePicker)).getByRole('option', { name: /박서준/ }),
      ),
    );
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '작성 중 제목' },
    });
    expect(screen.getByLabelText('제목')).toHaveValue(
      '작성 중 제목',
    );

    fireEvent.click(
      within(screen.getByRole('dialog', { name: '문서 작성' }))
        .getByText('닫기', { selector: 'button' }),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();

    expect(screen.getByLabelText('제목')).toHaveValue('');
    expect(screen.getByTestId('document-approval-person')).toHaveAttribute(
      'aria-label',
      '결재 1 홍길동',
    );
    expect(screen.queryByTestId('document-reference-list')).not.toBeInTheDocument();
    expect(
      screen
        .getByLabelText('참조자 선택', { selector: 'input' })
        .closest('.MuiAutocomplete-root'),
    ).not.toHaveTextContent(/박서준/);
  }, 10000);

  it('saves the document payload and reuses its ID on subsequent saves', async () => {
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '초안 제목' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(1),
    );
    const firstRequest = composerApi.saveDocumentDraft.mock.calls[0][0];
    expect(composerApi.saveDocumentDraft.mock.calls[0][1]).toBeNull();
    expect(firstRequest).toMatchObject({
      documentType: 'DRAFTING',
      draftingWorkCategoryId: null,
      title: '초안 제목',
      approvalLines: [
        expect.objectContaining({
          stageOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
        }),
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(2),
    );
    expect(composerApi.saveDocumentDraft.mock.calls[1][1]).toBe(77);
    await waitFor(() =>
      expect(composerNotifications.showSuccess).toHaveBeenCalledTimes(2),
    );
    expect(composerNotifications.showSuccess).toHaveBeenNthCalledWith(
      2,
      '문서가 임시저장되었습니다.',
    );
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    expect(dialog.querySelector('[role="alert"]')).toBeNull();
    const titleHeader = dialog.querySelector('.MuiDialogTitle-root')?.parentElement;
    expect(titleHeader).toHaveTextContent('임시저장 문서 ID: 77');
    expect(dialog.querySelector('.MuiDialogContent-root')).not.toHaveTextContent(
      '임시저장 문서 ID: 77',
    );
  });

  it('saves the latest draft before submitting and closes after submission succeeds', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '상신할 문서' },
    });
    const approverPicker = screen.getByRole('combobox', {
      name: '결재선 2 사용자 선택',
    });
    fireEvent.change(approverPicker, { target: { value: '김민수' } });
    fireEvent.click(await screen.findByRole('option', { name: /김민수/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 추가' }));

    fireEvent.click(screen.getByRole('button', { name: '결재신청' }));

    await waitFor(() =>
      expect(composerApi.submitDocumentApproval).toHaveBeenCalledTimes(1),
    );
    expect(composerApi.saveDocumentDraft).toHaveBeenCalledTimes(1);
    expect(composerApi.submitDocumentApproval).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        title: '상신할 문서',
        approvalLines: [
          expect.objectContaining({
            stageOrder: 1,
            participantType: 'APPROVAL',
            participantUserId: 'emp-1',
          }),
          expect.objectContaining({
            stageOrder: 2,
            participantType: 'APPROVAL',
            participantUserId: 'emp-2',
          }),
        ],
      }),
    );
    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
      '문서가 결재신청되었습니다.',
    );
  }, 15000);

  it('uploads pasted images and includes editor image metadata in the draft request', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '이미지 초안' },
    });
    const editor = screen.getByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });

    await waitFor(() =>
      expect(composerApi.uploadDocumentDraftEmbeddedImage).toHaveBeenCalledWith(file),
    );
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/approval-preview',
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(composerApi.saveDocumentDraft).toHaveBeenCalledOnce(),
    );

    const request = composerApi.saveDocumentDraft.mock.calls[0][0];
    expect(request.contentsHtml).toContain('data-upload-token="approval-image-token"');
    expect(JSON.stringify(request.contentsJson)).toContain('"data-upload-token":"approval-image-token"');
    expect(request).toMatchObject({
      embeddedImages: [
        expect.objectContaining({
          uploadToken: 'approval-image-token',
          fileName: 'pasted.png',
          imageUrl: 'https://minio.example/approval-preview',
          objectKey: 'tenant/1/embedded-image-temp/approval-image-token/pasted.png',
          fileSize: 8,
          mimeType: 'image/png',
        }),
      ],
      temporaryImages: [
        {
          uploadToken: 'approval-image-token',
          fileName: 'pasted.png',
        },
      ],
    });
    expect(composerApi.deleteDocumentDraftEmbeddedImage).not.toHaveBeenCalled();
  });

  it('prevents saving while a pasted image upload is pending and reports upload failures', async () => {
    let resolveUpload!: (value: {
      src: string;
      alt: string;
      fileName: string;
      uploadToken: string;
      fileSize: number;
      mimeType: string;
      objectKey: string;
    }) => void;
    composerApi.uploadDocumentDraftEmbeddedImage.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '업로드 대기 초안' },
    });
    const editor = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['png'], 'pending.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '이미지 업로드 중...' })).toBeDisabled(),
    );
    expect(composerApi.saveDocumentDraft).not.toHaveBeenCalled();
    resolveUpload({
      src: 'https://minio.example/pending-preview',
      alt: 'pending.png',
      fileName: 'pending.png',
      uploadToken: 'pending-token',
      fileSize: 3,
      mimeType: 'image/png',
      objectKey: 'tenant/1/embedded-image-temp/pending-token/pending.png',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '저장' })).toBeEnabled(),
    );

    composerApi.uploadDocumentDraftEmbeddedImage.mockRejectedValueOnce(
      new Error('upload failed'),
    );
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['bad'], 'failed.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '본문 이미지 업로드에 실패했습니다.',
    );
    expect(editor.querySelector('img')).not.toBeInTheDocument();
  });

  it('deletes temporary pasted images when the composer is closed without saving', async () => {
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const editor = screen.getByRole('textbox', { name: '본문' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => new File(['png'], 'pasted.png', { type: 'image/png' }),
          },
        ],
        getData: () => '',
      },
    });
    await waitFor(() =>
      expect(editor.querySelector('img')).toHaveAttribute(
        'src',
        'https://minio.example/approval-preview',
      ),
    );

    clickComposerClose();

    await waitForElementToBeRemoved(() =>
      screen.queryByRole('dialog', { name: '문서 작성' }),
    );
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftEmbeddedImage).toHaveBeenCalledWith(
        'approval-image-token',
        'pasted.png',
      ),
    );
  });

  it('keeps failed attachments and retries them individually', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockRejectedValueOnce(new Error('definite failure'))
      .mockResolvedValueOnce({
        fileId: 502,
        fileName: 'evidence.txt',
        fileSize: 8,
      });
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 포함 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const failedRow = await screen.findByTestId(
      'document-composer-attachment-failed',
    );
    expect(
      within(failedRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('실패');
    expect(within(failedRow).queryByText('definite failure')).not.toBeInTheDocument();
    const partialUploadAlert = screen
      .getByRole('dialog', { name: '문서 작성' })
      .querySelector('.MuiDialogContent-root [role="alert"]');
    expect(partialUploadAlert).toHaveClass('MuiAlert-colorError');
    expect(partialUploadAlert).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '재시도' }));
    await waitFor(() =>
      expect(
        screen.getByTestId('document-composer-attachment-uploaded'),
      ).toBeInTheDocument(),
    );
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(2);
    const uploadedRow = screen.getByTestId(
      'document-composer-attachment-uploaded',
    );
    expect(
      within(uploadedRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('완료');
    expect(within(uploadedRow).queryByText('업로드 완료')).not.toBeInTheDocument();
  });

  it('keeps retry failures in the composer error area', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockRejectedValueOnce(new Error('definite failure'))
      .mockRejectedValueOnce(new Error('definite failure'));
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 재시도 실패 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByTestId('document-composer-attachment-failed'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재시도' }));
    await waitFor(() =>
      expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(2),
    );

    const error = screen
      .getByRole('dialog', { name: '문서 작성' })
      .querySelector('.MuiDialogContent-root [role="alert"]');
    expect(error).toHaveClass('MuiAlert-colorError');
    expect(error).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
  });

  it('keeps attachment deletion failures in the composer error area', async () => {
    composerApi.deleteDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('첨부 삭제 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const composer = within(dialog);
    fireEvent.change(composer.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 삭제 실패 초안' },
    });
    fireEvent.change(composer.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [new File(['evidence'], 'evidence.txt', { type: 'text/plain' })],
      },
    });
    fireEvent.click(composer.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(
        composer.getByTestId('document-composer-attachment-uploaded'),
      ).toBeInTheDocument(),
    );

    fireEvent.click(composer.getByRole('button', { name: '첨부 파일 삭제' }));
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftAttachment).toHaveBeenCalledTimes(1),
    );

    const error = await composer.findByRole('alert');
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(error).toHaveTextContent('첨부 삭제 실패');
    expect(error).toHaveClass('MuiAlert-colorError');
  });

  it('keeps unresolved attachment errors after deleting a confirmed file', async () => {
    composerApi.uploadDocumentDraftAttachment
      .mockResolvedValueOnce({
        fileId: 504,
        fileName: 'confirmed.txt',
        fileSize: 9,
      })
      .mockRejectedValueOnce(new Error('definite failure'));
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 부분 실패 후 삭제 초안' },
    });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [
          new File(['evidence1'], 'confirmed.txt', { type: 'text/plain' }),
          new File(['evidence2'], 'failed.txt', { type: 'text/plain' }),
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const uploadedAttachment = await screen.findByTestId(
      'document-composer-attachment-uploaded',
    );
    await screen.findByTestId('document-composer-attachment-failed');
    fireEvent.click(
      within(uploadedAttachment).getByRole('button', {
        name: '첨부 파일 삭제',
      }),
    );
    await waitFor(() =>
      expect(composerApi.deleteDocumentDraftAttachment).toHaveBeenCalledTimes(1),
    );

    expect(
      screen
        .getByRole('dialog', { name: '문서 작성' })
        .querySelector('.MuiDialogContent-root [role="alert"]'),
    ).toHaveTextContent(
      '문서는 저장되었지만 첨부파일 1건의 상태 확인이 필요합니다.',
    );
  });

  it('keeps save failures in the composer error area without a success toast', async () => {
    composerApi.saveDocumentDraft.mockRejectedValueOnce(
      new Error('문서 저장 실패'),
    );
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '저장 실패 초안' },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    const error = await screen.findByText('문서 저장 실패');
    expect(error.closest('.MuiDialogContent-root')).not.toBeNull();
    expect(error.closest('.MuiAlert-root')).toHaveClass(
      'MuiAlert-colorError',
    );
    expect(screen.getByRole('textbox', { name: '제목' })).toHaveValue(
      '저장 실패 초안',
    );
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
  });

  it('marks an ambiguous upload as unknown and does not retry it automatically', async () => {
    composerApi.uploadDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('network disconnected'),
    );
    render(<DocumentComposerDialog open onClose={vi.fn()} />);
    await waitForComposerReady();
    fireEvent.change(screen.getByRole('textbox', { name: '제목' }), {
      target: { value: '네트워크 확인 초안' },
    });
    const file = new File(['evidence'], 'evidence.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('첨부 파일 선택'), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(
      await screen.findByRole('button', { name: '상태 확인' }),
    ).toBeInTheDocument();
    const unknownRow = screen.getByTestId(
      'document-composer-attachment-unknown',
    );
    expect(
      within(unknownRow).getByTestId('document-composer-attachment-status'),
    ).toHaveTextContent('확인 필요');
    expect(
      within(unknownRow).queryByText('업로드 결과 확인 필요'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '재시도' }),
    ).not.toBeInTheDocument();
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '상태 확인' }));
    const error = await within(
      screen.getByRole('dialog', { name: '문서 작성' }),
    ).findByRole('alert');
    expect(error).toHaveTextContent(
      '파일 목록에서 업로드 여부를 확인하지 못했습니다.',
    );
    expect(error).toHaveClass('MuiAlert-colorError');
    expect(error).toHaveTextContent(
      '파일 목록에서 업로드 여부를 확인하지 못했습니다.',
    );
    expect(composerApi.uploadDocumentDraftAttachment).toHaveBeenCalledTimes(1);
  });

  it('shows a success toast when an ambiguous attachment is confirmed', async () => {
    composerApi.uploadDocumentDraftAttachment.mockRejectedValueOnce(
      new Error('network disconnected'),
    );
    composerApi.listDocumentDraftAttachments.mockResolvedValueOnce([
      { fileId: 503, fileName: 'evidence.txt', fileSize: 8 },
    ]);
    render(<DashboardContent {...pageProps} />);
    fireEvent.click(screen.getByRole('button', { name: /문서 작성/ }));
    await waitForComposerReady();
    const dialog = screen.getByRole('dialog', { name: '문서 작성' });
    const composer = within(dialog);
    fireEvent.change(composer.getByRole('textbox', { name: '제목' }), {
      target: { value: '첨부 확인 초안' },
    });
    fireEvent.change(composer.getByLabelText('첨부 파일 선택'), {
      target: {
        files: [new File(['evidence'], 'evidence.txt', { type: 'text/plain' })],
      },
    });
    fireEvent.click(composer.getByRole('button', { name: '저장' }));
    fireEvent.click(await composer.findByRole('button', { name: '상태 확인' }));

    await waitFor(() =>
      expect(composerNotifications.showSuccess).toHaveBeenCalledWith(
        '첨부파일 업로드가 확인되었습니다.',
      ),
    );
    expect(
      composer.getByTestId('document-composer-attachment-uploaded'),
    ).toBeInTheDocument();
    expect(
      dialog.querySelector('.MuiDialogContent-root [role="alert"]'),
    ).toBeNull();
  });

  it('parses and selects reference-confirmation scope and exposes its pending count', async () => {
    expect(parseDocumentApprovalScope('MY_REFERENCE_PENDING')).toBe(
      'MY_REFERENCE_PENDING',
    );
    expect(parseDocumentApprovalScope('MY_PENDING')).toBe('MY_PENDING');

    mockPaginatedDocumentLists();
    const { result } = renderHook(() => useDocumentWritePage());
    act(() => result.current.selectScope('MY_REFERENCE_PENDING'));

    await waitFor(() =>
      expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
        'MY_REFERENCE_PENDING',
        undefined,
        undefined,
        false,
        { offset: 0, limit: 20 },
      ),
    );
    await waitFor(() =>
      expect(result.current.referenceConfirmationRequiredCount).toBe(2),
    );
  });

  it('presents reference confirmation with the completed success badge', () => {
    expect(getApprovalSystemEventPresentation('REFERENCE_CONFIRMED')).toEqual({
      label: '참조 확인',
      color: 'success',
      variant: 'filled',
    });
  });

  it('parses final-confirmation scope and refreshes its separate count and list', async () => {
      expect(parseDocumentApprovalScope('MY_FINAL_CONFIRMATION_PENDING')).toBe('MY_FINAL_CONFIRMATION_PENDING');
      mockPaginatedDocumentLists();
      const { result } = renderHook(() => useDocumentWritePage());
      act(() => result.current.selectScope('MY_FINAL_CONFIRMATION_PENDING'));
      await waitFor(() => {
        expect(composerApi.listDocumentApprovals).toHaveBeenLastCalledWith(
          'MY_FINAL_CONFIRMATION_PENDING', undefined, undefined, false, { offset: 0, limit: 20 },
        );
        expect(result.current.finalConfirmationRequiredCount).toBe(1);
        expect(result.current.referenceConfirmationRequiredCount).toBe(2);
      });
      const previousListCalls = composerApi.listDocumentApprovals.mock.calls.length;
      const previousSummaryCalls = composerApi.getDocumentApprovalSummary.mock.calls.length;
      composerApi.getDocumentApprovalSummary.mockResolvedValue({
        ...result.current.summary, finalConfirmationRequiredCount: 0, finalConfirmationItems: [],
      });
      act(() => result.current.refresh());
      await waitFor(() => {
        expect(result.current.finalConfirmationRequiredCount).toBe(0);
        expect(composerApi.listDocumentApprovals.mock.calls.length).toBe(previousListCalls + 1);
        expect(composerApi.getDocumentApprovalSummary.mock.calls.length).toBe(previousSummaryCalls + 1);
      });
    });

    it('excludes the internal final-confirmation row when restoring the editable approval line', async () => {
      const record = defaultDocumentRecords[0]!;
      render(<DocumentComposerDialog open onClose={vi.fn()} initialDocument={toFeedRecord(record, {
        documentStatus: 'REVISION_REQUESTED', isDrafter: true,
        approvalLines: [
          { electronicApprovalLineId: 1, stageOrder: 1, participantOrder: 1, participantType: 'APPROVAL',
            participantUserId: 'emp-1', participantName: '홍길동', actionStatus: 'APPROVED' },
          { electronicApprovalLineId: 2, stageOrder: 2, participantOrder: 1, participantType: 'APPROVAL',
            participantUserId: 'emp-2', participantName: '김민수', actionStatus: 'RETURNED' },
          { electronicApprovalLineId: 3, stageOrder: 3, participantOrder: 1, participantType: 'FINAL_CONFIRMATION',
            participantUserId: 'emp-1', participantName: '홍길동', actionStatus: 'WAITING' },
        ],
      })} />);
      await screen.findByRole('textbox', { name: '기안자' });
      await act(async () => {
        fireEvent.click(await screen.findByRole('button', { name: '결재선 설정' }));
      });
      const settings = screen.getByRole('dialog', { name: '결재선 설정' });
      expect(within(settings).queryByRole('group', { name: '결재 3 홍길동' })).not.toBeInTheDocument();
      expect(within(settings).getByRole('group', { name: '결재 2 김민수' })).toBeInTheDocument();
    });

  it('presents reference additions in the existing system timeline style', () => {
    expect(getApprovalSystemEventPresentation('REFERENCE_ADDED')).toEqual({
      label: '참조자 추가',
      color: 'info',
      variant: 'outlined',
    });
  });

  it('adds selected references from the detail menu and refreshes the system timeline', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    const existingReference = {
      electronicApprovalLineId: 121,
      stageOrder: 1,
      participantOrder: 1,
      participantType: 'REFERENCE' as const,
      participantUserId: 'emp-2',
      participantName: '기존 참조자',
      actionStatus: 'WAITING',
    };
    const initialDetail = toFeedRecord(record, {
      approvalLines: [existingReference],
    });
    const refreshedDetail = toFeedRecord(record, {
      approvalLines: [
        existingReference,
        {
          ...existingReference,
          electronicApprovalLineId: 122,
          participantOrder: 2,
          participantUserId: 'emp-3',
          participantName: '새 참조자 A',
        },
        {
          ...existingReference,
          electronicApprovalLineId: 123,
          participantOrder: 3,
          participantUserId: 'emp-4',
          participantName: '새 참조자 B',
        },
      ],
    });
    let resolveDetailRefresh!: (value: DocumentApprovalDetail) => void;
    composerApi.getDocumentApprovalDetail.mockReset()
      .mockResolvedValueOnce(initialDetail)
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveDetailRefresh = resolve;
      }));
    composerApi.fetchDraftFormUsers.mockResolvedValue([
      {
        userId: 'emp-2',
        loginId: 2,
        userNm: '기존 참조자',
        departmentNm: '기획팀',
        profileImage: null,
        levelNm: null,
      },
      {
        userId: 'emp-3',
        loginId: 3,
        userNm: '새 참조자 A',
        departmentNm: '운영팀',
        profileImage: null,
        levelNm: null,
      },
      {
        userId: 'emp-4',
        loginId: 4,
        userNm: '새 참조자 B',
        departmentNm: '관리팀',
        profileImage: null,
        levelNm: null,
      },
    ]);
    let additionSaved = false;
    const systemEvent = {
      commentId: 150,
      ownerId: record.electronicApprovalId,
      commentType: 'SYSTEM' as const,
      eventType: 'REFERENCE_ADDED',
      content: '작성자님이 참조자(새 참조자 A, 새 참조자 B)를 추가했습니다.',
      writerName: '작성자',
    };
    composerApi.addDocumentReferences.mockImplementationOnce(async () => {
      additionSaved = true;
      return { electronicApprovalId: record.electronicApprovalId, addedCount: 2 };
    });
    composerApi.listApprovalComments.mockReset().mockImplementation(async () => ({
      comments: [],
      systemEvents: additionSaved ? [systemEvent] : [],
      hasPrevious: false,
      nextBeforeCommentId: null,
      resultCnt: 0,
    }));
    const onActionComplete = vi.fn();

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={onActionComplete}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    await screen.findByRole('heading', { name: '문서 상세' });
    fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '참조자 추가하기' }));
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.mouseDown(picker);
    expect(screen.queryByRole('option', { name: /기존 참조자/ })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자 A/ }));
    fireEvent.mouseDown(picker);
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자 B/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '참조자 추가', exact: true })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '참조자 추가', exact: true }));

    await waitFor(() => {
      expect(composerApi.addDocumentReferences).toHaveBeenCalledWith(
        record.electronicApprovalId,
        ['emp-3', 'emp-4'],
      );
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2);
      expect(onActionComplete).toHaveBeenCalledOnce();
    });
    expect(screen.getByTestId('post-detail-panel-content')).not.toHaveAttribute('role', 'status');
    expect(screen.getByText(record.title)).toBeInTheDocument();
    await act(async () => resolveDetailRefresh(refreshedDetail));
    expect(await screen.findByText(systemEvent.content)).toBeInTheDocument();
    expect(composerNotifications.showSuccess).toHaveBeenCalledWith('참조자를 추가했습니다.');
  });

  it('keeps reference selection visible and reports an add failure without refreshing', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset().mockResolvedValueOnce(
      toFeedRecord(record, { approvalLines: [] }),
    );
    composerApi.fetchDraftFormUsers.mockResolvedValue([{
      userId: 'emp-3',
      loginId: 3,
      userNm: '새 참조자 A',
      departmentNm: '운영팀',
      profileImage: null,
      levelNm: null,
    }]);
    composerApi.addDocumentReferences.mockRejectedValueOnce(
      new Error('참조자 추가 요청에 실패했습니다.'),
    );
    const onActionComplete = vi.fn();

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={onActionComplete}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    await screen.findByRole('heading', { name: '문서 상세' });
    fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '참조자 추가하기' }));
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.mouseDown(picker);
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자 A/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '참조자 추가', exact: true })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: '참조자 추가', exact: true }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '참조자 추가 요청에 실패했습니다.',
    );
    expect(screen.getByRole('dialog', { name: '참조자 추가' })).toBeInTheDocument();
    expect(screen.getByText('새 참조자 A')).toBeInTheDocument();
    expect(composerApi.addDocumentReferences).toHaveBeenCalledWith(
      record.electronicApprovalId,
      ['emp-3'],
    );
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledOnce();
    expect(onActionComplete).not.toHaveBeenCalled();
  });

  it('does not report success or refresh when every selected reference was already added', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset().mockResolvedValueOnce(
      toFeedRecord(record, { approvalLines: [] }),
    );
    composerApi.fetchDraftFormUsers.mockResolvedValue([{
      userId: 'emp-3',
      loginId: 3,
      userNm: '새 참조자 A',
      departmentNm: '운영팀',
      profileImage: null,
      levelNm: null,
    }]);
    composerApi.addDocumentReferences.mockResolvedValueOnce({
      electronicApprovalId: record.electronicApprovalId,
      addedCount: 0,
    });
    const onActionComplete = vi.fn();

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={onActionComplete}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    await screen.findByRole('heading', { name: '문서 상세' });
    fireEvent.click(await screen.findByRole('button', { name: '문서 더보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '참조자 추가하기' }));
    const picker = screen.getByRole('combobox', { name: '참조자 선택' });
    fireEvent.mouseDown(picker);
    fireEvent.click(await screen.findByRole('option', { name: /새 참조자 A/ }));
    fireEvent.click(screen.getByRole('button', { name: '참조자 추가', exact: true }));

    expect(await screen.findByText('선택한 사용자는 이미 문서에 참여하고 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '참조자 추가' })).toBeInTheDocument();
    expect(composerNotifications.showSuccess).not.toHaveBeenCalled();
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledOnce();
    expect(onActionComplete).not.toHaveBeenCalled();
  });

  it.each(['COMPLETED', 'REJECTED'] as const)(
    'confirms the drafter final line on a %s document without normal approval actions',
    async (documentStatus) => {
      const record = defaultDocumentRecords[0]!;
      const line = {
        electronicApprovalLineId: 151, stageOrder: 6, participantOrder: 1,
        participantType: 'FINAL_CONFIRMATION' as const,
        participantUserId: 'emp-1', participantName: '내부 최종확인 참여자',
        actionStatus: 'PENDING',
      };
      composerApi.getDocumentApprovalDetail.mockReset()
        .mockResolvedValueOnce(toFeedRecord(record, { documentStatus, isDrafter: true, approvalLines: [line] }))
        .mockResolvedValueOnce(toFeedRecord(record, {
          documentStatus, isDrafter: true, approvalLines: [{ ...line, actionStatus: 'CONFIRMED' }],
        }));
      let finish!: () => void;
      composerApi.confirmDocumentFinalConfirmation.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
      composerApi.listApprovalComments.mockResolvedValue({
        comments: [], systemEvents: [], hasPrevious: false, nextBeforeCommentId: null, resultCnt: 0,
      });
      const onActionComplete = vi.fn();
      render(<DocumentApprovalDetailFeed open electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()} onActionComplete={onActionComplete} onEditDocument={vi.fn()} detailRefreshToken={0} />);
      const approvalCard = await screen.findByTestId('approval-detail-card');
      fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
      const menu = await screen.findByRole('menu');
      const item = within(menu).getByRole('menuitem', { name: '최종확인', exact: true });
      expect(within(menu).queryByRole('menuitem', { name: '승인', exact: true })).not.toBeInTheDocument();
      expect(within(menu).queryByRole('menuitem', { name: '반려', exact: true })).not.toBeInTheDocument();
      expect(screen.queryByText('내부 최종확인 참여자')).not.toBeInTheDocument();
      composerApi.listApprovalComments.mockResolvedValue({
        comments: [], hasPrevious: false, nextBeforeCommentId: null, resultCnt: 0,
        systemEvents: [{
          commentId: 501, ownerId: record.electronicApprovalId, commentType: 'SYSTEM',
          eventType: 'FINAL_CONFIRMATION_CONFIRMED', content: '기안자가 최종 확인을 완료했습니다.',
          writerName: '기안자', createdAt: '2026-11-02T02:00:00Z',
        }],
      });
      fireEvent.click(item);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      await act(async () => finish());
      await waitFor(() => {
        expect(composerApi.confirmDocumentFinalConfirmation).toHaveBeenCalledWith(record.electronicApprovalId);
        expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2);
        expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
        expect(onActionComplete).toHaveBeenCalledOnce();
        expect(onActionComplete).toHaveBeenCalledWith({ quiet: true });
      });
      fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
      expect(screen.queryByRole('menuitem', { name: '최종확인', exact: true })).not.toBeInTheDocument();
      expect(await screen.findByText('기안자가 최종 확인을 완료했습니다.')).toBeInTheDocument();
      expect(screen.getAllByText(documentStatus === 'COMPLETED' ? '승인' : '반려').length).toBeGreaterThan(0);
      expect(composerApi.processDocumentApprovalAction).not.toHaveBeenCalled();
      expect(composerApi.confirmDocumentReference).not.toHaveBeenCalled();
    },
  );

  it.each([
    { isDrafter: false },
    { participantUserId: 'emp-2' },
    { actionStatus: 'WAITING' },
    { actionStatus: 'CONFIRMED' },
    { documentStatus: 'IN_PROGRESS' },
    { documentStatus: 'REVISION_REQUESTED' },
    { documentType: 'BUSINESS_CONTACT' },
  ])('does not expose ineligible final-confirmation actions: %j', async (patch) => {
    const record = defaultDocumentRecords[0]!;
    composerApi.getDocumentApprovalDetail.mockReset().mockResolvedValueOnce(toFeedRecord(record, {
      documentStatus: 'COMPLETED', isDrafter: true,
      ...(patch.documentStatus ? { documentStatus: patch.documentStatus } : {}),
      ...(patch.documentType ? { documentType: patch.documentType } : {}),
      ...(patch.isDrafter === false ? { isDrafter: false } : {}),
      approvalLines: [{
        electronicApprovalLineId: 151, stageOrder: 6, participantOrder: 1,
        participantType: 'FINAL_CONFIRMATION', participantUserId: patch.participantUserId ?? 'emp-1',
        participantName: '내부 참여자', actionStatus: patch.actionStatus ?? 'PENDING',
      }],
    } as Partial<DocumentApprovalFeedRecord>));
    render(<DocumentApprovalDetailFeed open electronicApprovalId={record.electronicApprovalId}
      onClose={vi.fn()} onActionComplete={vi.fn()} onEditDocument={vi.fn()} detailRefreshToken={0} />);
    await screen.findByRole('heading', { name: '문서 상세' });
    const approvalCard = await screen.findByTestId('approval-detail-card');
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).queryByRole('menuitem', { name: '최종확인', exact: true })).not.toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: '승인', exact: true })).not.toBeInTheDocument();
  });

  it('keeps final-confirmation failures visible without refreshing as success', async () => {
    const record = defaultDocumentRecords[0]!;
    composerApi.getDocumentApprovalDetail.mockReset().mockResolvedValue(toFeedRecord(record, {
      documentStatus: 'COMPLETED', isDrafter: true,
      approvalLines: [{
        electronicApprovalLineId: 151, stageOrder: 6, participantOrder: 1,
        participantType: 'FINAL_CONFIRMATION', participantUserId: 'emp-1',
        participantName: '기안자', actionStatus: 'PENDING',
      }],
    }));
    composerApi.confirmDocumentFinalConfirmation.mockRejectedValueOnce(new Error('최종확인 권한이 없습니다.'));
    const onActionComplete = vi.fn();
    render(<DocumentApprovalDetailFeed open electronicApprovalId={record.electronicApprovalId}
      onClose={vi.fn()} onActionComplete={onActionComplete} onEditDocument={vi.fn()} detailRefreshToken={0} />);
    const approvalCard = await screen.findByTestId('approval-detail-card');
    await clickDocumentMenuItem(approvalCard, '최종확인');
    expect(await screen.findByText('최종확인 권한이 없습니다.')).toBeInTheDocument();
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '최종확인', exact: true })).toBeEnabled();
    expect(onActionComplete).not.toHaveBeenCalled();
    expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledOnce();
  });

  it('confirms only the authenticated employee reference and reloads detail and comments', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    const referenceLine = {
      electronicApprovalLineId: 121,
      stageOrder: 1,
      participantOrder: 1,
      participantType: 'REFERENCE' as const,
      participantUserId: 'emp-1',
      participantName: '홍길동',
      actionStatus: 'WAITING',
    };
    const unconfirmedDetail = toFeedRecord(record, {
      approvalLines: [referenceLine],
    });
    const confirmedDetail = toFeedRecord(record, {
      approvalLines: [{ ...referenceLine, actionStatus: 'CONFIRMED' }],
    });
    composerApi.getDocumentApprovalDetail.mockReset();
    composerApi.getDocumentApprovalDetail
      .mockResolvedValueOnce(unconfirmedDetail)
      .mockResolvedValueOnce(confirmedDetail);
    let resolveConfirmation!: (value: {
      electronicApprovalId: number;
      actionStatus: string;
    }) => void;
    composerApi.confirmDocumentReference.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveConfirmation = resolve;
      }),
    );
    const onActionComplete = vi.fn();

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={onActionComplete}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    const approvalCard = await screen.findByTestId('approval-detail-card');
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    const menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', {
      name: '확인',
      exact: true,
    }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await act(async () => {
      resolveConfirmation({
        electronicApprovalId: record.electronicApprovalId,
        actionStatus: 'CONFIRMED',
      });
    });

    await waitFor(() => {
      expect(composerApi.confirmDocumentReference).toHaveBeenCalledWith(
        record.electronicApprovalId,
      );
      expect(composerApi.getDocumentApprovalDetail).toHaveBeenCalledTimes(2);
      expect(composerApi.listApprovalComments).toHaveBeenCalledTimes(2);
      expect(onActionComplete).toHaveBeenCalledOnce();
      expect(onActionComplete).toHaveBeenCalledWith({ quiet: true });
    });
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    expect(screen.queryByRole('menuitem', { name: '확인', exact: true })).not.toBeInTheDocument();
  });

  it('does not offer reference confirmation to a different authenticated employee', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(
      toFeedRecord(record, {
        approvalLines: [{
          electronicApprovalLineId: 122,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'emp-2',
          participantName: '김민수',
          actionStatus: 'WAITING',
        }],
      }),
    );

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    await screen.findByRole('heading', { name: '문서 상세' });
    const approvalCard = await screen.findByTestId('approval-detail-card');
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '확인', exact: true })).not.toBeInTheDocument();
  });

  it('does not offer reference confirmation to an approval participant', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(
      toFeedRecord(record, {
        approvalLines: [{
          electronicApprovalLineId: 125,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'APPROVAL',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'PENDING',
        }],
      }),
    );

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    await screen.findByRole('heading', { name: '문서 상세' });
    const approvalCard = await screen.findByTestId('approval-detail-card');
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '확인', exact: true })).not.toBeInTheDocument();
  });

  it('allows an unconfirmed reference to confirm a sent business contact', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(
      toFeedRecord(record, {
        documentType: 'BUSINESS_CONTACT',
        documentStatus: 'COMPLETED',
        approvalLines: [{
          electronicApprovalLineId: 126,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'WAITING',
        }],
      }),
    );

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );

    const approvalCard = await screen.findByTestId('approval-detail-card');
    fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
    expect(await screen.findByRole('menuitem', { name: '확인', exact: true })).toBeInTheDocument();
  });

  it.each([
    ['draft document', 'DRAFT', 'DRAFTING'],
    ['unsupported document type', 'PENDING', 'EXPENSE_RESOLUTION'],
  ] as const)(
    'does not offer reference confirmation for a %s',
    async (_reason, documentStatus, documentType) => {
      const record = defaultDocumentRecords[0];
      if (!record) throw new Error('Missing reference document fixture.');
      composerApi.getDocumentApprovalDetail.mockReset();
      composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(
        toFeedRecord(record, {
          documentStatus,
          documentType,
          approvalLines: [{
            electronicApprovalLineId: 124,
            stageOrder: 1,
            participantOrder: 1,
            participantType: 'REFERENCE',
            participantUserId: 'emp-1',
            participantName: '홍길동',
            actionStatus: 'WAITING',
          }],
        }),
      );

      render(
        <DocumentApprovalDetailFeed
          open
          electronicApprovalId={record.electronicApprovalId}
          onClose={vi.fn()}
          onActionComplete={vi.fn()}
          onEditDocument={vi.fn()}
          detailRefreshToken={0}
        />,
      );

      await screen.findByRole('heading', { name: '문서 상세' });
      const approvalCard = await screen.findByTestId('approval-detail-card');
      fireEvent.click(within(approvalCard).getByRole('button', { name: '문서 더보기' }));
      expect(await screen.findByRole('menu')).toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: '확인', exact: true })).not.toBeInTheDocument();
    },
  );

  it('shows reference-confirmation failures in the detail flow', async () => {
    const record = defaultDocumentRecords[0];
    if (!record) throw new Error('Missing reference document fixture.');
    composerApi.getDocumentApprovalDetail.mockReset();
    composerApi.getDocumentApprovalDetail.mockResolvedValueOnce(
      toFeedRecord(record, {
        approvalLines: [{
          electronicApprovalLineId: 123,
          stageOrder: 1,
          participantOrder: 1,
          participantType: 'REFERENCE',
          participantUserId: 'emp-1',
          participantName: '홍길동',
          actionStatus: 'WAITING',
        }],
      }),
    );
    composerApi.confirmDocumentReference.mockRejectedValueOnce(
      new Error('참조 확인 요청에 실패했습니다.'),
    );

    render(
      <DocumentApprovalDetailFeed
        open
        electronicApprovalId={record.electronicApprovalId}
        onClose={vi.fn()}
        onActionComplete={vi.fn()}
        onEditDocument={vi.fn()}
        detailRefreshToken={0}
      />,
    );
    const approvalCard = await screen.findByTestId('approval-detail-card');
    await clickDocumentMenuItem(approvalCard, '확인');

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('참조 확인 요청에 실패했습니다.');
  });
});
