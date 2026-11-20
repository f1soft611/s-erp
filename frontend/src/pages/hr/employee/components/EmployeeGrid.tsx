import { useMemo, type RefObject } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1GridValidationError,
} from '../../../../shared/components/f1-grid';
import { createEmployeeRow } from '../data/employeeGridData';
import type { EmployeeRow } from '../types/employee.types';

export type EmployeeGridProps = {
  rows: EmployeeRow[];
  columns: F1GridColumn<EmployeeRow>[];
  highlightKeyword?: string;
  canCreate: boolean;
  canUpdate: boolean;
  canExportExcel: boolean;
  loading: boolean;
  gridKey: number;
  gridRef: RefObject<F1GridRef<EmployeeRow> | null>;
  onChangesChange: (changes: F1GridChanges<EmployeeRow>) => void;
  onValidationErrors: (errors: F1GridValidationError[]) => void;
};

/** 사원 목록. 창고·품목처럼 공통 행 폼(연필 "정보 수정" 열)으로 등록·수정하고 화면의 저장 버튼으로 일괄 저장한다. */
export function EmployeeGrid({
  rows, columns, highlightKeyword, canCreate, canUpdate, canExportExcel, loading, gridKey, gridRef,
  onChangesChange, onValidationErrors,
}: EmployeeGridProps) {
  const rowFormPlugin = useMemo(() => {
    if (!canCreate && !canUpdate) return { enabled: false };
    return {
      getTitle: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? '사원 등록' : '사원 정보 수정'),
      onBeforeApply: ({ mode }: { mode: 'create' | 'edit' }) => (mode === 'create' ? canCreate : canUpdate),
    };
  }, [canCreate, canUpdate]);

  return (
    <F1Grid
      key={gridKey}
      ref={gridRef}
      ariaLabel="사원 목록"
      storageKey="hr-employee-list-v2"
      rows={rows}
      columns={columns}
      highlightKeyword={highlightKeyword}
      rowKey="userId"
      rowFormPlugin={rowFormPlugin}
      createRow={createEmployeeRow}
      onChangesChange={onChangesChange}
      onValidationErrors={onValidationErrors}
      loading={loading}
      height="100%"
      rowHeight={68}
      showCheckbox={false}
      canExportExcel={canExportExcel}
      excelFileName="사원목록"
      allowAddRowInContextMenu={canCreate}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
    />
  );
}
