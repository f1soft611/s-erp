import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { AppSaveButton } from '../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../shared/components/CommonDialog';
import { useCommonConfirmDialog } from '../../../shared/hooks/useCommonConfirmDialog';
import type { MenuPermission } from '../../dashboard/types/dashboard';
import { SalesStatementCreatePage, type StatementEmbeddedActions } from './SalesStatementCreatePage';
import type { StatementPageProps } from './types';

export function StatementEditorDialog({ id, mode, page, permissions, onClose, onSaved, onDeleted }: {
  id: number; mode: 'view' | 'edit'; page: StatementPageProps; permissions: MenuPermission;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const dirty = useRef(false);
  const pending = useRef(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [actions, setActions] = useState<StatementEmbeddedActions | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const close = useCallback(async () => {
    if (pending.current) return;
    if (
      dirty.current &&
      !(await confirm({
        description: '저장되지 않은 내용이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return;
    }
    onClose();
  }, [confirm, onClose]);
  const editing = mode === 'edit';
  return (
    <>
      <CommonDialog
        open
        title={editing ? '거래명세서 수정' : '거래명세서 상세보기'}
        onClose={close}
        size="lg"
        bodyMode="fill"
        paperHeight="min(900px, 92vh)"
        fullScreenOnMobile
        footerStart={
          editing && actions?.canDelete ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverOutlinedIcon />}
              disabled={actions.saving}
              onClick={actions.remove}
            >
              삭제
            </Button>
          ) : undefined
        }
        actions={
          <>
            {actions?.canPrint ? (
              <Button
                disabled={actions.saving || hasChanges}
                onClick={actions.print}
              >
                출력
              </Button>
            ) : null}
            {editing && actions?.canSave ? (
              <AppSaveButton
                variant="contained"
                saving={actions.saving}
                disabled={actions.saveDisabled}
                onClick={actions.save}
              >
                저장
              </AppSaveButton>
            ) : null}
            <Button disabled={actions?.saving} onClick={close}>
              {editing ? '취소' : '닫기'}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <SalesStatementCreatePage
            {...page}
            selectedMenuPermissions={permissions}
            statementId={id}
            embedded
            mode={mode}
            onDirtyChange={(value) => {
              dirty.current = value;
              setHasChanges(value);
            }}
            onPendingChange={(value) => {
              pending.current = value;
            }}
            onEmbeddedActionsChange={setActions}
            onSaved={onSaved}
            onDeleted={onDeleted}
          />
        </Box>
      </CommonDialog>
      {dialog}
    </>
  );
}
