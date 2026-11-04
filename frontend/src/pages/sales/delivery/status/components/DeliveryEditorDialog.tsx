import { useCallback, useRef } from 'react';
import { Button } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { MenuPermission } from '../../../../dashboard/types/dashboard';
import { SalesDeliveryCreatePage } from '../../create/SalesDeliveryCreatePage';
import type { DeliveryPageProps } from '../../create/types/salesDelivery.types';

export function DeliveryEditorDialog({ id, page, permissions, onClose, onChanged }: {
  id: number; page: DeliveryPageProps; permissions?: MenuPermission; onClose: () => void; onChanged: () => void;
}) {
  const dirty = useRef(false);
  const pending = useRef(false);
  const close = useCallback(() => {
    if (pending.current) return;
    if (dirty.current && !window.confirm('저장되지 않은 납품 내용이 있습니다. 닫으시겠습니까?')) return;
    onClose();
  }, [onClose]);
  const onDirty = useCallback((value: boolean) => { dirty.current = value; }, []);
  const onPending = useCallback((value: boolean) => { pending.current = value; }, []);
  return <CommonDialog open title="납품 상세" onClose={close} size="lg" bodyMode="fill"
    paperHeight="min(900px, 92vh)" fullScreenOnMobile actions={<Button onClick={close}>닫기</Button>}>
    <SalesDeliveryCreatePage {...page} selectedMenuPermissions={permissions} salesDeliveryId={id} embedded
      onDirtyChange={onDirty} onPendingChange={onPending} onSaved={onChanged}
      onDeleted={() => { onChanged(); onClose(); }} />
  </CommonDialog>;
}
