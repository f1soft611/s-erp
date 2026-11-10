import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Link, TextField } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../shared/components/SearchResultMessage';
import { F1Grid, type F1GridColumn } from '../../../shared/components/f1-grid';
import type { PageSearchField, PageSearchFieldValue } from '../../../shared/components/page-search/searchFields';
import type { MenuPermission, MenuTreeNode } from '../../dashboard/types/dashboard';
import { localDate } from '../delivery/create/services/salesDelivery.service';
import { StatementDetailPanel } from './StatementDetailPanel';
import { StatementEditorDialog } from './StatementEditorDialog';
import { StatementPrint } from './StatementPrint';
import { getStatement, getStatementStatus } from './statement.service';
import type { StatementItem, StatementPageProps, StatementStatusRow } from './types';

const fields: PageSearchField[] = [{ field: 'statementDt', label: '명세일', type: 'date', required: true, searchSpan: 2 }];
type Values = Record<string, PageSearchFieldValue>;
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}
function registrationPermissions(nodes: MenuTreeNode[]): MenuPermission | undefined {
  for (const node of nodes) {
    if (!node.children?.length && node.pageKey === 'statement-create') return node.permissions;
    const result = node.children && registrationPermissions(node.children);
    if (result) return result;
  }
}
export function SalesStatementStatusPage(props: StatementPageProps) {
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
  const createPermissions = registrationPermissions(props.selectedModule.tree);
  const detailPermissions: MenuPermission = { read: canRead, create: false,
    update: Boolean(createPermissions?.update), delete: Boolean(createPermissions?.delete), excel: false };
  const search = useCallback((next: Values = values) => {
    const period = next.statementDt;
    const from = typeof period === 'object' && period ? period.from ?? '' : '';
    const to = typeof period === 'object' && period ? period.to ?? '' : '';
    if (!validDate(from) || !validDate(to) || from > to) { setError('명세일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    setError(''); setValues(next); setApplied(next); setAppliedKeyword(keyword); setRefresh((value) => value + 1);
  }, [keyword, values]);
  useEffect(() => {
    if (!canRead) return;
    const period = applied.statementDt;
    if (typeof period !== 'object' || !period) return;
    const token = ++request.current;
    setLoading(true); setError('');
    getStatementStatus(period.from ?? '', period.to ?? '', appliedKeyword)
      .then((items) => { if (token === request.current) { setRows(items); setLoaded(true); } })
      .catch((cause) => { if (token === request.current) setError(cause instanceof Error ? cause.message : '현황 조회에 실패했습니다.'); })
      .finally(() => { if (token === request.current) setLoading(false); });
    return () => { request.current += 1; };
  }, [canRead, applied, appliedKeyword, refresh]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setDetailLoading(true); setDetailError('');
    getStatement(selectedId).then((value) => { if (active) setDetail(value); })
      .catch((cause) => { if (active) setDetailError(cause instanceof Error ? cause.message : '상세 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailRefresh]);
  const columns = useMemo<F1GridColumn<StatementStatusRow>[]>(() => [
    { field: 'salesStatementDetailId', headerName: 'No', type: 'rownumber', width: 56, align: 'center', pinned: 'left' },
    { field: 'statementNo', headerName: '명세번호', width: 140, align: 'center', mergeRows: true,
      renderCell: ({ row }) => <Link component="button" type="button" aria-label={`${row.statementNo} 상세 보기`}
        onClick={(event) => { event.stopPropagation(); setDetail(null); setSelectedId(row.salesStatementId); }}
        sx={{ fontWeight: 600, fontSize: 'inherit' }}>{row.statementNo}</Link> },
    { field: 'statementDt', headerName: '명세일', type: 'date', width: 90, align: 'center', mergeRows: true },
    { field: 'deliveryNo', headerName: '출하번호', width: 140, align: 'center', mergeRows: true },
    { field: 'customerCode', headerName: '거래처코드', width: 100, align: 'center', mergeRows: true },
    { field: 'customerName', headerName: '거래처명', width: 160, align: 'center', mergeRows: true },
    { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'center' },
    { field: 'materialSpec', headerName: '규격', width: 140, align: 'center' },
    { field: 'unit', headerName: '단위', width: 80, align: 'center' },
    ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'lineTotalAmt'] as const).map((field, index) => ({
      field, headerName: ['수량', '단가', '공급가', 'VAT', '합계'][index],
      type: 'decimal' as const, decimalPlaces: 2, width: 130, align: 'right' as const,
    })),
  ], []);
  if (!canRead) return <Alert severity="warning">거래명세서현황 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={props.breadcrumbItems.length ? props.breadcrumbItems : [props.currentMenuName]}
      description={props.content.description} actionGroups={[{ key: 'read', actions: [
        { label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => search(applied) },
      ] }]} />
    <PageSearchArea detailFields={fields} detailValues={values} appliedDetailValues={applied}
      defaultValues={defaults} onDetailValuesChange={setValues} onDetailSearch={search}
      onDetailReset={() => { setKeyword(''); setAppliedKeyword(''); setValues(defaults); setApplied(defaults); }}
      detailLoading={loading} onDefaultSearch={() => search(applied)}
      searchField={<TextField size="small" margin="none" placeholder="명세번호/출하번호/거래처/품목 검색" value={keyword}
        onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(applied); }}
        slotProps={{ htmlInput: { 'aria-label': '거래명세서현황 빠른 검색' } }}
        sx={{ width: '100%', height: 40, '& .MuiOutlinedInput-root': { height: '100%', borderRadius: '0 6px 6px 0' } }} />} />
    <PageMessageArea
      message={error}
      onClose={() => setError('')}
      horizontalPadding="grid"
    />
    {loaded && !loading && !error ? (
      <SearchResultMessage
        resultCount={rows.length}
        horizontalPadding="grid"
      />
    ) : null}
    <Box data-testid="sales-status-content" sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 2, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 360, flex: 1 }}>
      <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid ariaLabel="거래명세서현황 목록" rows={rows} columns={columns} rowKey="salesStatementDetailId"
          storageKey="sales-statement-status-grid-v1" loading={loading} showCheckbox={false} height="100%"
          minHeight={320} selectionMode="row" selectRowOnContextMenu={false} allowAddRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          canExportExcel={Boolean(props.selectedMenuPermissions?.excel)} />
      </Box>
    </Box>
    {selectedId !== null ? <StatementDetailPanel item={detail} loading={detailLoading} error={detailError}
      canEdit={Boolean(detail && (detailPermissions.update || detailPermissions.delete))}
      onClose={() => { if (!editor && !printing) { setSelectedId(null); setDetail(null); } }}
      onView={() => setEditor('view')} onEdit={() => setEditor('edit')} onPrint={() => setPrinting(true)} /> : null}
    {selectedId !== null && editor ? <StatementEditorDialog id={selectedId} mode={editor} page={props}
      permissions={detailPermissions} onClose={() => setEditor(null)}
      onSaved={() => { setEditor(null); setDetailRefresh((value) => value + 1); setRefresh((value) => value + 1); }}
      onDeleted={() => { setEditor(null); setSelectedId(null); setDetail(null); setRefresh((value) => value + 1); }} /> : null}
    {printing && detail ? <StatementPrint item={detail} onClose={() => setPrinting(false)} /> : null}
  </Box>;
}
