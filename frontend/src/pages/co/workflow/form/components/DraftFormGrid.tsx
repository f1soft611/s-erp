import { useMemo, useState, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type {
  DraftFormRow,
} from '../types/draftFormManagement.types';
import {
  createDraftFormRow,
  duplicateDraftFormRow,
} from '../data/draftFormGridData';

export type DraftFormGridProps = {
  rows: DraftFormRow[];
  columns: F1GridColumn<DraftFormRow>[];
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  saving: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<DraftFormRow> | null>;
  highlightKeyword?: string;
  onChangesChange: (changes: F1GridChanges<DraftFormRow>) => void;
};

const DRAFT_FORM_GRID_STORAGE_KEY = 'co-workflow-draft-form-grid';
const DRAFT_FORM_ACTION_PIN_MIGRATION_KEY =
  'co-workflow-draft-form-grid-template-action-pinned-v1';

function migrateDraftFormGridActionPin(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (
      window.localStorage.getItem(DRAFT_FORM_ACTION_PIN_MIGRATION_KEY) === '1'
    ) {
      return false;
    }
    const storedValue = window.localStorage.getItem(
      DRAFT_FORM_GRID_STORAGE_KEY,
    );
    if (storedValue) {
      const state = JSON.parse(storedValue) as Record<string, unknown>;
      const currentPinned =
        state.pinned &&
        typeof state.pinned === 'object' &&
        !Array.isArray(state.pinned)
          ? (state.pinned as Record<string, unknown>)
          : {};
      if (!Object.hasOwn(currentPinned, 'hasDocument')) {
        state.pinned = { ...currentPinned, hasDocument: 'right' };
        window.localStorage.setItem(
          DRAFT_FORM_GRID_STORAGE_KEY,
          JSON.stringify(state),
        );
      }
    }
    window.localStorage.setItem(DRAFT_FORM_ACTION_PIN_MIGRATION_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function DraftFormGrid({
  rows,
  columns,
  canCreate,
  canUpdate,
  canExportExcel,
  saving,
  loading,
  gridKey,
  gridRef,
  highlightKeyword,
  onChangesChange,
}: DraftFormGridProps) {
  const [layoutMigrated] = useState(migrateDraftFormGridActionPin);
  const rowFormPlugin = useMemo(() => {
    return {
      enabled: (canCreate || canUpdate) && !saving,
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
        mode === 'create' ? '기안양식 등록' : '기안양식 수정',
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) =>
        !saving && (mode === 'create' ? canCreate : canUpdate),
    };
  }, [canCreate, canUpdate, saving]);

  return (
    <F1Grid
      key={layoutMigrated ? `${gridKey}-template-action` : gridKey}
      ref={gridRef}
      ariaLabel="기안양식 목록"
      storageKey={DRAFT_FORM_GRID_STORAGE_KEY}
      rows={rows}
      highlightKeyword={highlightKeyword}
      columns={columns}
      rowKey="draftingWorkCategoryId"
      rowFormPlugin={rowFormPlugin}
      createRow={canCreate && !saving ? createDraftFormRow : undefined}
      createDuplicate={canCreate && !saving ? duplicateDraftFormRow : undefined}
      onChangesChange={onChangesChange}
      loading={loading}
      height="100%"
      showCheckbox={false}
      canExportExcel={canExportExcel}
      allowAddRowInContextMenu={canCreate && !saving}
      allowDuplicateRowInContextMenu={canCreate && !saving}
      allowDeleteRowInContextMenu={canUpdate && !saving}
    />
  );
}
