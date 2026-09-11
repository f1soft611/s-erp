import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import Splitter from '../../../../../shared/components/Splitter';
import {
  F1Grid,
  F1Tree,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
  type F1TreeRef,
} from '../../../../../shared/components/f1-grid';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from '../types/commonCodeManagement.types';

type CommonCodeManagementPanelProps = {
  groups: CommonCodeGroupRow[];
  items: CommonCodeItemRow[];
  selectedGroupId: string;
  canExportExcel: boolean;
  onSelectedGroupChange: (groupId: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onGroupsSaved?: (groups: CommonCodeGroupRow[]) => void;
  onItemsSaved?: (items: CommonCodeItemRow[]) => void;
  onSaveSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  commonCodeGridKey?: number;
};

export type CommonCodeManagementPanelHandle = {
  saveCurrentChanges: () => Promise<void>;
  exportCurrentRows: () => void;
  getDirtyState: () => boolean;
};

const emptyChanges = <T extends object>(): F1GridChanges<T> => ({
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
});

const groupColumns: F1GridColumn<CommonCodeGroupRow>[] = [
  {
    field: 'groupCode',
    headerName: '그룹코드',
    editable: true,
    width: 120,
  },
  {
    field: 'groupNm',
    headerName: '그룹명',
    editable: true,
    pinned: 'left',
    flex: 1,
  },
  {
    field: 'groupDc',
    headerName: '그룹 설명',
    editable: true,
    flex: 1,
  },
];

const itemColumns: F1GridColumn<CommonCodeItemRow>[] = [
  {
    field: 'id',
    type: 'rownumber',
    width: 60,
    headerName: '순번',
    headerAlign: 'center',
    align: 'center',
    pinned: 'left',
  },
  {
    field: 'itemCode',
    headerName: '상세코드',
    editable: true,
    width: 140,
  },
  {
    field: 'itemNm',
    headerName: '상세코드명',
    editable: true,
    flex: 1,
    width: 220,
  },
  {
    field: 'parentItemNm',
    headerName: '상위코드명',
    editable: true,
    width: 150,
  },
  {
    field: 'useAt',
    headerName: '사용여부',
    editable: true,
    width: 100,
  },
  {
    field: 'sortOrder',
    headerName: '정렬순서',
    editable: true,
    width: 100,
  },
  {
    field: 'itemDc',
    headerName: '비고',
    editable: true,
    flex: 1,
    width: 220,
  },
];

export const CommonCodeManagementPanel = forwardRef<
  CommonCodeManagementPanelHandle,
  CommonCodeManagementPanelProps
>(function CommonCodeManagementPanel(
  {
    groups,
    items,
    selectedGroupId,
    canExportExcel,
    onSelectedGroupChange,
    onDirtyChange,
    onGroupsSaved,
    onItemsSaved,
    onSaveSuccess,
    onError,
    commonCodeGridKey = 0,
  },
  ref,
) {
  const treeRef = useRef<F1TreeRef<CommonCodeGroupRow>>(null);
  const gridRef = useRef<F1GridRef<CommonCodeItemRow>>(null);
  const [groupChanges, setGroupChanges] = useState<
    F1GridChanges<CommonCodeGroupRow>
  >({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });
  const [itemChanges, setItemChanges] = useState<
    F1GridChanges<CommonCodeItemRow>
  >({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });

  useEffect(() => {
    const isDirty =
      groupChanges.insertedRows.length > 0 ||
      groupChanges.updatedRows.length > 0 ||
      groupChanges.deletedRows.length > 0 ||
      itemChanges.insertedRows.length > 0 ||
      itemChanges.updatedRows.length > 0 ||
      itemChanges.deletedRows.length > 0;

    onDirtyChange?.(isDirty);
  }, [groupChanges, itemChanges, onDirtyChange]);

  const getDirtyState = useCallback(() => {
    const nextGroupChanges =
      treeRef.current?.getChanges() ?? emptyChanges<CommonCodeGroupRow>();
    const nextItemChanges =
      gridRef.current?.getChanges() ?? emptyChanges<CommonCodeItemRow>();

    return (
      nextGroupChanges.insertedRows.length > 0 ||
      nextGroupChanges.updatedRows.length > 0 ||
      nextGroupChanges.deletedRows.length > 0 ||
      nextItemChanges.insertedRows.length > 0 ||
      nextItemChanges.updatedRows.length > 0 ||
      nextItemChanges.deletedRows.length > 0
    );
  }, []);

  const saveCurrentChanges = useCallback(async () => {
    const nextGroupChanges =
      treeRef.current?.getChanges() ?? emptyChanges<CommonCodeGroupRow>();
    const nextItemChanges =
      gridRef.current?.getChanges() ?? emptyChanges<CommonCodeItemRow>();
    const hasGroupChanges =
      nextGroupChanges.insertedRows.length > 0 ||
      nextGroupChanges.updatedRows.length > 0 ||
      nextGroupChanges.deletedRows.length > 0;
    const hasItemChanges =
      nextItemChanges.insertedRows.length > 0 ||
      nextItemChanges.updatedRows.length > 0 ||
      nextItemChanges.deletedRows.length > 0;

    if (!hasGroupChanges && !hasItemChanges) {
      return;
    }

    try {
      const rowsToValidate = [
        ...nextGroupChanges.insertedRows,
        ...nextGroupChanges.updatedRows,
        ...nextItemChanges.insertedRows,
        ...nextItemChanges.updatedRows,
      ];

      for (const row of rowsToValidate) {
        if ('groupCode' in row) {
          if (!String(row.groupCode ?? '').trim()) {
            throw new Error('그룹 코드는 필수입니다.');
          }
        }
        if ('itemCode' in row) {
          if (!String(row.itemCode ?? '').trim()) {
            throw new Error('상세코드는 필수입니다.');
          }
        }
      }

      const nextGroups = treeRef.current?.getActiveRows() ?? groups;
      const nextItems = gridRef.current?.getActiveRows() ?? items;

      onGroupsSaved?.(nextGroups);
      onItemsSaved?.(nextItems);
      setGroupChanges(emptyChanges<CommonCodeGroupRow>());
      setItemChanges(emptyChanges<CommonCodeItemRow>());
      onSaveSuccess?.('공통코드를 저장했습니다.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : '공통코드 저장에 실패했습니다.';
      onError?.(message);
      throw error;
    }
  }, [groups, items, onError, onGroupsSaved, onItemsSaved, onSaveSuccess]);

  useImperativeHandle(
    ref,
    () => ({
      saveCurrentChanges,
      exportCurrentRows: () => {
        const rows = gridRef.current?.getActiveRows() ?? [];
        if (!rows.length) return;

        const csv = [
          itemColumns.map((column) => column.headerName).join(','),
          ...rows.map((row) =>
            itemColumns
              .map((column) => {
                const value = row[column.field as keyof CommonCodeItemRow];
                const stringValue = value == null ? '' : String(value);
                return `"${stringValue.replace(/"/g, '""')}"`;
              })
              .join(','),
          ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'common-code-export.csv';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      },
      getDirtyState,
    }),
    [getDirtyState, saveCurrentChanges],
  );

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;
  const selectedGroupItems = selectedGroup
    ? items.filter((item) => item.groupId === selectedGroup.id)
    : [];
  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 0,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Splitter
        direction="horizontal"
        mobileMode="stacked"
        mobileBreakpoint={768}
        initialSize={600}
        minSize={400}
        maxSize={1000}
        leftFlex={1}
        rightFlex={2}
        ariaLabel="공통코드 트리와 상세영역 분리기"
      >
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': { pb: 1 },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1.2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                공통코드 그룹 관리
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <F1Tree
                key={commonCodeGridKey}
                ref={treeRef}
                rows={groups}
                columns={groupColumns}
                rowKey="id"
                parentKey="parentGroupId"
                treeColumn="groupNm"
                height="100%"
                defaultExpandAll
                showCheckbox={false}
                ariaLabel="공통코드 그룹 트리"
                onSelectionChange={(rowIds) => {
                  const nextId = rowIds[0];
                  if (
                    typeof nextId === 'string' ||
                    typeof nextId === 'number'
                  ) {
                    onSelectedGroupChange(String(nextId));
                  }
                }}
                onChangesChange={(changes) => {
                  setGroupChanges(changes);
                }}
              />
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{
            boxShadow: 'none',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              '&:last-child': { pb: 1 },
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 1.2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                공통코드 상세 관리
              </Typography>
              {selectedGroup ? (
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '60%',
                    textAlign: 'right',
                  }}
                >
                  선택 그룹: {selectedGroup.groupNm}
                </Typography>
              ) : null}
            </Box>
            <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <F1Grid
                key={commonCodeGridKey}
                ref={gridRef}
                rows={selectedGroupItems}
                columns={itemColumns}
                rowKey="id"
                ariaLabel="공통코드 상세코드"
                height="100%"
                canExportExcel={canExportExcel}
                showCheckbox={false}
                onChangesChange={(changes) => {
                  setItemChanges(changes);
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Splitter>
    </Box>
  );
});
