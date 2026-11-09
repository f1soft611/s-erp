import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompanyInfoPage } from '../src/pages/co/master/company/CompanyInfoPage';
import { NotificationProvider } from '../src/shared/context/NotificationContext';

const apiMocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock('../src/shared/services/apiClient', () => apiMocks);

const company = {
  companyName: 'Example Co.',
  businessNo: '123-45-67890',
  businessType: '제조업',
  businessCategory: '전자부품',
  presidentName: '홍길동',
  postCode: '01234',
  address: '서울시 중구 세종대로 1',
  telephoneNo: '02-1234-5678',
  facsimileNo: '02-1234-5679',
  stampImage: '',
};

function renderPage(update = true) {
  return render(
    <NotificationProvider><CompanyInfoPage
      selectedModule={{
        id: 'co',
        name: '기준정보 관리',
        icon: null,
        tree: [],
        menus: [],
      }}
      currentMenuName="회사정보 관리"
      content={{
        title: '회사정보 관리',
        description: '거래명세서에 표시할 공급자 정보를 관리합니다.',
        cards: [],
        items: [],
      }}
      selectedMenuPermissions={{
        read: true,
        create: false,
        update,
        delete: false,
        excel: false,
      }}
    /></NotificationProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.apiGet.mockResolvedValue({ item: company });
  apiMocks.apiPut.mockResolvedValue({ item: company });
});

describe('company info page', () => {
  it('loads all supplier fields and saves the edited company information', async () => {
    renderPage();

    const companyName = await screen.findByRole('textbox', { name: '회사명' });
    expect(companyName).toHaveValue('Example Co.');
    expect(screen.getByRole('textbox', { name: '업종' })).toHaveValue(
      company.businessType,
    );
    expect(screen.getByRole('textbox', { name: '업태' })).toHaveValue(
      company.businessCategory,
    );
    expect(screen.getByRole('textbox', { name: '대표자명' })).toHaveValue('홍길동');
    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue(
      '서울시 중구 세종대로 1',
    );

    fireEvent.change(companyName, { target: { value: 'Updated Co.' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiMocks.apiPut).toHaveBeenCalledWith(
        '/api/v1/co/master/company',
        expect.objectContaining({ companyName: 'Updated Co.' }),
      );
      expect(apiMocks.apiPut.mock.calls[0][1]).not.toHaveProperty('stampImage');
    });
    expect(await screen.findByText('회사정보를 저장했습니다.')).toBeInTheDocument();
  });

  it('does not show a success toast when saving fails', async () => {
    apiMocks.apiPut.mockRejectedValueOnce(new Error('저장 실패'));
    renderPage();
    const companyName = await screen.findByRole('textbox', { name: '회사명' });
    fireEvent.change(companyName, { target: { value: 'Updated Co.' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장 실패')).toBeInTheDocument();
    expect(screen.queryByText('회사정보를 저장했습니다.')).not.toBeInTheDocument();
  });

  it('keeps company fields read-only without the update permission', async () => {
    renderPage(false);

    const companyName = await screen.findByRole('textbox', { name: '회사명' });
    expect(companyName).toBeDisabled();
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('회사 직인 파일')).toBeDisabled();
  });

  it('places vertical scrolling on the full-width content area rather than the centered form', async () => {
    renderPage();
    await screen.findByRole('textbox', { name: '회사명' });
    const region = screen.getByRole('region', { name: '회사정보 입력 영역' });
    expect(getComputedStyle(region).overflowY).toBe('auto');
    expect(getComputedStyle(region).width).toBe('100%');
    expect(getComputedStyle(region.querySelector('form')!).overflowY).not.toBe('auto');
  });

  it('does not add extra vertical margins between company fields', async () => {
    renderPage();
    const field = await screen.findByRole('textbox', { name: '회사명' });
    const control = field.closest('.MuiFormControl-root')!;
    expect(getComputedStyle(control).marginTop).toBe('0px');
    expect(getComputedStyle(control).marginBottom).toBe('0px');
    expect(getComputedStyle(control.parentElement!).rowGap).toBe('12px');
  });

  it('previews a selected seal and includes it when the company is saved', async () => {
    renderPage();
    await screen.findByRole('textbox', { name: '회사명' });
    const file = new File(['seal'], 'seal.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('회사 직인 파일'), { target: { files: [file] } });
    const image = await screen.findByAltText('회사 직인 미리보기');
    expect(image).toHaveAttribute('src', 'data:image/png;base64,c2VhbA==');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(apiMocks.apiPut).toHaveBeenCalledWith(
      '/api/v1/co/master/company', expect.objectContaining({ stampImage: 'data:image/png;base64,c2VhbA==' }),
    ));
  });

  it('rejects unsupported files without replacing the saved seal', async () => {
    renderPage();
    await screen.findByRole('textbox', { name: '회사명' });
    const file = new File(['bad'], 'seal.svg', { type: 'image/svg+xml' });
    fireEvent.change(screen.getByLabelText('회사 직인 파일'), { target: { files: [file] } });
    expect(screen.getByText('직인은 512KB 이하의 PNG 또는 JPEG 파일을 선택해 주세요.')).toBeInTheDocument();
    expect(screen.queryByAltText('회사 직인 미리보기')).not.toBeInTheDocument();
  });

  it('does not save while a selected seal file is still being read', async () => {
    let finishRead: (() => void) | undefined;
    const reader = {
      result: 'data:image/png;base64,c2VhbA==', onload: null as null | (() => void),
      onerror: null, onabort: null, readAsDataURL: vi.fn(),
      abort: vi.fn(), readyState: 1,
    };
    vi.spyOn(window, 'FileReader').mockImplementation(function () {
      finishRead = () => reader.onload?.();
      return reader as unknown as FileReader;
    });
    try {
      renderPage();
      const companyName = await screen.findByRole('textbox', { name: '회사명' });
      fireEvent.change(companyName, { target: { value: 'Updated Co.' } });
      fireEvent.change(screen.getByLabelText('회사 직인 파일'), {
        target: { files: [new File(['seal'], 'seal.png', { type: 'image/png' })] },
      });
      expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
      act(() => finishRead?.());
      await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
    } finally {
      vi.restoreAllMocks();
    }
  });
});
