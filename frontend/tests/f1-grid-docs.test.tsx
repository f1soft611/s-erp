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
});
