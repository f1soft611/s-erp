import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1GridDocsPage } from '../src/pages/f1-grid-docs/F1GridDocsPage';

describe('F1-Grid docs portal', () => {
  it('renders the overview document and navigation items', () => {
    render(<F1GridDocsPage />);

    expect(
      screen.getAllByRole('heading', { name: 'F1-Grid' }),
    ).not.toHaveLength(0);
    expect(
      screen.getByRole('button', { name: 'Cell Editing' }),
    ).toBeInTheDocument();
  });

  it('switches documents from the sidebar', () => {
    render(<F1GridDocsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Cell Editing' }));

    expect(
      screen.getByRole('heading', { name: 'Cell Editing' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('f1-grid-doc-playground')).toBeInTheDocument();
  });

  it('documents a large dataset sample and exposes the 10k workload guidance', () => {
    render(<F1GridDocsPage initialDocumentId="large-data" />);

    expect(
      screen.getByRole('heading', { name: 'Large Dataset' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1,000 rows')).toBeInTheDocument();
    expect(screen.getByText('10,000 rows')).toBeInTheDocument();
    expect(
      screen.getByText(/대용량 셀 렌더링과 선택 상태 유지/),
    ).toBeInTheDocument();
  });

  it('keeps the label spacing consistent and the hero title styled as a headline', () => {
    render(<F1GridDocsPage />);

    const label = screen.getByText('DOCUMENTATION');
    const headings = screen.getAllByRole('heading', { name: 'F1-Grid' });

    expect(label).toHaveStyle({ letterSpacing: '0.04em' });
    expect(headings[0]).toBeInTheDocument();
    expect(headings[0]).not.toHaveStyle({ letterSpacing: 'normal' });
  });

  it('shows a true tree sample with nested rows in the Tree Grid playground', () => {
    render(<F1GridDocsPage initialDocumentId="tree-grid" />);

    expect(screen.getByText('ERP 시스템')).toBeInTheDocument();
    expect(screen.getByText('기준정보')).toBeInTheDocument();
    expect(screen.getByText('공통코드')).toBeInTheDocument();
  });

  it('opens an inline editor on the cell editing playground', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    fireEvent.doubleClick(screen.getAllByRole('gridcell')[0]);

    expect(screen.getByDisplayValue('ITEM-001')).toBeInTheDocument();
  });

  it('updates the playground and reports code copy state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<F1GridDocsPage initialDocumentId="row-height" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Increase row height' }),
    );
    expect(screen.getByText('48px')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(writeText).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Copied')).toBeInTheDocument());
  });

  it('documents the full editing contract including plugins and number format', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('selectOnFocus')).toBeInTheDocument();
    expect(screen.getByText('decimalPlaces')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Editor Plugin lifecycle' }),
    ).toBeInTheDocument();
    expect(screen.getByText('canEdit')).toBeInTheDocument();
  });

  it('distinguishes showCheckbox from the checkbox column headerCheckbox option', () => {
    render(<F1GridDocsPage initialDocumentId="selection" />);

    expect(screen.getByText('headerCheckbox')).toBeInTheDocument();
    expect(
      screen.getByText(
        /showCheckbox는 행 선택용 체크박스 컬럼 전체를 켜고 끄고/,
      ),
    ).toBeInTheDocument();
  });

  it('documents pinned column merge and drag range selection support in Row Merge', () => {
    render(<F1GridDocsPage initialDocumentId="row-merge" />);

    expect(
      screen.getByText(/핀 고정 컬럼에서도 동일한 규칙으로 병합/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/병합된 영역에서도 셀 드래그 범위 선택이/),
    ).toBeInTheDocument();
  });

  it('documents column render hooks and the editable-header indicator', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('renderCell')).toBeInTheDocument();
    expect(screen.getByText('getCellStyle')).toBeInTheDocument();
    expect(screen.getByText('getCellProps')).toBeInTheDocument();
    expect(
      screen.getByText(/편집 가능한 컬럼은 헤더 하단에 강조 색상/),
    ).toBeInTheDocument();
  });

  it('shows a live render hook example in the editing playground', () => {
    render(<F1GridDocsPage initialDocumentId="editing" />);

    expect(screen.getByText('활성')).toBeInTheDocument();
    expect(screen.getByText('대기')).toBeInTheDocument();
    expect(screen.getByText('중지')).toBeInTheDocument();
  });

  it('documents and demonstrates the row form modal playground', () => {
    render(<F1GridDocsPage initialDocumentId="row-form-modal" />);

    expect(
      screen.getByRole('heading', { name: 'Row Form Modal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('rowFormPlugin')).toBeInTheDocument();
    expect(screen.getByText('form.group')).toBeInTheDocument();
    expect(screen.getByText('form.span')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: '상세' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'one 행 정보 수정' }));

    expect(
      screen.getByRole('dialog', { name: '정보 수정' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '기본 정보' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '운영 정보' }),
    ).toBeInTheDocument();
  });

  it('documents Tree Grid expansion options and the Tree Ref API', () => {
    render(<F1GridDocsPage initialDocumentId="tree-grid" />);

    expect(screen.getByText('defaultExpanded')).toBeInTheDocument();
    expect(screen.getByText('treeCheckbox')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Tree Ref API' }),
    ).toBeInTheDocument();
    expect(screen.getByText('expandRow / collapseRow')).toBeInTheDocument();
  });

  it('groups the API reference by Props, Column, Tree and Ref contracts', () => {
    render(<F1GridDocsPage initialDocumentId="api-reference" />);

    expect(
      screen.getByRole('heading', { name: 'F1GridProps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1GridColumn' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1TreeProps' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1GridRef' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'F1TreeRef' }),
    ).toBeInTheDocument();
  });

  it('documents the current grid props and provides a live context-menu sample', () => {
    render(<F1GridDocsPage initialDocumentId="context-menu" />);

    expect(screen.getByText('minHeight')).toBeInTheDocument();
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.getByText('allowAddRowInContextMenu')).toBeInTheDocument();
    expect(
      screen.getByText('allowDuplicateRowInContextMenu'),
    ).toBeInTheDocument();
    expect(screen.getByText('allowDeleteRowInContextMenu')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Toggle export menu' }),
    ).toBeInTheDocument();
  });
});
