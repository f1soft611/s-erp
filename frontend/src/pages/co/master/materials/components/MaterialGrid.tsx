import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import {
  type MaterialRow,
} from '../types/materialManagement.types';
import { createMaterialRow } from '../data/materialGridData';

type Props = {
  rows: MaterialRow[];
  columns: F1GridColumn<MaterialRow>[];
  highlightKeyword?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<MaterialRow> | null>;
  onChangesChange: (changes: F1GridChanges<MaterialRow>) => void;
};

export function MaterialGrid({
  rows,
  columns,
  highlightKeyword,
  canCreate,
  canUpdate,
  canExportExcel,
  loading,
  gridKey,
  gridRef,
  onChangesChange,
}: Props) {
  const rowFormPlugin = useMemo(
    () =>
      !canCreate && !canUpdate
        ? { enabled: false }
        : {
            getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
              mode === 'create' ? '품목 등록' : '품목 수정',
            onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
              mode === 'create' ? canCreate : canUpdate,
          },
    [canCreate, canUpdate],
  );
  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="품목 목록"
      storageKey="co-master-material-grid-v2"
      rows={rows}
      columns={columns}
      highlightKeyword={highlightKeyword}
      rowKey="materialId"
      rowFormPlugin={rowFormPlugin}
      createRow={createMaterialRow}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={canExportExcel}
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
