import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Typography,
} from '@mui/material';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { useEffect, useRef, useState } from 'react';
import {
  F1Tree,
  type F1GridChanges,
  type F1GridColumn,
  type F1TreeRef,
} from '../../../../../shared/components/f1-grid';
import {
  createMenuSaveCheckpoint,
  replaceMenuPermissions,
  saveMenuChanges,
  type MenuSaveCheckpoint,
} from '../services/menuManagement.service';
import type { MenuManagementRow } from '../types/menuManagement.types';
import type {
  MenuModuleOption,
  MenuPermissionDefinition,
} from '../types/menuManagement.types';

type MenuManagementPanelProps = {
  menus: MenuManagementRow[];
  selectedModule?: MenuModuleOption;
  permissions: MenuPermissionDefinition[];
  onRefresh?: (
    moduleId: number,
    bypassDirtyConfirmation?: boolean,
  ) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onSaveSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export function MenuManagementPanel({
  menus,
  selectedModule,
  permissions,
  onRefresh,
  onDirtyChange,
  onSavingChange,
  onSaveSuccess,
  onError,
}: MenuManagementPanelProps) {
  const treeRef = useRef<F1TreeRef<MenuManagementRow>>(null);
  const saveCheckpointRef = useRef<MenuSaveCheckpoint | undefined>(undefined);
  const completedPermissionRowIdsRef = useRef(new Set<string>());
  const [changes, setChanges] = useState<F1GridChanges<MenuManagementRow>>({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });
  const [newMenuSequence, setNewMenuSequence] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasSelectedTreeRow, setHasSelectedTreeRow] = useState(false);
  const [treeKey, setTreeKey] = useState(0);
  useEffect(() => {
    onDirtyChange?.(
      changes.insertedRows.length > 0 ||
        changes.updatedRows.length > 0 ||
        changes.deletedRows.length > 0,
    );
  }, [changes, onDirtyChange]);

  function notifyError(nextMessage: string) {
    if (onError) {
      onError(nextMessage);
      return;
    }
    setMessage(nextMessage);
  }

  function notifySaveSuccess(nextMessage: string) {
    if (onSaveSuccess) {
      onSaveSuccess(nextMessage);
      return;
    }
    setMessage(nextMessage);
  }

  const columns: F1GridColumn<MenuManagementRow>[] = [
    {
      field: 'name',
      headerName: '메뉴명',
      width: 220,
      editable: true,
      pinned: 'left',
    },
    {
      field: 'code',
      headerName: '코드',
      width: 90,
      editable: true,
      mergeRows: true,
    },
    {
      field: 'path',
      headerName: '경로',
      width: 220,
      editable: true,
    },
    {
      field: 'order',
      headerName: '정렬',
      width: 80,
      editable: true,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'enabled',
      headerName: '사용 여부',
      width: 120,
      editable: true,
      type: 'checkbox',
      headerCheckbox: true,
      headerAlign: 'center',
      align: 'center',
    },
    ...permissions.map((permission) => ({
      field: permission.permissionCode as keyof MenuManagementRow,
      headerName: permission.permissionName,
      width: 88,
      type: 'checkbox' as const,
      editable: (row: MenuManagementRow) => !row.hasChildren,
      getValue: (row: MenuManagementRow) =>
        row.permissionCodes.includes(permission.permissionCode),
      onValueChange: (row: MenuManagementRow, checked: unknown) => ({
        permissionCodes: Boolean(checked)
          ? [...new Set([...row.permissionCodes, permission.permissionCode])]
          : row.permissionCodes.filter(
              (code) => code !== permission.permissionCode,
            ),
      }),
      headerAlign: 'center' as const,
      align: 'center' as const,
    })),
  ];

  function createMenuRow(): MenuManagementRow {
    const sequence = newMenuSequence;
    setNewMenuSequence((current) => current + 1);
    return {
      id: `new-menu-${sequence}`,
      moduleId: selectedModule?.moduleId ?? 0,
      moduleName: selectedModule?.moduleName ?? '',
      parentMenuId: null,
      hasChildren: false,
      code: `NEW${sequence}`,
      name: '새 메뉴',
      path: '',
      iconName: null,
      parent: '루트',
      order: 0,
      enabled: true,
      status: 'draft',
      description: '',
      permissionGroup: '관리',
      permissionCodes: [],
    };
  }

  function addChildMenu() {
    const parent = treeRef.current?.getSelectedRows()[0];
    if (!parent) return;
    treeRef.current?.addChildRow(parent.id, {
      moduleId: parent.moduleId,
      moduleName: parent.moduleName,
      parent: parent.name,
    });
  }

  async function handleSave() {
    if (!selectedModule || !treeRef.current?.validate() || saving) return;
    setSaving(true);
    onSavingChange?.(true);
    notifyError('');
    try {
      const currentChanges = treeRef.current.getChanges();
      const currentRows = treeRef.current.getActiveRows();
      const saveCheckpoint =
        saveCheckpointRef.current ?? createMenuSaveCheckpoint();
      saveCheckpointRef.current = saveCheckpoint;
      const savedMenus = await saveMenuChanges(currentChanges, saveCheckpoint);
      const changedRowIds = new Set([
        ...currentChanges.insertedRows.map((row) => row.id),
        ...currentChanges.updatedRows.map((row) => row.id),
      ]);
      const structuralParentIds = new Set(
        currentRows
          .filter(
            (row) =>
              row.hasChildren ||
              currentRows.some((child) => child.parentMenuId === row.id),
          )
          .map((row) => row.id),
      );

      for (const row of currentRows) {
        if (
          !changedRowIds.has(row.id) ||
          structuralParentIds.has(row.id) ||
          completedPermissionRowIdsRef.current.has(row.id)
        ) {
          continue;
        }
        const menuId = savedMenus.insertedMenuIds[row.id] ?? row.id;
        await replaceMenuPermissions(menuId, row.permissionCodes);
        completedPermissionRowIdsRef.current.add(row.id);
      }

      await onRefresh?.(selectedModule.moduleId, true);
      saveCheckpointRef.current = undefined;
      completedPermissionRowIdsRef.current.clear();
      setChanges({ insertedRows: [], updatedRows: [], deletedRows: [] });
      setTreeKey((current) => current + 1);
      notifySaveSuccess('메뉴 변경사항을 저장했습니다.');
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : '메뉴 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  function handleRefresh() {
    if (!selectedModule) return;
    notifyError('');
    const refresh = onRefresh?.(selectedModule.moduleId);
    void refresh?.catch((error) => {
      notifyError(
        error instanceof Error
          ? error.message
          : '메뉴 목록을 불러오지 못했습니다.',
      );
    });
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, minWidth: 0 }}>
      <Card
        sx={{
          borderRadius: 1,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              메뉴 관리
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                size="small"
                disabled={!selectedModule || saving}
                onClick={() => {
                  treeRef.current?.addRow();
                  setHasSelectedTreeRow(true);
                }}
              >
                루트 메뉴 추가
              </Button>
              <Button
                size="small"
                disabled={!selectedModule || !hasSelectedTreeRow || saving}
                onClick={addChildMenu}
              >
                하위 메뉴 추가
              </Button>
              <Button
                size="small"
                disabled={!selectedModule || saving}
                onClick={() => treeRef.current?.deleteSelectedRows()}
              >
                삭제
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={!selectedModule || saving}
                onClick={handleSave}
              >
                저장
              </Button>
              <Button
                size="small"
                disabled={!selectedModule || saving}
                onClick={handleRefresh}
              >
                새로고침
              </Button>
              <IconButton
                size="small"
                aria-label="전체 펼치기"
                disabled={!selectedModule || saving}
                onClick={() => treeRef.current?.expandAll()}
              >
                <UnfoldMoreIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label="전체 접기"
                disabled={!selectedModule || saving}
                onClick={() => treeRef.current?.collapseAll()}
              >
                <UnfoldLessIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <F1Tree
            key={treeKey}
            ref={treeRef}
            rows={menus}
            columns={columns}
            rowKey="id"
            parentKey="parentMenuId"
            treeColumn="name"
            defaultExpandAll
            showCheckbox
            treeCheckbox
            getRowOrder={(row) => row.order}
            // columnLine
            ariaLabel="F1-TREE 메뉴 관리"
            createRow={createMenuRow}
            onChangesChange={setChanges}
            onSelectionChange={(rowIds) =>
              setHasSelectedTreeRow(rowIds.length > 0)
            }
            onDeleteBlocked={() =>
              notifyError('하위 메뉴가 존재하는 메뉴는 삭제할 수 없습니다.')
            }
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            변경: 신규 {changes.insertedRows.length}건 / 수정{' '}
            {changes.updatedRows.length}건 / 삭제 {changes.deletedRows.length}건
          </Typography>
          {message ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {message}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}
