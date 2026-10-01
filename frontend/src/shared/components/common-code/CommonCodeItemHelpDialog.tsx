import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../f1-grid';
import type { CommonCodeItemRow } from '../../../pages/co/master/common-code/types/commonCodeManagement.types';

type ItemSavePayload = Pick<
  CommonCodeItemRow,
  'itemCode' | 'itemNm' | 'itemDc' | 'sortOrder' | 'useAt'
>;

type CommonCodeItemHelpDialogProps = {
  open: boolean;
  groupId: string;
  items: CommonCodeItemRow[];
  canEdit: boolean;
  onClose: () => void;
  onCreateItem: (payload: ItemSavePayload) => Promise<unknown>;
  onUpdateItem: (itemId: string, payload: ItemSavePayload) => Promise<unknown>;
  onReload: () => Promise<void>;
  onError?: (message: string) => void;
};

function createItemRow(groupId: string): CommonCodeItemRow {
  return {
    id: `new-common-item-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    groupId,
    itemCode: '',
    itemNm: '',
    parentItemId: null,
    parentItemNm: '',
    sortOrder: 0,
    useAt: 'Y',
    itemDc: '',
  };
}

function toSavePayload(row: CommonCodeItemRow): ItemSavePayload {
  return {
    itemCode: row.itemCode.trim(),
    itemNm: row.itemNm.trim(),
    itemDc: row.itemDc.trim(),
    sortOrder: Number(row.sortOrder) || 0,
    useAt: row.useAt,
  };
}

export function CommonCodeItemHelpDialog({
  open,
  groupId,
  items,
  canEdit,
  onClose,
  onCreateItem,
  onUpdateItem,
  onReload,
  onError,
}: CommonCodeItemHelpDialogProps) {
  const gridRef = useRef<F1GridRef<CommonCodeItemRow>>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);

  const columns = useMemo<F1GridColumn<CommonCodeItemRow>[]>(() => {
    return [
      {
        field: 'id',
        headerName: 'No',
        type: 'rownumber',
        width: 50,
        align: 'center',
        pinned: 'left',
        search: { hidden: true },
      },
      {
        field: 'itemCode',
        headerName: '상세코드',
        width: 100,
        editable: canEdit,
        align: 'center',
        required: true,
      },
      {
        field: 'itemNm',
        headerName: '상세코드명',
        flex: 1,
        // width: 100,
        editable: canEdit,
        required: true,
      },
      {
        field: 'sortOrder',
        headerName: '정렬순서',
        width: 80,
        align: 'right',
        type: 'number',
        min: 0,
        editable: canEdit,
      },
      {
        field: 'useAt',
        headerName: '사용여부',
        width: 80,
        type: 'select',
        options: [
          { value: 'Y', label: '사용' },
          { value: 'N', label: '미사용' },
        ],
        editable: canEdit,
      },
      {
        field: 'itemDc',
        headerName: '비고',
        flex: 1,
        // width: 100,
        editable: canEdit,
        form: { span: 2 },
      },
    ];
  }, [canEdit]);

  const rowFormPlugin = useMemo(
    () =>
      canEdit
        ? {
            getTitle: ({ mode }: { mode: 'create' | 'edit' }) =>
              mode === 'create' ? '분류 추가' : '분류 수정',
          }
        : undefined,
    [canEdit],
  );

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<CommonCodeItemRow>) => {
      setHasChanges(
        changes.insertedRows.length > 0 || changes.updatedRows.length > 0,
      );
    },
    [],
  );

  const handleSave = async () => {
    if (!canEdit || !gridRef.current || !hasChanges) return;
    const changes = gridRef.current.getChanges();
    setSaving(true);
    setError('');
    try {
      for (const row of changes.insertedRows) {
        await onCreateItem(toSavePayload(row));
      }
      for (const row of changes.updatedRows) {
        await onUpdateItem(row.id, toSavePayload(row));
      }
      await onReload();
      setHasChanges(false);
      setGridKey((current) => current + 1);
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : '분류 항목 저장에 실패했습니다.';
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    if (!groupId) return;
    gridRef.current?.addRow();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="draft-form-category-dialog-title"
      fullScreen={typeof window !== 'undefined' && window.innerWidth < 600}
      slotProps={{
        paper: {
          sx: { display: 'flex', flexDirection: 'column', minHeight: 0 },
        },
      }}
    >
      <DialogTitle
        component="div"
        sx={{
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          py: 1.25,
        }}
      >
        <Typography
          id="draft-form-category-dialog-title"
          component="h2"
          variant="h6"
        >
          기안양식 분류 설정
        </Typography>
        <Tooltip title="닫기">
          <IconButton
            aria-label="분류 설정 닫기"
            edge="end"
            onClick={onClose}
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {canEdit && (
              <Button
                startIcon={<AddIcon />}
                onClick={addItem}
                disabled={!groupId || saving}
              >
                분류 추가
              </Button>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 220, minWidth: 0 }}>
            <F1Grid
              key={gridKey}
              ref={gridRef}
              ariaLabel="기안양식 분류 목록"
              rows={items}
              columns={columns}
              rowKey="id"
              //   rowFormPlugin={rowFormPlugin}
              showCheckbox={false}
              createRow={() => createItemRow(groupId)}
              createDuplicate={(row) => ({
                ...row,
                id: createItemRow(groupId).id,
                itemCode: '',
                itemNm: `${row.itemNm} 복사`,
              })}
              onChangesChange={handleChangesChange}
              height="100%"
              loading={saving}
              //   allowAddRowInContextMenu={canEdit && Boolean(groupId)}
              allowDuplicateRowInContextMenu={canEdit}
              allowDeleteRowInContextMenu={false}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          flexShrink: 0,
          gap: 1,
          justifyContent: 'flex-end',
          px: 2,
          py: 1.5,
        }}
      >
        {canEdit && (
          <Button
            variant="contained"
            disabled={!hasChanges || saving}
            onClick={() => void handleSave()}
          >
            저장
          </Button>
        )}
        <Button onClick={onClose} disabled={saving}>
          취소
        </Button>
      </DialogActions>
    </Dialog>
  );
}
