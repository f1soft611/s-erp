import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { DraftFormManagementPage } from '../src/pages/co/workflow/form/DraftFormManagementPage';
import { DraftFormTemplateDialog } from '../src/pages/co/workflow/form/components/DraftFormTemplateDialog';
import type { DraftFormRow } from '../src/pages/co/workflow/form/types/draftFormManagement.types';

const apiMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiGetBlob: vi.fn(),
  apiPostFormData: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const row: DraftFormRow = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  categoryItemId: 101,
  categoryName: '점검',
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
  useAt: 'Y',
};

const template = {
  draftingWorkCategoryId: 77,
  cataTypeCode: '007',
  codeName: '정기점검',
  hasDocument: true,
  templateJson: {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: '저장된 본문' }] },
    ],
  },
  templateHtml: '<p>저장된 본문</p>',
};

function renderDialog() {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ThemeProvider theme={createTheme()}>
      <NotificationProvider>
        <DraftFormTemplateDialog
          open
          row={row}
          onClose={onClose}
          onSaved={onSaved}
        />
      </NotificationProvider>
    </ThemeProvider>,
  );
  return { onClose, onSaved };
}

describe('DraftFormTemplateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.apiGet.mockResolvedValue({ item: template });
    apiMocks.apiPut.mockResolvedValue({ item: template });
  });

  it('loads and restores the selected form template', async () => {
    renderDialog();

    expect(
      await screen.findByRole('dialog', { name: '문서 양식 수정' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '본문' })).toHaveTextContent(
      '저장된 본문',
    );
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
    );
  });

  it('rehydrates a stored image using the authenticated blob endpoint', async () => {
    const objectUrl = 'blob:authenticated-template-image';
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => objectUrl),
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiGet.mockResolvedValue({
      item: {
        ...template,
        templateJson: {
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: '/api/v1/co/workflow/forms/77/template-images/901',
                'data-file-id': '901',
                alt: '점검 이미지',
              },
            },
          ],
        },
        templateHtml:
          '<img src="/api/v1/co/workflow/forms/77/template-images/901" data-file-id="901" alt="점검 이미지">',
      },
    });
    apiMocks.apiGetBlob.mockResolvedValue(new Blob(['image']));
    renderDialog();

    const editor = await screen.findByRole('textbox', { name: '본문' });
    await waitFor(() =>
      expect(apiMocks.apiGetBlob).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/77/template-images/901',
      ),
    );
    expect(editor.querySelector('img')).toHaveAttribute('src', objectUrl);
    expect(editor.querySelector('img')).toHaveAttribute('data-file-id', '901');
  });

  it('saves the editor JSON and HTML through the template endpoint', async () => {
    const { onClose, onSaved } = renderDialog();
    await screen.findByRole('textbox', { name: '본문' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
      expect.objectContaining({
        templateJson: expect.objectContaining({ type: 'doc' }),
        templateHtml: expect.stringContaining('저장된 본문'),
        embeddedImages: [],
      }),
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('uploads a pasted image to the form temp path and saves its upload token', async () => {
    const createObjectUrl = vi.fn(() => 'blob:local-pasted-image');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiPostFormData.mockResolvedValue({
      item: {
        uploadToken: 'image-token-1',
        fileName: 'pasted.png',
        fileSize: 8,
        mimeType: 'image/png',
      },
    });
    renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });

    fireEvent.paste(editor, {
      clipboardData: {
        items: [
          {
            kind: 'file',
            type: 'image/png',
            getAsFile: () => file,
          },
        ],
        getData: () => '',
      },
    });

    await waitFor(() => expect(apiMocks.apiPostFormData).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalled());

    expect(apiMocks.apiPostFormData).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template-images/temp',
      expect.any(FormData),
    );
    expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
      expect.objectContaining({
        embeddedImages: [
          { uploadToken: 'image-token-1', fileName: 'pasted.png' },
        ],
      }),
    );
  });

  it('confirms discarding an uploaded image and deletes its temporary object', async () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:local-pasted-image'),
      revokeObjectURL: vi.fn(),
    });
    apiMocks.apiPostFormData.mockResolvedValue({
      item: {
        uploadToken: 'image-token-2',
        fileName: 'pasted.png',
        fileSize: 8,
        mimeType: 'image/png',
      },
    });
    const { onClose } = renderDialog();
    const editor = await screen.findByRole('textbox', { name: '본문' });
    const file = new File(['png data'], 'pasted.png', { type: 'image/png' });
    fireEvent.paste(editor, {
      clipboardData: {
        items: [{ kind: 'file', type: 'image/png', getAsFile: () => file }],
        getData: () => '',
      },
    });
    await waitFor(() => expect(apiMocks.apiPostFormData).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(
      await screen.findByRole('dialog', { name: '저장하지 않은 변경사항' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '변경 버리기' }));

    await waitFor(() =>
      expect(apiMocks.apiDelete).toHaveBeenCalledWith(
        '/api/v1/co/workflow/forms/77/template-images/temp/image-token-2?fileName=pasted.png',
      ),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the selected row template dialog from the document action', async () => {
    window.localStorage.setItem(
      'co-workflow-draft-form-grid',
      JSON.stringify({
        order: [
          'draftingWorkCategoryId',
          'cataTypeCode',
          'codeName',
          'categoryItemId',
          'regTermId',
          'reviewerId',
          'approverId',
          'assigneeIds',
          'createdByName',
          'createdAt',
          'useAt',
        ],
        widths: {},
        hidden: [],
        pinned: {
          draftingWorkCategoryId: 'left',
          cataTypeCode: 'left',
          codeName: 'left',
        },
      }),
    );
    window.localStorage.removeItem(
      'co-workflow-draft-form-grid-template-action-pinned-v1',
    );
    apiMocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/v1/co/workflow/forms') {
        return Promise.resolve({ resultList: [row] });
      }
      if (path === '/api/v1/co/workflow/forms/77/template') {
        return Promise.resolve({ item: template });
      }
      return Promise.resolve({ resultList: [] });
    });

    render(
      <ThemeProvider theme={createTheme()}>
        <NotificationProvider>
          <DraftFormManagementPage
            selectedModule={{
              id: 'co',
              name: '기준정보',
              icon: null,
              tree: [],
              menus: [],
            }}
            currentMenuName="기안양식관리"
            content={{
              title: '기안양식관리',
              description: '',
              cards: [],
              items: [],
            }}
            selectedMenuPermissions={{
              read: true,
              create: false,
              update: true,
              delete: false,
            }}
            isTenantAdmin
          />
        </NotificationProvider>
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(apiMocks.apiGet).toHaveBeenCalledWith('/api/v1/co/workflow/forms'),
    );
    expect(
      await screen.findByRole('columnheader', { name: '문서 양식' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('gridcell', { name: '정기점검' }),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole('button', { name: '문서 수정: 정기점검' }),
    );

    expect(
      await screen.findByRole('dialog', { name: '문서 양식 수정' }),
    ).toBeInTheDocument();
    expect(apiMocks.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/workflow/forms/77/template',
    );
  });
});
