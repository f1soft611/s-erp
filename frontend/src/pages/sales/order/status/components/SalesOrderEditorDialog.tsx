import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import {
  SalesOrderCreatePage,
  type SalesOrderEmbeddedActionState,
} from '../../create/SalesOrderCreatePage';
import type { SalesOrderItem } from '../../create/types/salesOrder.types';
import type { SalesOrderEditorMode } from '../hooks/useSalesOrderStatusDetail';

type SalesOrderEditorDialogProps = {
  mode: SalesOrderEditorMode | null;
  salesOrderId: number | null;
  selectedModule: ModuleItem;
  permissions?: MenuPermission;
  onClose: () => void;
  onSaved: (order: SalesOrderItem) => void;
  onDeleted: () => void;
};

const EMBEDDED_CONTENT: PageContent = { title: '수주등록', description: '', cards: [], items: [] };

export function SalesOrderEditorDialog({
  mode,
  salesOrderId,
  selectedModule,
  permissions,
  onClose,
  onSaved,
  onDeleted,
}: SalesOrderEditorDialogProps) {
  const dirtyRef = useRef(false);
  const [actionState, setActionState] = useState<SalesOrderEmbeddedActionState | null>(null);
  const open = mode !== null && salesOrderId !== null;
  const isEditMode = mode === 'edit';

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const handleClose = useCallback(() => {
    if (
      dirtyRef.current &&
      !window.confirm('저장되지 않은 수주 내용이 있습니다. 닫으면 입력 내용이 사라집니다. 닫으시겠습니까?')
    ) {
      return;
    }
    dirtyRef.current = false;
    onClose();
  }, [onClose]);

  const footerActions = isEditMode ? (
    <>
      {actionState?.canSave ? (
        <AppSaveButton
          variant="contained"
          saving={actionState.saving}
          sx={{ borderRadius: 1.5, fontWeight: 700, minWidth: 96, px: 2.5 }}
          onClick={actionState.save}
          disabled={actionState.saveDisabled}
        >
          저장
        </AppSaveButton>
      ) : null}
      <Button onClick={handleClose} disabled={actionState?.saving}>
        취소
      </Button>
    </>
  ) : (
    <Button onClick={handleClose}>닫기</Button>
  );

  const footerStart =
    isEditMode && actionState?.canDelete ? (
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteForeverOutlinedIcon />}
        onClick={actionState.remove}
        disabled={actionState.deleteDisabled}
      >
        삭제
      </Button>
    ) : undefined;

  return (
    <CommonDialog
      open={open}
      onClose={handleClose}
      title={isEditMode ? '수주 수정' : '수주 상세보기'}
      size="lg"
      bodyMode="fill"
      paperHeight="min(900px, 92vh)"
      fullScreenOnMobile
      actions={footerActions}
      footerStart={footerStart}
    >
      {open ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <SalesOrderCreatePage
            key={`${mode}-${salesOrderId}`}
            selectedModule={selectedModule}
            currentMenuName="수주등록"
            content={EMBEDDED_CONTENT}
            breadcrumbItems={[]}
            selectedMenuPermissions={isEditMode ? permissions : undefined}
            mode={mode}
            salesOrderId={salesOrderId}
            embedded
            onSaved={onSaved}
            onDeleted={onDeleted}
            onDirtyChange={handleDirtyChange}
            onEmbeddedActionsChange={setActionState}
          />
        </Box>
      ) : null}
    </CommonDialog>
  );
}