import { useEffect, useState } from 'react';
import type { MenuPermission } from '../../../../dashboard/types/dashboard';
import { getDelivery } from '../../../shipment/delivery/create/services/salesDelivery.service';
import type { DeliveryItem, DeliveryPageProps } from '../../../shipment/delivery/create/types/salesDelivery.types';
import { DeliveryStatusDetailPanel } from '../../../shipment/delivery/status/components/DeliveryStatusDetailPanel';
import { DeliveryEditorDialog } from '../../../shipment/delivery/status/components/DeliveryEditorDialog';
import { SalesOrderStatusDetailPanel } from '../../../order/status/components/SalesOrderStatusDetailPanel';
import { SalesOrderEditorDialog } from '../../../order/status/components/SalesOrderEditorDialog';
import { useSalesOrderStatusDetail } from '../../../order/status/hooks/useSalesOrderStatusDetail';
import { useSalesOrderCommonCodes } from '../../../order/hooks/useSalesOrderCommonCodes';

export type RevenueClosingSourceTarget = { type: 'delivery' | 'order'; id: number };

type Props = {
  target: RevenueClosingSourceTarget | null;
  onClose: () => void;
  page: DeliveryPageProps;
};

const READ_ONLY: MenuPermission = { read: true, create: false, update: false, delete: false, excel: false };

/** 출하번호·수주번호 클릭 시 페이지 이동 없이 우측에 조회 전용 상세를 보여 준다. */
export function RevenueClosingSourcePanels({ target, onClose, page }: Props) {
  const { codes } = useSalesOrderCommonCodes();
  const order = useSalesOrderStatusDetail();
  const { openDetail: openOrder, closeDetail: closeOrder, closeEditor: closeOrderEditor } = order;
  const [delivery, setDelivery] = useState<DeliveryItem | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryEditor, setDeliveryEditor] = useState(false);
  const deliveryId = target?.type === 'delivery' ? target.id : null;
  const orderId = target?.type === 'order' ? target.id : null;

  useEffect(() => {
    if (orderId === null) { closeOrder(); return; }
    openOrder(orderId);
  }, [orderId, openOrder, closeOrder]);
  useEffect(() => {
    setDelivery(null); setDeliveryError(''); setDeliveryEditor(false);
    if (deliveryId === null) { setDeliveryLoading(false); return undefined; }
    let active = true;
    setDeliveryLoading(true);
    getDelivery(deliveryId).then((value) => { if (active) setDelivery(value); })
      .catch((cause: unknown) => { if (active) setDeliveryError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDeliveryLoading(false); });
    return () => { active = false; };
  }, [deliveryId]);

  return <>
    {deliveryId !== null ? <DeliveryStatusDetailPanel item={delivery} loading={deliveryLoading} error={deliveryError}
      canEdit={false} deliveryMethodOptions={codes.deliveryMethodOptions}
      onClose={() => { if (!deliveryEditor) onClose(); }} onView={() => setDeliveryEditor(true)} onEdit={() => undefined} /> : null}
    {deliveryId !== null && deliveryEditor ? <DeliveryEditorDialog id={deliveryId} mode="view" page={page}
      permissions={READ_ONLY} onClose={() => setDeliveryEditor(false)}
      onSaved={() => setDeliveryEditor(false)} onDeleted={() => setDeliveryEditor(false)} /> : null}
    {orderId !== null ? <SalesOrderStatusDetailPanel order={order.order} loading={order.loading} error={order.error}
      canEdit={false} orderStatusOptions={codes.orderStatusOptions} progressStatusOptions={codes.progressStatusOptions}
      deliveryMethodOptions={codes.deliveryMethodOptions}
      onClose={() => { if (order.editorMode === null) onClose(); }}
      onView={() => order.openEditor('view')} onEdit={() => undefined} /> : null}
    <SalesOrderEditorDialog mode={order.editorMode} salesOrderId={order.selectedOrderId} selectedModule={page.selectedModule}
      permissions={READ_ONLY} onClose={closeOrderEditor} onSaved={closeOrderEditor} onDeleted={closeOrderEditor} />
  </>;
}
