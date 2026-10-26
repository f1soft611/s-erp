import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SalesOrderCreatePage } from '../src/pages/sales/order/create/SalesOrderCreatePage';

describe('sales order entry page', () => {
  it('renders the sales order form with its breadcrumb and API notice', () => {
    render(
      <SalesOrderCreatePage
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: null,
          tree: [],
          menus: [],
        }}
        currentMenuName="수주등록"
        breadcrumbItems={['영업관리', '수주관리', '수주등록']}
        content={{
          title: '수주등록',
          description: '수주 정보를 입력합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    expect(screen.getByLabelText('수주번호')).toHaveValue(
      '저장 연동 단계에서 채번 기준 확정',
    );
    expect(screen.getByText('영업관리 > 수주관리 > 수주등록')).toBeInTheDocument();
    expect(
      screen.getByText(/저장 API는 아직 연결되지 않았습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();

  });

  it('adds and removes draft detail rows through the F1-Grid', () => {
    render(
      <SalesOrderCreatePage
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: null,
          tree: [],
          menus: [],
        }}
        currentMenuName="수주등록"
        breadcrumbItems={['영업관리', '수주관리', '수주등록']}
        content={{
          title: '수주등록',
          description: '수주 정보를 입력합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));
    expect(screen.getByRole('grid', { name: '수주 상세 목록' })).toBeInTheDocument();
    expect(screen.getByText('주문수량')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '선택 행 삭제' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '선택 행 삭제' }));
    expect(
      screen.queryByRole('row', { name: /order-line-.*행 선택/ }),
    ).not.toBeInTheDocument();
  });

  it('recalculates line and order totals when grid amounts are edited', () => {
    render(
      <SalesOrderCreatePage
        selectedModule={{
          id: 'sales',
          name: '영업관리',
          icon: null,
          tree: [],
          menus: [],
        }}
        currentMenuName="수주등록"
        breadcrumbItems={['영업관리', '수주관리', '수주등록']}
        content={{
          title: '수주등록',
          description: '수주 정보를 입력합니다.',
          cards: [],
          items: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '상세 행 추가' }));

    const editCell = (cellIndex: number, value: string) => {
      const row = screen.getByRole('row', {
        name: /order-line-.*행 선택/,
      });
      const cell = within(row).getAllByRole('gridcell')[cellIndex];
      fireEvent.doubleClick(cell);
      const editor = screen.getByRole('spinbutton');
      fireEvent.change(editor, { target: { value } });
      fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter' });
    };

    editCell(3, '2');
    editCell(4, '100');

    const grid = screen.getByRole('grid', { name: '수주 상세 목록' });
    expect(within(grid).getByRole('gridcell', { name: '200.00' })).toBeInTheDocument();
    expect(screen.getByLabelText('수주 금액 합계')).toHaveTextContent(
      /공급가 합계\s*200\.00\s*부가세 합계\s*20\.00\s*총 합계\s*220\.00/,
    );

    editCell(6, '30');
    expect(screen.getByLabelText('수주 금액 합계')).toHaveTextContent(
      /공급가 합계\s*200\.00\s*부가세 합계\s*30\.00\s*총 합계\s*230\.00/,
    );
  });
});
