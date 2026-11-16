import { useCallback, useEffect, useState } from 'react';
import { getQuotation } from '../../create/services/quotation.service';
import type { QuotationItem } from '../../create/types/quotation.types';

export type QuotationEditorMode = 'edit' | 'view';

export function useQuotationStatusDetail() {
  const [selectedQuotationId, setSelectedQuotationId] = useState<number | null>(null);
  const [quotation, setQuotation] = useState<QuotationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [editorMode, setEditorMode] = useState<QuotationEditorMode | null>(null);

  useEffect(() => {
    if (selectedQuotationId === null) return;
    let active = true;
    setLoading(true);
    setError('');
    getQuotation(selectedQuotationId)
      .then((loaded) => { if (active) setQuotation(loaded); })
      .catch((loadError: unknown) => {
        if (!active) return;
        setQuotation(null);
        setError(loadError instanceof Error ? loadError.message : '견적 상세를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshToken, selectedQuotationId]);

  const openDetail = useCallback((quotationId: number) => {
    setQuotation((current) => current?.quotationId === quotationId ? current : null);
    setSelectedQuotationId(quotationId);
  }, []);
  const closeDetail = useCallback(() => {
    setSelectedQuotationId(null);
    setQuotation(null);
    setError('');
    setEditorMode(null);
  }, []);
  const refreshDetail = useCallback(() => setRefreshToken((token) => token + 1), []);
  const openEditor = useCallback((mode: QuotationEditorMode) => setEditorMode(mode), []);
  const closeEditor = useCallback(() => setEditorMode(null), []);

  return {
    selectedQuotationId,
    quotation,
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
