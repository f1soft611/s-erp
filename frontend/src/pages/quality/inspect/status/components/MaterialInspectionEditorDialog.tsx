import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission, ModuleItem, PageContent } from '../../../../dashboard/types/dashboard';
import {
  MaterialInspectionCreatePage,
  type MaterialInspectionEmbeddedActionState,
} from '../../create/MaterialInspectionCreatePage';
import type { MaterialInspectionItem } from '../../create/types/materialInspection.types';
import type { MaterialInspectionEditorMode } from '../hooks/useMaterialInspectionStatus';

type Props = {
  mode: MaterialInspectionEditorMode | null;
  materialInspectionId: number | null;
  selectedModule: ModuleItem;
  permissions?: MenuPermission;
  onClose: () => void;
  onSaved: (item: MaterialInspectionItem) => void;
  onCanceled: () => void;
};

const EMBEDDED_CONTENT: PageContent = { title: '자재수입검사등록', description: '', cards: [], items: [] };

export function MaterialInspectionEditorDialog({
  mode,
  materialInspectionId,
  selectedModule,
  permissions,
  onClose,
  onSaved,
  onCanceled,
}: Props) {
  const dirtyRef = useRef(false);
  const [actionState, setActionState] = useState<MaterialInspectionEmbeddedActionState | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const open = mode !== null && materialInspectionId !== null;
  const isEditMode = mode === 'edit';

  const handleDirtyChange = useCallback((nextDirty: boolean) => {
    dirtyRef.current = nextDirty;
  }, []);

  const handleClose = useCallback(async () => {
    if (
      dirtyRef.current &&
      !(await confirm({
        description: '저장되지 않은 검사 내용이 있습니다. 닫으면 입력 내용이 사라집니다. 닫으시겠습니까?',
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
        onClick={actionState.cancelInspection}
        disabled={actionState.cancelDisabled}
      >
        검사 취소
      </Button>
    ) : undefined;

  return (
    <>
      <CommonDialog
        open={open}
        onClose={handleClose}
        title={isEditMode ? '검사 수정' : '검사 상세보기'}
        size="lg"
        bodyMode="fill"
        paperHeight="min(900px, 92vh)"
        fullScreenOnMobile
        actions={footerActions}
        footerStart={footerStart}
      >
        {open ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <MaterialInspectionCreatePage
              key={`${mode}-${materialInspectionId}`}
              selectedModule={selectedModule}
              currentMenuName="자재수입검사등록"
              content={EMBEDDED_CONTENT}
              breadcrumbItems={[]}
              selectedMenuPermissions={isEditMode ? permissions : undefined}
              mode={mode}
              materialInspectionId={materialInspectionId}
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
