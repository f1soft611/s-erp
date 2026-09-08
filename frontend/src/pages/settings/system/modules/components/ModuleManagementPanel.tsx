import { Box, Card, CardContent, Typography } from '@mui/material';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type {
  ModuleManagementRow,
  ModuleSavePayload,
} from '../types/moduleManagement.types';
import {
  createModule,
  deleteModule,
  updateModule,
} from '../services/moduleManagement.service';

type ModuleManagementPanelProps = {
  modules: ModuleManagementRow[];
  searchQuery?: string;
  canExportExcel?: boolean;
  onCreateModule?: (payload: ModuleSavePayload) => Promise<void> | void;
  onUpdateModule?: (
    moduleId: string,
    payload: ModuleSavePayload,
  ) => Promise<void> | void;
  onDeleteModule?: (moduleId: string) => Promise<void> | void;
  onModulesSaved?: (options?: { silent?: boolean }) => Promise<void> | void;
  onDirtyChange?: (dirty: boolean) => void;
  onError?: (message: string) => void;
  moduleGridKey?: number;
  moduleGridLoading?: boolean;
};

export type ModuleManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  deleteSelectedRows: () => void;
  exportCurrentRows: () => void;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

export const MODULE_ICON_OPTIONS = [
  { value: 'Settings', label: 'Settings' },
  { value: 'Folder', label: 'Folder' },
  { value: 'Dashboard', label: 'Dashboard' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'People', label: 'People' },
  { value: 'Business', label: 'Business' },
  { value: 'AdminPanelSettings', label: 'AdminPanelSettings' },
  { value: 'ListAlt', label: 'ListAlt' },
  { value: 'FileText', label: 'FileText' },
  { value: 'ClipboardCheck', label: 'ClipboardCheck' },
  { value: 'CheckCircle', label: 'CheckCircle' },
  { value: 'Notifications', label: 'Notifications' },
  { value: 'Assignment', label: 'Assignment' },
  { value: 'Security', label: 'Security' },
  { value: 'CalendarMonth', label: 'CalendarMonth' },
  { value: 'ShoppingCart', label: 'ShoppingCart' },
];

export const canEditModuleCode = (row: ModuleManagementRow): boolean =>
  !row.id || String(row.id).startsWith('new-module-');

export const ModuleManagementPanel = forwardRef<
  ModuleManagementPanelHandle,
  ModuleManagementPanelProps
>(function ModuleManagementPanel(
  {
    modules,
    searchQuery = '',
    canExportExcel = false,
    onCreateModule = createModule,
    onUpdateModule = updateModule,
    onDeleteModule = deleteModule,
    onModulesSaved,
    onDirtyChange,
    onError,
    moduleGridKey = 0,
    moduleGridLoading = false,
  },
  ref,
) {
  const gridRef = useRef<F1GridRef<ModuleManagementRow>>(null);
  const saveInFlightRef = useRef<Promise<void> | undefined>(undefined);
  const completedOperationsRef = useRef(new Set<string>());

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modules;

    return modules.filter((module) =>
      [module.moduleCode, module.moduleName, module.iconName, module.moduleUrl]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [modules, searchQuery]);

  useEffect(() => {
    const nextChanges =
      gridRef.current?.getChanges() ?? emptyChanges<ModuleManagementRow>();

    onDirtyChange?.(
      nextChanges.insertedRows.length > 0 ||
        nextChanges.updatedRows.length > 0 ||
        nextChanges.deletedRows.length > 0,
    );
  }, [filteredModules, onDirtyChange]);

  const columns: F1GridColumn<ModuleManagementRow>[] = [
    {
      field: 'moduleCode',
      headerName: '모듈 코드',
      flex: 1,
      editable: (row) => canEditModuleCode(row),
      headerAlign: 'center',
      align: 'left',
    },
    {
      field: 'moduleName',
      headerName: '모듈명',
      flex: 1.2,
      editable: true,
      headerAlign: 'center',
    },
    {
      field: 'iconName',
      headerName: '아이콘명',
      flex: 1,
      editable: true,
      type: 'select',
      options: MODULE_ICON_OPTIONS,
      headerAlign: 'center',
    },
    {
      field: 'moduleUrl',
      headerName: '루트 경로',
      flex: 1.2,
      editable: true,
      headerAlign: 'center',
    },
    {
      field: 'sortOrder',
      headerName: '정렬 순서',
      flex: 0.8,
      type: 'number',
      editable: true,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'menuCount',
      headerName: '메뉴 수',
      flex: 0.7,
      type: 'number',
      editable: false,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'use',
      headerName: '사용 여부',
      flex: 0.8,
      type: 'checkbox',
      editable: true,
      headerCheckbox: true,
      align: 'center',
      headerAlign: 'center',
    },
  ];

  const createModuleRow = useCallback(
    (): ModuleManagementRow => ({
      id: `new-module-${Date.now()}`,
      moduleCode: '',
      moduleName: '',
      iconName: 'Folder',
      moduleUrl: '',
      sortOrder: 0,
      menuCount: 0,
      use: true,
    }),
    [],
  );

  const exportCurrentRows = useCallback(() => {
    const rows = gridRef.current?.getActiveRows() ?? [];
    if (!rows.length) return;

    const csv = [
      columns.map((column) => column.headerName).join(','),
      ...rows.map((row) =>
        columns
          .map((column) => {
            const value = row[column.field as keyof ModuleManagementRow];
            const stringValue = value == null ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'module-management-export.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [columns]);

  const toPayload = (row: ModuleManagementRow): ModuleSavePayload => ({
    moduleCode: row.moduleCode.trim(),
    moduleNm: row.moduleName.trim(),
    iconNm: row.iconName.trim() || null,
    moduleUrl: row.moduleUrl.trim() || null,
    sortOrder: Number.isFinite(Number(row.sortOrder))
      ? Number(row.sortOrder)
      : 0,
    useAt: row.use ? 'Y' : 'N',
  });

  const saveCurrentChanges = useCallback(() => {
    if (saveInFlightRef.current) {
      return saveInFlightRef.current;
    }

    const savePromise = (async () => {
      const nextChanges =
        gridRef.current?.getChanges() ?? emptyChanges<ModuleManagementRow>();

      try {
        for (const row of [
          ...nextChanges.insertedRows,
          ...nextChanges.updatedRows,
        ]) {
          if (!row.moduleCode.trim() || !row.moduleName.trim()) {
            throw new Error('모듈 코드와 모듈명은 필수입니다.');
          }
        }

        for (const row of nextChanges.insertedRows) {
          const operationKey = `create:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onCreateModule(toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.updatedRows) {
          const operationKey = `update:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          await onUpdateModule(row.id, toPayload(row));
          completedOperationsRef.current.add(operationKey);
        }

        for (const row of nextChanges.deletedRows) {
          const operationKey = `delete:${row.id}`;
          if (completedOperationsRef.current.has(operationKey)) continue;
          if (!String(row.id).startsWith('new-module-')) {
            await onDeleteModule(String(row.id));
            completedOperationsRef.current.add(operationKey);
          }
        }

        if (
          nextChanges.insertedRows.length ||
          nextChanges.updatedRows.length ||
          nextChanges.deletedRows.length
        ) {
          await onModulesSaved?.();
          completedOperationsRef.current.clear();
        }
      } catch (error) {
        if (error instanceof Error) {
          onError?.(error.message);
        } else {
          onError?.('모듈 저장에 실패했습니다.');
        }
        throw error;
      } finally {
      }
    })();

    saveInFlightRef.current = savePromise;
    void savePromise.then(
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
      () => {
        if (saveInFlightRef.current === savePromise) {
          saveInFlightRef.current = undefined;
        }
      },
    );

    return savePromise;
  }, [onCreateModule, onDeleteModule, onError, onModulesSaved, onUpdateModule]);

  useImperativeHandle(
    ref,
    () => ({
      saveCurrentChanges,
      deleteSelectedRows: () => {
        gridRef.current?.deleteSelectedRows();
      },
      exportCurrentRows,
    }),
    [exportCurrentRows, saveCurrentChanges],
  );

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.18)',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        flex: 1,
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            gap: 1,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            모듈 관리
          </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <F1Grid
            key={moduleGridKey}
            ref={gridRef}
            rows={filteredModules}
            columns={columns}
            rowKey="id"
            ariaLabel="F1-GRID 모듈 관리"
            height="100%"
            maxHeight="100%"
            rowHeight={32}
            minRowHeight={32}
            maxRowHeight={320}
            showCheckbox={false}
            createRow={createModuleRow}
            editorPlugins={[
              {
                id: 'module-grid-editor',
                enabled: true,
                canEdit: () => true,
              },
            ]}
            beforeEdit={({ row, field }) => {
              if (field === 'moduleCode' && !canEditModuleCode(row)) {
                return false;
              }
              return true;
            }}
            canExportExcel={canExportExcel}
            excelFileName="module-management-export"
            loading={moduleGridLoading}
            allowAddRowInContextMenu={true}
            allowDuplicateRowInContextMenu={false}
            allowDeleteRowInContextMenu={true}
            onChangesChange={(changes) => {
              onDirtyChange?.(
                (changes?.insertedRows?.length ?? 0) > 0 ||
                  (changes?.updatedRows?.length ?? 0) > 0 ||
                  (changes?.deletedRows?.length ?? 0) > 0,
              );
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
});
