import { useCallback, useMemo, type RefObject } from 'react';
import {
  F1Tree, type F1GridChanges, type F1GridColumn, type F1TreeRef,
} from '../../../../shared/components/f1-grid';
import { createProcessRow } from '../data/processManagement.data';
import type { ProcessRow } from '../types/processManagement.types';

type Props = {
  treeRef: RefObject<F1TreeRef<ProcessRow> | null>;
  rows: ProcessRow[];
  version: number;
  loading: boolean;
  saving: boolean;
  filtered: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onSelection: (ids: (string | number)[]) => void;
  onChanges: (changes: F1GridChanges<ProcessRow>) => void;
  onError: (message: string) => void;
  onAddGroup: () => void;
  onAddProcess: (groupId: string) => void;
};

function createProcessColumns(canEdit: (row: ProcessRow) => boolean): F1GridColumn<ProcessRow>[] {
  return [
    { field: 'name', headerName: '공정그룹 / 공정명', width: 220, editable: canEdit, required: true,
      validate: (value) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 100 ? true : '이름은 1~100자로 입력해 주세요.' },
    { field: 'description', headerName: '설명', width: 180, editable: canEdit },
    { field: 'image', headerName: '공정 이미지', type: 'image', width: 90, align: 'center',
      editable: (row) => row.id.startsWith('p:') && canEdit(row),
      renderCell: ({ row }) => row.id.startsWith('g:') ? null : undefined },
    ...([
      ['productionOutsource', '생산외주'], ['purchaseOutsource', '구매외주'], ['inspection', '공정검사'],
      ['packing', '포장공정'], ['stockManagement', '공정재고'], ['previousStockOut', '이전공정 재고출고'],
      ['finalProcess', '최종공정'], ['plannedEquipment', '계획설비'], ['actualEquipmentRequired', '실적설비 필수'],
    ] as const).map(([field, headerName]): F1GridColumn<ProcessRow> => ({
      field, headerName, type: 'checkbox', width: 100, align: 'center', editable: (row) => row.id.startsWith('p:') && canEdit(row), syncWithTreeCheckbox: false,
    })),
    { field: 'inactive', headerName: '미사용', type: 'checkbox', width: 80, align: 'center', editable: canEdit, syncWithTreeCheckbox: false },
  ];
}

export function ProcessManagementTree({
  treeRef, rows, version, loading, saving, filtered, canCreate, canUpdate, canDelete,
  onSelection, onChanges, onError, onAddGroup, onAddProcess,
}: Props) {
  const canEdit = useCallback((row: ProcessRow) => !saving && (row.id.includes(':new-') ? canCreate : canUpdate), [canCreate, canUpdate, saving]);
  const columns = useMemo(() => createProcessColumns(canEdit), [canEdit]);

  return (
    <F1Tree key={version} ref={treeRef} ariaLabel="공정관리" rows={rows} rowKey="id" parentKey="parentId"
      treeColumn="name" columns={columns} height="100%" rowHeight={80} defaultExpandAll showCheckbox selectionMode="row"
      multiSelect={false} loading={loading} onSelectionChange={onSelection}
      createRow={() => createProcessRow(true)} onChangesChange={onChanges}
      treeContextMenu={{
        addRootLabel: '공정그룹 추가',
        addChildLabel: '공정 추가',
        addRootDisabled: !canCreate || loading || saving || filtered,
        isAddChildDisabled: (id) => !canCreate || loading || saving || filtered || id === undefined,
        onAddRoot: onAddGroup,
        onAddChild: (id) => {
          const row = treeRef.current?.getActiveRows().find((item) => item.id === id);
          const groupId = row?.id.startsWith('g:') ? row.id : row?.parentId;
          if (groupId) onAddProcess(groupId);
        },
      }}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={canDelete} onDeleteBlocked={() => onError('공정이 있는 그룹은 삭제할 수 없습니다.')}
      onValidationErrors={(errors) => onError(errors.map((item) => item.message).join('\n'))} />
  );
}
