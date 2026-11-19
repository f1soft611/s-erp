import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PageSearchFieldValue } from '../../../../../../shared/components/page-search/searchFields';
import type { MenuPermission, MenuTreeNode } from '../../../../../dashboard/types/dashboard';
import { localDate } from '../../../delivery/create/services/salesDelivery.service';
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
  const [refresh, setRefresh] = useState(0);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const request = useRef(0);
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
      setLoading(true);
      setError('');
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
      .then((items) => { if (token === request.current) { setRows(items); setLoaded(true); } })
      .catch((cause) => { if (token === request.current) setError(cause instanceof Error ? cause.message : '현황 조회에 실패했습니다.'); })
      .finally(() => { if (token === request.current) setLoading(false); });
    return () => { request.current += 1; };
  }, [canRead, applied, appliedKeyword, refresh]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    getStatement(selectedId).then((value) => { if (active) setDetail(value); })
      .catch((cause) => { if (active) setDetailError(cause instanceof Error ? cause.message : '상세 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailRefresh]);
  const columns = useMemo(() => createStatementStatusColumns((row) => {
    setDetail(null);
    setSelectedId(row.salesStatementId);
  }), []);
  const resetSearch = () => {
    setKeyword(''); setAppliedKeyword(''); setValues(defaults); setApplied(defaults);
  };
  const closeDetail = () => {
    if (!editor && !printing) { setSelectedId(null); setDetail(null); }
  };
  const saved = () => {
    setEditor(null); setDetailRefresh((value) => value + 1); setRefresh((value) => value + 1);
  };
  const deleted = () => {
    setEditor(null); setSelectedId(null); setDetail(null); setRefresh((value) => value + 1);
  };

  return {
    defaults, values, setValues, applied, keyword, setKeyword, appliedKeyword, rows, loading, error, setError,
    loaded, selectedId, detail, detailError, detailLoading, editor, setEditor, printing, setPrinting,
    canRead, detailPermissions, search, columns, resetSearch, closeDetail, saved, deleted,
  };
}
