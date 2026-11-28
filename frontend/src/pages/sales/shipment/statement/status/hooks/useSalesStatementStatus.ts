import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isApiNetworkError } from '../../../../../../shared/services/apiErrors';
import { useInitialLoadState } from '../../../../../../shared/hooks/useInitialLoadState';
import type { PageSearchFieldValue } from '../../../../../../shared/components/page-search/searchFields';
import type { MenuPermission, MenuTreeNode } from '../../../../../dashboard/types/dashboard';
import { localDate } from '../../../delivery/create/services/salesDelivery.service';
import { getDelivery } from '../../../delivery/create/services/salesDelivery.service';
import type { DeliveryItem } from '../../../delivery/create/types/salesDelivery.types';
import { getStatement, getStatementStatus } from '../../services/salesStatement.service';
import type { StatementItem, StatementPageProps, StatementStatusRow } from '../../types/salesStatement.types';
import { createStatementStatusColumns } from '../data/statementStatusColumns';
import { validStatementDate } from '../data/statementStatusSearch';

type Values = Record<string, PageSearchFieldValue>;

function registrationPermissions(nodes: MenuTreeNode[]): MenuPermission | undefined {
  for (const node of nodes) {
    if (!node.children?.length && node.pageKey === 'statement-create') return node.permissions;
    const result = node.children && registrationPermissions(node.children);
    if (result) return result;
  }
}

export function useSalesStatementStatus(props: StatementPageProps) {
  const now = new Date();
  const [defaults] = useState<Values>(() => ({ statementDt: {
    from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  } }));
  const [values, setValues] = useState<Values>(defaults);
  const [applied, setApplied] = useState<Values>(defaults);
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [rows, setRows] = useState<StatementStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<StatementItem | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [editor, setEditor] = useState<'view' | 'edit' | null>(null);
  const [printing, setPrinting] = useState(false);
  const [deliveryId, setDeliveryId] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<DeliveryItem | null>(null);
  const [deliveryError, setDeliveryError] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryEditor, setDeliveryEditor] = useState<'view' | null>(null);
  const [refresh, setRefresh] = useState(0);
  // 수정 창 저장·삭제 후 재조회처럼 목록 로딩 표시 없이 처리할 refresh 번호
  const [quietRefresh, setQuietRefresh] = useState<number | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const request = useRef(0);
  const { start, succeed, fail, ...initialLoad } = useInitialLoadState({ networkOnly: true });
  const canRead = Boolean(props.selectedMenuPermissions?.read);
  const [previousListRequest, setPreviousListRequest] = useState<{
    canRead: boolean; applied: Values; appliedKeyword: string; refresh: number;
  } | null>(null);
  const [previousDetailRequest, setPreviousDetailRequest] = useState({
    id: selectedId, refresh: detailRefresh,
  });
  const createPermissions = registrationPermissions(props.selectedModule.tree);
  const detailPermissions: MenuPermission = { read: canRead, create: false,
    update: Boolean(createPermissions?.update), delete: Boolean(createPermissions?.delete), excel: false };
  const search = useCallback((next: Values = values) => {
    const period = next.statementDt;
    const from = typeof period === 'object' && period ? period.from ?? '' : '';
    const to = typeof period === 'object' && period ? period.to ?? '' : '';
    if (!validStatementDate(from) || !validStatementDate(to) || from > to) { setError('명세일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    setError(''); setValues(next); setApplied(next); setAppliedKeyword(keyword); setRefresh((value) => value + 1);
  }, [keyword, values]);
  if (!previousListRequest || previousListRequest.canRead !== canRead ||
    previousListRequest.applied !== applied || previousListRequest.appliedKeyword !== appliedKeyword ||
    previousListRequest.refresh !== refresh) {
    setPreviousListRequest({ canRead, applied, appliedKeyword, refresh });
    const period = applied.statementDt;
    if (canRead && typeof period === 'object' && period) {
      if (quietRefresh !== refresh) setLoading(true);
      setError('');
      start();
    }
  }
  if (previousDetailRequest.id !== selectedId || previousDetailRequest.refresh !== detailRefresh) {
    setPreviousDetailRequest({ id: selectedId, refresh: detailRefresh });
    if (selectedId) {
      setDetailLoading(true);
      setDetailError('');
    }
  }
  useEffect(() => {
    if (!canRead) return;
    const period = applied.statementDt;
    if (typeof period !== 'object' || !period) return;
    const token = ++request.current;
    getStatementStatus(period.from ?? '', period.to ?? '', appliedKeyword)
      .then((items) => { if (token === request.current) { setRows(items); setLoaded(true); succeed(); } })
      .catch((cause) => {
        if (token !== request.current) return;
        fail(cause);
        if (!isApiNetworkError(cause)) setError(cause instanceof Error ? cause.message : '현황 조회에 실패했습니다.');
      })
      .finally(() => { if (token === request.current) setLoading(false); });
    return () => { request.current += 1; };
  }, [canRead, applied, appliedKeyword, refresh, succeed, fail]);
  useEffect(() => {
    if (!deliveryId) return;
    let active = true;
    getDelivery(deliveryId).then((value) => { if (active) setDelivery(value); })
      .catch((cause) => { if (active) setDeliveryError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDeliveryLoading(false); });
    return () => { active = false; };
  }, [deliveryId]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getStatement(selectedId).then((value) => { if (active) setDetail(value); })
      .catch((cause) => { if (active) setDetailError(cause instanceof Error ? cause.message : '상세 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailRefresh]);
  const columns = useMemo(() => createStatementStatusColumns((row) => {
    setDeliveryId(null); setDelivery(null); setDeliveryError('');
    setDetail(null);
    setSelectedId(row.salesStatementId);
  }, (row) => {
    if (!row.sourceDeliveryId) return;
    setSelectedId(null); setDetail(null);
    setDelivery(null); setDeliveryError(''); setDeliveryLoading(true);
    setDeliveryId(row.sourceDeliveryId);
  }), []);
  const closeDelivery = () => {
    if (!deliveryEditor) { setDeliveryId(null); setDelivery(null); setDeliveryError(''); }
  };
  const resetSearch = () => {
    setKeyword(''); setAppliedKeyword(''); setValues(defaults); setApplied(defaults);
  };
  const closeDetail = () => {
    if (!editor && !printing) { setSelectedId(null); setDetail(null); }
  };
  const refreshQuietly = () => {
    const next = refresh + 1;
    setQuietRefresh(next);
    setRefresh(next);
  };
  const saved = () => {
    setEditor(null); setDetailRefresh((value) => value + 1); refreshQuietly();
  };
  const deleted = () => {
    setEditor(null); setSelectedId(null); setDetail(null); refreshQuietly();
  };

  const retry = () => setRefresh((value) => value + 1);

  return {
    initialLoad, retry, defaults, values, setValues, applied, keyword, setKeyword, appliedKeyword, rows, loading, error, setError,
    loaded, selectedId, detail, detailError, detailLoading, editor, setEditor, printing, setPrinting,
    canRead, detailPermissions, search, columns, resetSearch, closeDetail, saved, deleted,
    deliveryId, delivery, deliveryError, deliveryLoading, deliveryEditor, setDeliveryEditor, closeDelivery,
  };
}
