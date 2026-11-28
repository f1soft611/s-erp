import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import {
  QuotationCreatePage,
  type QuotationEmbeddedActionState,
} from '../../create/QuotationCreatePage';
import type { QuotationItem } from '../../create/types/quotation.types';
import type { QuotationEditorMode } from '../hooks/useQuotationStatusDetail';

type Props = {
  mode: QuotationEditorMode | null;
  quotationId: number | null;
  selectedModule: ModuleItem;
  permissions?: MenuPermission;
  onClose: () => void;
  onSaved: (quotation: QuotationItem) => void;
  onDeleted: () => void;
};

const EMBEDDED_CONTENT: PageContent = { title: '견적서작성', description: '', cards: [], items: [] };

export function QuotationEditorDialog({
  mode,
  quotationId,
  selectedModule,
  permissions,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const dirtyRef = useRef(false);
  const [actionState, setActionState] = useState<QuotationEmbeddedActionState | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const open = mode !== null && quotationId !== null;
  const isEditMode = mode === 'edit';

  const handleDirtyChange = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const handleClose = useCallback(async () => {
    if (dirtyRef.current && !(await confirm({
      description: '저장되지 않은 견적 내용이 있습니다. 닫으면 입력 내용이 사라집니다. 닫으시겠습니까?',
    }))) return;
    dirtyRef.current = false;
    onClose();
  }, [confirm, onClose]);

  const footerActions = isEditMode ? (
    <>
      {actionState?.canSave ? (
        <AppSaveButton variant="contained" saving={actionState.saving}
          sx={{ borderRadius: 1, fontWeight: 700, minWidth: 96, px: 2.5 }}
          onClick={actionState.save} disabled={actionState.saveDisabled}>저장</AppSaveButton>
      ) : null}
      <Button onClick={handleClose} disabled={actionState?.saving}>취소</Button>
    </>
  ) : <Button onClick={handleClose}>닫기</Button>;
  const footerStart = isEditMode && actionState?.canDelete ? (
    <Button variant="outlined" color="error" startIcon={<DeleteForeverOutlinedIcon />}
      onClick={actionState.remove} disabled={actionState.deleteDisabled}>삭제</Button>
  ) : undefined;

  return (
    <>
      <CommonDialog
        open={open}
        onClose={handleClose}
        title={isEditMode ? '견적 수정' : '견적 상세보기'}
        size="lg"
        bodyMode="fill"
        disableBodyGutters
        paperHeight="min(900px, 92vh)"
        fullScreenOnMobile
        actions={footerActions}
        footerStart={footerStart}
      >
        {open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <QuotationCreatePage
              key={`${mode}-${quotationId}`}
              selectedModule={selectedModule}
              currentMenuName="견적서작성"
              content={EMBEDDED_CONTENT}
              breadcrumbItems={[]}
              selectedMenuPermissions={isEditMode ? permissions : undefined}
              mode={mode}
              quotationId={quotationId}
              embedded
              onSaved={onSaved}
              onDeleted={onDeleted}
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
