import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import {
  PurchaseOrderCreatePage,
  type PurchaseOrderEmbeddedActionState,
} from '../../create/PurchaseOrderCreatePage';
import type { PurchaseOrderItem } from '../../create/types/purchaseOrder.types';
import type { PurchaseOrderEditorMode } from '../hooks/usePurchaseOrderStatus';

type Props = {
  mode: PurchaseOrderEditorMode | null;
  purchaseOrderId: number | null;
  selectedModule: ModuleItem;
  permissions?: MenuPermission;
  onClose: () => void;
  onSaved: (item: PurchaseOrderItem) => void;
  onCanceled: () => void;
  /** 출력은 취소되지 않은 발주의 조회·수정 다이얼로그에서만 보이며, 저장하지 않은 변경이 있으면 비활성이다. */
  canPrint?: boolean;
  onPrint?: () => void;
};

const EMBEDDED_CONTENT: PageContent = { title: '발주등록', description: '', cards: [], items: [] };

export function PurchaseOrderEditorDialog({
  mode,
  purchaseOrderId,
  selectedModule,
  permissions,
  onClose,
  onSaved,
  onCanceled,
  canPrint = false,
  onPrint,
}: Props) {
  const dirtyRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [actionState, setActionState] = useState<PurchaseOrderEmbeddedActionState | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const open = mode !== null && purchaseOrderId !== null;
  const isEditMode = mode === 'edit';
  const isCloseMode = mode === 'close';

  const handleDirtyChange = useCallback((nextDirty: boolean) => {
    dirtyRef.current = nextDirty;
    setDirty(nextDirty);
  }, []);

  const printButton = canPrint && onPrint && !isCloseMode ? (
    <Button startIcon={<PrintIcon />} disabled={dirty || actionState?.saving} onClick={onPrint}>
      출력
    </Button>
  ) : null;

  const handleClose = useCallback(async () => {
    if (
      dirtyRef.current &&
      !(await confirm({
        description: '저장되지 않은 발주 내용이 있습니다. 닫으면 입력 내용이 사라집니다. 닫으시겠습니까?',
      }))
    ) {
      return;
    }
    dirtyRef.current = false;
    onClose();
  }, [confirm, onClose]);

  const footerActions = isEditMode || isCloseMode ? (
    <>
      {printButton}
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
    <>
      {printButton}
      <Button onClick={handleClose}>닫기</Button>
    </>
  );

  const footerStart =
    isEditMode && actionState?.canCancel ? (
      <Button
        variant="outlined"
        color="error"
        startIcon={<UndoRoundedIcon />}
        onClick={actionState.cancelOrder}
        disabled={actionState.cancelDisabled}
      >
        발주 취소
      </Button>
    ) : undefined;

  return (
    <>
      <CommonDialog
        open={open}
        onClose={handleClose}
        title={isEditMode ? '발주 수정' : isCloseMode ? '입고대기마감' : '발주 상세보기'}
        size="lg"
        bodyMode="fill"
        paperHeight="min(900px, 92vh)"
        fullScreenOnMobile
        actions={footerActions}
        footerStart={footerStart}
      >
        {open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <PurchaseOrderCreatePage
              key={`${mode}-${purchaseOrderId}`}
              selectedModule={selectedModule}
              currentMenuName="발주등록"
              content={EMBEDDED_CONTENT}
              breadcrumbItems={[]}
              selectedMenuPermissions={isEditMode || isCloseMode ? permissions : undefined}
              mode={mode}
              purchaseOrderId={purchaseOrderId}
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
