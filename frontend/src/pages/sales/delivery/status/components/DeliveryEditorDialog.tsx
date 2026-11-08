import { useCallback, useRef, useState } from 'react';
import { Box, Button } from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { AppSaveButton } from '../../../../../shared/components/AppSaveButton';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { MenuPermission } from '../../../../dashboard/types/dashboard';
import { SalesDeliveryCreatePage, type DeliveryEmbeddedActionState } from '../../create/SalesDeliveryCreatePage';
import type { DeliveryPageProps } from '../../create/types/salesDelivery.types';

export function DeliveryEditorDialog({ id, mode, page, permissions, onClose, onSaved, onDeleted }: {
  id: number; mode: 'view' | 'edit'; page: DeliveryPageProps; permissions?: MenuPermission;
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const dirty = useRef(false);
  const pending = useRef(false);
  const [actions, setActions] = useState<DeliveryEmbeddedActionState | null>(null);
  const close = useCallback(() => {
    if (pending.current) return;
    if (dirty.current && !window.confirm('저장되지 않은 출하 내용이 있습니다. 닫으시겠습니까?')) return;
    onClose();
  }, [onClose]);
  const onDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const onPending = useCallback((value: boolean) => { pending.current = value; }, []);
  const editing = mode === 'edit';
  return <CommonDialog open title={editing ? '출하 수정' : '출하 상세보기'} onClose={close} size="lg" bodyMode="fill"
    paperHeight="min(900px, 92vh)" fullScreenOnMobile
    footerStart={editing && actions?.canDelete ? <Button variant="outlined" color="error" startIcon={<DeleteForeverOutlinedIcon />}
      disabled={actions.deleteDisabled} onClick={actions.remove}>삭제</Button> : undefined}
    actions={editing ? <>
      {actions?.canSave ? <AppSaveButton variant="contained" saving={actions.saving} disabled={actions.saveDisabled}
        sx={{ borderRadius: 1.5, fontWeight: 700, minWidth: 96, px: 2.5 }} onClick={actions.save}>저장</AppSaveButton> : null}
      <Button disabled={actions?.saving} onClick={close}>취소</Button>
    </> : <Button onClick={close}>닫기</Button>}>
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <SalesDeliveryCreatePage {...page} selectedMenuPermissions={permissions} salesDeliveryId={id} embedded mode={mode}
        onDirtyChange={onDirty} onPendingChange={onPending} onEmbeddedActionsChange={setActions} onSaved={onSaved}
        onDeleted={onDeleted} />
    </Box>
  </CommonDialog>;
}
