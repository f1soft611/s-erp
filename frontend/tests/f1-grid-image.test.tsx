import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { F1Grid, F1Tree, type F1GridColumn, type F1GridRef } from '../src/shared/components/f1-grid';
import { GridFormField } from '../src/shared/components/f1-grid/form/GridFormField';

type Row = { id: string; image: string };
const columns: F1GridColumn<Row>[] = [
  { field: 'image', headerName: '공정 이미지', type: 'image', editable: true },
];

describe('F1Grid image column', () => {
  it('identifies the image field in the row detail form', () => {
    render(<GridFormField column={columns[0]} row={{ id: '1', image: '' }} mode="edit"
      value="" readOnly={false} onPatch={() => {}} />);
    expect(screen.getByText('공정 이미지')).toBeInTheDocument();
  });

  it('previews a selected image and tracks removal', async () => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={[{ id: '1', image: '' }]} rowKey="id" columns={columns} />);

    const cell = screen.getByRole('gridcell');
    const placeholder = screen.getByLabelText('공정 이미지 없음');
    expect(placeholder).toHaveStyle({ width: '60px', height: '60px' });
    expect(screen.queryByRole('button', { name: '선택' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('공정 이미지 파일'), {
      target: { files: [new File(['image'], 'process.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(ref.current?.getRows()[0].image).toMatch(/^data:image\/png;base64,/));
    expect(screen.getByRole('img', { name: '공정 이미지' })).toBeInTheDocument();

    expect(screen.queryByRole('button', { name: '공정 이미지 삭제' })).not.toBeInTheDocument();
    act(() => ref.current?.setSelectedRowIds(['1']));
    fireEvent.click(screen.getByRole('img', { name: '공정 이미지' }));
    fireEvent.keyDown(cell, { key: 'Delete' });
    expect(ref.current?.getRows()[0].image).toBe('');
    expect(ref.current?.getChanges().deletedRows).toHaveLength(0);
  });

  it('rejects unsupported and oversized files without changing the row', () => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={[{ id: '1', image: '' }]} rowKey="id" columns={columns} />);
    const input = screen.getByLabelText('공정 이미지 파일');
    fireEvent.change(input, { target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('PNG/JPEG');
    expect(ref.current?.getRows()[0].image).toBe('');
    fireEvent.change(input, { target: { files: [new File([new Uint8Array(512 * 1024 + 1)], 'big.png', { type: 'image/png' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('512KB');
    expect(ref.current?.getRows()[0].image).toBe('');
  });

  it.each([
    ['image/png', [0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
    ['image/jpeg', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
  ])('uses the actual image signature instead of the file MIME %s', async (fileType, bytes, actualType) => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={[{ id: '1', image: '' }]} rowKey="id" columns={columns} />);
    fireEvent.change(screen.getByLabelText('공정 이미지 파일'), {
      target: { files: [new File([new Uint8Array(bytes)], 'image', { type: fileType })] },
    });
    await waitFor(() => expect(ref.current?.getRows()[0].image).toMatch(new RegExp(`^data:${actualType};base64,`)));
  });

  it('shows images in a read-only tree without editing controls', () => {
    type TreeRow = Row & { parentId: string | null; name: string };
    const treeColumns: F1GridColumn<TreeRow>[] = [
      { field: 'name', headerName: '이름' },
      { field: 'image', headerName: '공정 이미지', type: 'image', editable: false },
    ];
    render(<F1Tree rows={[{ id: '1', parentId: null, name: '그룹', image: 'data:image/png;base64,abc' }]}
      rowKey="id" parentKey="parentId" treeColumn="name" columns={treeColumns} />);
    expect(screen.getByRole('img', { name: '공정 이미지' })).toBeInTheDocument();
    expect(screen.queryByLabelText('공정 이미지 파일')).not.toBeInTheDocument();
  });

  it('does not delete a selected row when Delete is pressed on a read-only image', () => {
    const ref = createRef<F1GridRef<Row>>();
    render(<F1Grid ref={ref} rows={[{ id: '1', image: 'data:image/png;base64,abc' }]}
      rowKey="id" columns={[{ ...columns[0], editable: false }]} selectionMode="row" />);
    const cell = screen.getByRole('gridcell');
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: 'Delete' });
    expect(ref.current?.getRows()).toHaveLength(1);
    expect(ref.current?.getRows()[0].image).toBe('data:image/png;base64,abc');
    expect(ref.current?.getChanges().deletedRows).toHaveLength(0);
  });

  it('retains the touch-friendly remove action in the row detail form', () => {
    const onPatch = vi.fn();
    render(<GridFormField column={columns[0]} row={{ id: '1', image: 'data:image/png;base64,abc' }}
      mode="edit" value="data:image/png;base64,abc" readOnly={false} onPatch={onPatch} />);
    fireEvent.click(screen.getByRole('button', { name: '공정 이미지 삭제' }));
    expect(onPatch).toHaveBeenCalledWith({ image: '' });
  });
});
