import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createPurchaseRequest,
  deletePurchaseRequest,
  getPurchaseRequest,
  updatePurchaseRequest,
} from '../src/pages/materials/request/create/services/purchaseRequest.service';
import { PurchaseRequestCreatePage } from '../src/pages/materials/request/create/PurchaseRequestCreatePage';
import type { PurchaseRequestItem } from '../src/pages/materials/request/create/types/purchaseRequest.types';
import type { MenuPermission } from '../src/pages/dashboard/types/dashboard';

vi.mock('../src/pages/materials/request/create/services/purchaseRequest.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/pages/materials/request/create/services/purchaseRequest.service')>();
  return {
    ...actual,
    createPurchaseRequest: vi.fn(),
    deletePurchaseRequest: vi.fn(),
    getPurchaseRequest: vi.fn(),
    updatePurchaseRequest: vi.fn(),
    fetchPurchaseUseTypeOptions: vi.fn(async () => [
      { value: 'PRODUCTION', label: '생산' },
      { value: 'DEVELOPMENT', label: '개발' },
    ]),
    searchPurchaseMaterials: vi.fn(async () => [
      { id: 101, code: 'M-101', name: '품목 101', spec: '10mm', unit: 'EA' },
    ]),
  };
});

vi.mock('../src/pages/dashboard/services/profileSettings.service', () => ({
  fetchMyProfile: vi.fn(async () => ({
    userId: 'user01',
    employeeId: 7,
    name: '홍길동',
    departmentName: '생산지원팀',
  })),
}));

const getMock = vi.mocked(getPurchaseRequest);
const createMock = vi.mocked(createPurchaseRequest);
const updateMock = vi.mocked(updatePurchaseRequest);
const deleteMock = vi.mocked(deletePurchaseRequest);

const ALL: MenuPermission = { read: true, create: true, update: true, delete: true };

describe('purchase request create page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue(loaded('REQUESTED'));
  });

  it('shows auto numbering, login user as requester and requested status for a new request', async () => {
    renderPage();
    expect(screen.getByText('구매자재 > 구매관리 > 구매요청등록')).toBeInTheDocument();
    expect(screen.getByLabelText('구매요청번호')).toHaveValue('저장 시 자동 채번');
    expect(screen.getByLabelText('상태')).toHaveValue('요청');
    await waitFor(() => expect(screen.getByLabelText('요청자')).toHaveValue('홍길동'));
    expect(screen.getByLabelText('요청부서')).toHaveValue('생산지원팀');
    expect(screen.getByLabelText('요청자')).toHaveAttribute('readonly');
    const toolbar = screen.getByTestId('purchase-request-detail-toolbar');
    expect(within(toolbar).getAllByRole('button').map((button) => button.textContent))
      .toEqual(['상세 행 추가', '품목 선택']);
  });

  it('blocks saving without detail rows', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('품목 상세를 1건 이상 입력해 주세요.')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('loads an existing request and saves header changes with detail ids', async () => {
    updateMock.mockResolvedValue(loaded('REQUESTED'));
    renderPage({ purchaseRequestId: 300, mode: 'edit' });
    await waitFor(() => expect(screen.getByLabelText('구매요청번호')).toHaveValue('MR-20261112-0001'));
    expect(screen.getByRole('grid', { name: '구매요청 상세 목록' })).toHaveTextContent('M-101');

    fireEvent.change(screen.getByRole('textbox', { name: '비고' }), { target: { value: '변경 메모' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith(300, expect.objectContaining({
      requestDt: '2026-11-12',
      remark: '변경 메모',
      details: [expect.objectContaining({ purchaseRequestDetailId: 400, materialId: 101, useType: 'PRODUCTION' })],
    }));
  });

  it('makes a confirmed request read-only', async () => {
    getMock.mockResolvedValue(loaded('CONFIRMED'));
    renderPage({ purchaseRequestId: 300, mode: 'edit' });
    await waitFor(() => expect(screen.getByLabelText('상태')).toHaveValue('확정'));
    expect(screen.getByRole('textbox', { name: '비고' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled();
    expect(screen.getByText('확정된 구매요청은 수정할 수 없습니다.')).toBeInTheDocument();
  });

  it('deletes a requested request after confirmation', async () => {
    deleteMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    renderPage({ purchaseRequestId: 300, mode: 'edit', onDeleted });
    await waitFor(() => expect(screen.getByLabelText('구매요청번호')).toHaveValue('MR-20261112-0001'));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(300));
    expect(onDeleted).toHaveBeenCalled();
  });

  it('hides save and delete without permissions', () => {
    renderPage({ permissions: { read: true, create: false, update: false, delete: false } });
    expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument();
  });
});

type RenderOptions = {
  permissions?: MenuPermission;
  purchaseRequestId?: number;
  mode?: 'create' | 'edit' | 'view';
  embedded?: boolean;
  onDeleted?: () => void;
};

function renderPage(options: RenderOptions = {}) {
  const router = createMemoryRouter(
    [{
      path: '/',
      element: (
        <PurchaseRequestCreatePage
          selectedModule={{ id: 'materials', name: '구매자재', icon: null, tree: [], menus: [] }}
          currentMenuName="구매요청등록"
          breadcrumbItems={['구매자재', '구매관리', '구매요청등록']}
          content={{ title: '구매요청등록', description: '구매를 요청합니다.', cards: [], items: [] }}
          selectedMenuPermissions={options.permissions ?? ALL}
          purchaseRequestId={options.purchaseRequestId}
          mode={options.mode}
          embedded={options.embedded}
          onDeleted={options.onDeleted}
          onEmbeddedActionsChange={undefined}
        />
      ),
    }],
    { initialEntries: ['/'] },
  );
  return render(<RouterProvider router={router} />);
}

function loaded(status: string): PurchaseRequestItem {
  return {
    purchaseRequestId: 300,
    requestNo: 'MR-20261112-0001',
    requestDt: '2026-11-12',
    requesterName: '홍길동',
    requestDeptName: '생산지원팀',
    status,
    remark: null,
    createdByName: '홍길동',
    createdAt: '2026-11-12 08:38',
    updatedByName: null,
    updatedAt: null,
    details: [{
      purchaseRequestDetailId: 400,
      lineNo: 1,
      materialId: 101,
      materialCode: 'M-101',
      materialName: '품목 101',
      materialSpec: '10mm',
      unit: 'EA',
      requestQty: 10,
      requestDeliveryDt: '2026-11-20',
      useType: 'PRODUCTION',
      useTypeName: '생산',
      requestRemark: null,
      confirmQty: null,
    }],
  };
}
