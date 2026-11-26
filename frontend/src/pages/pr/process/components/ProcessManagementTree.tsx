import { useCallback, useMemo, type RefObject } from 'react';
import { F1Tree, type F1GridChanges, type F1TreeRef } from '../../../../shared/components/f1-grid';
import { createProcessColumns } from '../data/processManagement.columns';
import { createWorkplaceRow } from '../data/processManagement.data';
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
  onAddWorkplace: () => void;
  onAddProcess: (workplaceId: string) => void;
};

export function ProcessManagementTree({
  treeRef, rows, version, loading, saving, filtered, canCreate, canUpdate, canDelete,
  onSelection, onChanges, onError, onAddWorkplace, onAddProcess,
}: Props) {
  // 작업장 이름·설명·미사용만 편집한다. 연결된 공정의 내용은 공정 설정에서 수정한다.
  const canEditWorkplace = useCallback((row: ProcessRow) => !saving && row.id.startsWith('g:')
    && (row.id.includes(':new-') ? canCreate : canUpdate), [canCreate, canUpdate, saving]);
  const columns = useMemo(() => createProcessColumns({
    nameHeader: '작업장 / 공정명', canEditText: canEditWorkplace, canEditProcess: () => false,
  }), [canEditWorkplace]);

  return (
    <F1Tree key={version} ref={treeRef} storageKey="process-management-tree-v2" ariaLabel="공정관리" rows={rows} rowKey="id" parentKey="parentId"
      treeColumn="name" columns={columns} height="100%" rowHeight={80} defaultExpandAll showCheckbox selectionMode="row"
      multiSelect={false} loading={loading} onSelectionChange={onSelection}
      createRow={createWorkplaceRow} onChangesChange={onChanges}
      treeContextMenu={{
        addRootLabel: '작업장 추가',
        addChildLabel: '공정 추가',
        addRootDisabled: !canCreate || loading || saving || filtered,
        isAddChildDisabled: (id) => !canCreate || loading || saving || filtered || id === undefined,
        onAddRoot: onAddWorkplace,
        onAddChild: (id) => {
          const row = treeRef.current?.getActiveRows().find((item) => item.id === id);
          const workplaceId = row?.id.startsWith('g:') ? row.id : row?.parentId;
          if (workplaceId) onAddProcess(workplaceId);
        },
      }}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={canDelete} onDeleteBlocked={() => onError('공정이 연결된 작업장은 삭제할 수 없습니다. 연결된 공정을 먼저 삭제해 주세요.')}
      onValidationErrors={(errors) => onError(errors.map((item) => item.message).join('\n'))} />
  );
}
