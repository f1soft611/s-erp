import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import {
  PurchaseReceiptCreatePage,
  type PurchaseReceiptEmbeddedActionState,
} from '../../create/PurchaseReceiptCreatePage';
import type { PurchaseReceiptItem } from '../../create/types/purchaseReceipt.types';
import type { PurchaseReceiptEditorMode } from '../hooks/usePurchaseReceiptStatus';

type Props = {
  mode: PurchaseReceiptEditorMode | null;
  purchaseReceiptId: number | null;
  selectedModule: ModuleItem;
  permissions?: MenuPermission;
  onClose: () => void;
  onSaved: (item: PurchaseReceiptItem) => void;
  onCanceled: () => void;
};

const EMBEDDED_CONTENT: PageContent = { title: '입고등록', description: '', cards: [], items: [] };

export function PurchaseReceiptEditorDialog({
  mode,
  purchaseReceiptId,
  selectedModule,
  permissions,
  onClose,
  onSaved,
  onCanceled,
}: Props) {
  const dirtyRef = useRef(false);
  const [actionState, setActionState] = useState<PurchaseReceiptEmbeddedActionState | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const open = mode !== null && purchaseReceiptId !== null;
  const isEditMode = mode === 'edit';

  const handleDirtyChange = useCallback((nextDirty: boolean) => {
    dirtyRef.current = nextDirty;
  }, []);

  const handleClose = useCallback(async () => {
    if (
      dirtyRef.current &&
      !(await confirm({
        description: '저장되지 않은 입고 내용이 있습니다. 닫으면 입력 내용이 사라집니다. 닫으시겠습니까?',
      }))
    ) {
      return;
    }
    dirtyRef.current = false;
    onClose();
  }, [confirm, onClose]);

  const footerActions = isEditMode ? (
    <>
      {actionState?.canSave ? (
        <AppSaveButton
          variant="contained"
          saving={actionState.saving}
          sx={{ borderRadius: 1, fontWeight: 700, minWidth: 96, px: 2.5 }}
          onClick={actionState.save}
          disabled={actionState.saveDisabled}
        >
          저장
        </AppSaveButton>
      ) : null}
      <Button onClick={handleClose} disabled={actionState?.saving}>
        닫기
      </Button>
    </>
  ) : (
    <Button onClick={handleClose}>닫기</Button>
  );

  const footerStart =
    isEditMode && actionState?.canCancel ? (
      <Button
        variant="outlined"
        color="error"
        startIcon={<UndoRoundedIcon />}
        onClick={actionState.cancelReceipt}
        disabled={actionState.cancelDisabled}
      >
        입고 취소
      </Button>
    ) : undefined;

  return (
    <>
      <CommonDialog
        open={open}
        onClose={handleClose}
        title={isEditMode ? '입고 수정' : '입고 상세보기'}
        size="lg"
        bodyMode="fill"
        paperHeight="min(900px, 92vh)"
        fullScreenOnMobile
        actions={footerActions}
        footerStart={footerStart}
      >
        {open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <PurchaseReceiptCreatePage
              key={`${mode}-${purchaseReceiptId}`}
              selectedModule={selectedModule}
              currentMenuName="입고등록"
              content={EMBEDDED_CONTENT}
              breadcrumbItems={[]}
              selectedMenuPermissions={isEditMode ? permissions : undefined}
              mode={mode}
              purchaseReceiptId={purchaseReceiptId}
              embedded
              onSaved={onSaved}
              onCanceled={onCanceled}
              onDirtyChange={handleDirtyChange}
              onEmbeddedActionsChange={setActionState}
            />
          </Box>
        ) : null}
      </CommonDialog>
      {dialog}
    </>
  );
}
