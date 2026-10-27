import { useCallback, useEffect, useState } from 'react';
import { getSalesOrder } from '../../create/services/salesOrder.service';
import type { SalesOrderItem } from '../../create/types/salesOrder.types';
import type { SalesOrderPageMode } from '../../create/SalesOrderCreatePage';

export type SalesOrderEditorMode = Extract<SalesOrderPageMode, 'edit' | 'view'>;

export function useSalesOrderStatusDetail() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [order, setOrder] = useState<SalesOrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<SalesOrderEditorMode | null>(null);

  useEffect(() => {
    if (selectedOrderId === null) return;
    let active = true;
    setLoading(true);
    setError('');
    getSalesOrder(selectedOrderId)
      .then((loaded) => {
        if (active) setOrder(loaded);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setOrder(null);
        setError(
          loadError instanceof Error ? loadError.message : '수주 상세를 불러오지 못했습니다.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshToken, selectedOrderId]);

  const openDetail = useCallback((salesOrderId: number) => {
    setOrder((current) => (current?.salesOrderId === salesOrderId ? current : null));
    setSelectedOrderId(salesOrderId);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedOrderId(null);
    setOrder(null);
    setError('');
    setEditorMode(null);
  }, []);

  const refreshDetail = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  const openEditor = useCallback((mode: SalesOrderEditorMode) => {
    setEditorMode(mode);
  }, []);

  const closeEditor = useCallback(() => {
    setEditorMode(null);
  }, []);

  return {
    selectedOrderId,
    order,
    loading,
    error,
    editorMode,
    openDetail,
    closeDetail,
    refreshDetail,
    openEditor,
    closeEditor,
  };
}
