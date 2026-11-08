import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Box, IconButton, Link, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { MenuPermission, MenuTreeNode } from '../../../dashboard/types/dashboard';
import { defaultDeliveryFilters, getDelivery, getDeliveryStatus, restoreDeliveryFilters, validDeliveryPeriod } from '../create/services/salesDelivery.service';
import type { DeliveryFilters, DeliveryItem, DeliveryPageProps, DeliveryStatusRow } from '../create/types/salesDelivery.types';
import { DeliveryEditorDialog } from './components/DeliveryEditorDialog';
import { DeliveryStatusDetailPanel } from './components/DeliveryStatusDetailPanel';

const SESSION_KEY = 's-erp:page:sales-delivery-status';
const fields: PageSearchField[] = [
  { field: 'deliveryDt', label: '출하일', type: 'date', required: true, searchSpan: 2 },
  { field: 'deliveryType', label: '출하구분', type: 'select', searchSpan: 1,
    options: [{ value: '', label: '전체' }, { value: 'DIRECT', label: '직출하' }, { value: 'ORDER', label: '수주출하' }] },
  { field: 'customerKeyword', label: '거래처', type: 'text', searchSpan: 1 },
  { field: 'materialKeyword', label: '품목', type: 'text', searchSpan: 1 },
  { field: 'deliveryNo', label: '출하번호', type: 'text', searchSpan: 1 },
];
type SearchValues = Record<string, PageSearchFieldValue>;
function valuesOf(filters: DeliveryFilters): SearchValues {
  return { deliveryDt: { from: filters.deliveryDtFrom, to: filters.deliveryDtTo }, deliveryType: filters.deliveryType,
    customerKeyword: filters.customerKeyword, materialKeyword: filters.materialKeyword, deliveryNo: filters.deliveryNo };
}
function filtersOf(keyword: string, values: SearchValues): DeliveryFilters {
  const period = values.deliveryDt;
  const text = (key: string) => typeof values[key] === 'string' ? String(values[key]) : '';
  return { keyword, deliveryDtFrom: typeof period === 'object' && period ? period.from ?? '' : '',
    deliveryDtTo: typeof period === 'object' && period ? period.to ?? '' : '',
    deliveryType: text('deliveryType'), customerKeyword: text('customerKeyword'), materialKeyword: text('materialKeyword'),
    deliveryNo: text('deliveryNo') };
}
function registrationPermissions(nodes: MenuTreeNode[]): MenuPermission | undefined {
  for (const node of nodes) {
    if (!node.children?.length && node.pageKey === 'delivery-create') return node.permissions;
    const found = node.children && registrationPermissions(node.children);
    if (found) return found;
  }
}
export function SalesDeliveryStatusPage(props: DeliveryPageProps) {
  const { selectedMenuPermissions: permissions } = props;
  const [defaults] = useState(defaultDeliveryFilters);
  const { state: session, setState: setSession } = usePageSessionState<DeliveryFilters>(SESSION_KEY, defaults, {
    version: 1, validate: (value): value is DeliveryFilters => restoreDeliveryFilters(value, defaults) === value,
  });
  const [filters, setFilters] = useState(() => restoreDeliveryFilters(session, defaults));
  const [keyword, setKeyword] = useState(filters.keyword);
  const [detailValues, setDetailValues] = useState<SearchValues>(() => valuesOf(filters));
  const [rows, setRows] = useState<DeliveryStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialError, setInitialError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<DeliveryItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editorMode, setEditorMode] = useState<'view' | 'edit' | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const quietRefresh = useRef(false);
  const request = useRef(0);
  const canRead = Boolean(permissions?.read);
  const createPermissions = registrationPermissions(props.selectedModule.tree);
  const detailPermissions: MenuPermission = {
    read: canRead,
    create: false,
    update: Boolean(createPermissions?.update),
    delete: Boolean(createPermissions?.delete),
    excel: false,
  };
  const appliedValues = useMemo(() => valuesOf(filters), [filters]);
  const defaultValues = useMemo(() => valuesOf(defaults), [defaults]);
  useEffect(() => {
    if (!canRead) return;
    const token = ++request.current;
    let active = true;
    setLoading(!quietRefresh.current); quietRefresh.current = false; setError(''); setInitialError(false);
    getDeliveryStatus(filters).then((items) => {
      if (active && token === request.current) { setRows(items); setHasLoaded(true); }
    }).catch((cause) => {
      if (active && token === request.current) {
        setError(cause instanceof Error ? cause.message : '출하현황 조회에 실패했습니다.');
        setInitialError(true);
      }
    }).finally(() => { if (active && token === request.current) setLoading(false); });
    return () => { active = false; };
  }, [filters, refresh, canRead]);
  useEffect(() => {
    if (selectedId === null || !canRead) return;
    let active = true;
    setDetailLoading(true); setDetailError('');
    getDelivery(selectedId).then((item) => { if (active) setDetail(item); })
      .catch((cause) => { if (active) setDetailError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId, detailRefresh, canRead]);
  const closeEditor = useCallback(() => setEditorMode(null), []);
  const handleSaved = useCallback(() => {
    setEditorMode(null); setDetailRefresh((value) => value + 1);
    quietRefresh.current = true; setRefresh((value) => value + 1);
  }, []);
  const handleDeleted = useCallback(() => {
    setEditorMode(null); setSelectedId(null); setDetail(null);
    quietRefresh.current = true; setRefresh((value) => value + 1);
  }, []);
  const search = useCallback((values: SearchValues = detailValues) => {
    const next = filtersOf(keyword, values);
    if (!validDeliveryPeriod(next)) { setError('출하일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    setDetailValues(values); setFilters(next); setSession(next);
  }, [detailValues, keyword, setSession]);
  const columns = useMemo<F1GridColumn<DeliveryStatusRow>[]>(() => [
    { field: 'salesDeliveryDetailId', headerName: 'No', type: 'rownumber', width: 56, align: 'center', pinned: 'left', search: { hidden: true }, form: { hidden: true } },
    { field: 'deliveryNo', headerName: '출하번호', width: 140, align: 'center', mergeRows: true, renderCell: ({ row }) => (
      <Link component="button" type="button" underline="hover" disabled={!canRead} onClick={(event) => {
        event.stopPropagation(); if (canRead) { setDetail(null); setSelectedId(row.salesDeliveryId); }
      }} aria-label={`${row.deliveryNo} 상세 보기`} sx={{ position: 'relative', zIndex: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, fontSize: 'inherit', verticalAlign: 'baseline' }}>{row.deliveryNo}</Link>
    ) },
    { field: 'deliveryDt', headerName: '출하일자', type: 'date', width: 80, align: 'center', mergeRows: true },
    { field: 'customerCode', headerName: '거래처코드', width: 80, align: 'center', mergeRows: true },
    { field: 'customerName', headerName: '거래처명', width: 160, align: 'center', mergeRows: true },
    { field: 'orderNo', headerName: '연결 수주번호', width: 140, align: 'center', mergeRows: true },
    { field: 'deliveryType', headerName: '출하구분', width: 80, align: 'center', mergeRows: true, renderCell: ({ row }) => row.deliveryType === 'ORDER' ? '수주출하' : '직출하' },
    { field: 'deliveryPlace', headerName: '출하장소', width: 150, align: 'left', mergeRows: true },
    { field: 'deliveryMethod', headerName: '배송방법', width: 110, align: 'left', mergeRows: true },
    { field: 'lineNo', headerName: '행', width: 56, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'center' },
    { field: 'unit', headerName: '단위', width: 80, align: 'center' },
    ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt'] as const).map((field, index) => ({
      field, headerName: ['출하수량', '단가', '공급가', 'VAT', '합계'][index],
      type: 'decimal' as const, decimalPlaces: 2, width: 130, align: 'right' as const,
    })),
    { field: 'remark', headerName: '비고', width: 200, align: 'left', mergeRows: true },
  ], [canRead]);
  if (!canRead) return <Alert severity="warning">출하현황 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={props.breadcrumbItems.length ? props.breadcrumbItems : [props.currentMenuName]} description={props.content.description}
      actionGroups={[{ key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => search(appliedValues) }] }]} />
    <PageLoadBoundary loading={loading} error={initialError && !hasLoaded ? 'server' : null} label="출하현황" onRetry={() => setRefresh((value) => value + 1)}>
      <PageSearchArea detailFields={fields} detailValues={detailValues} appliedDetailValues={appliedValues}
        defaultValues={defaultValues} onDetailValuesChange={setDetailValues} onDetailSearch={search}
        onDetailReset={() => {
          setKeyword(''); setDetailValues(defaultValues); setFilters(defaults); setSession(defaults);
        }} detailLoading={loading} onDefaultSearch={() => search(appliedValues)}
        searchField={<TextField size="small" margin="none" placeholder="출하번호/거래처/품목/수주번호 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(appliedValues); }}
          slotProps={{ htmlInput: { 'aria-label': '출하현황 빠른 검색' }, input: { endAdornment: keyword ? (
            <IconButton type="button" size="small" edge="end" aria-label="출하현황 검색어 초기화" onClick={() => setKeyword('')} sx={{ p: 0.25 }}><ClearIcon fontSize="small" /></IconButton>
          ) : null } }}
          sx={(theme) => ({ width: '100%', height: 40, '& .MuiOutlinedInput-root': { height: '100%', borderRadius: '0 8px 8px 0', backgroundColor: theme.palette.background.paper } })} />} />
      <PageMessageArea message={error} onClose={() => setError('')} />
      {hasLoaded && !loading && !error ? <SearchResultMessage resultCount={rows.length} /> : null}
      <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2, pt: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 360, flex: 1 }}>
        <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid ariaLabel="출하현황 목록" rows={rows} columns={columns} rowKey="salesDeliveryDetailId"
          storageKey="sales-delivery-status-grid-v1" loading={loading} showCheckbox={false} height="100%" minHeight={320}
          selectionMode="row" selectRowOnContextMenu={false}
          allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          canExportExcel={Boolean(permissions?.excel)} />
        </Box>
      </Box>
    </PageLoadBoundary>
    {selectedId !== null ? <DeliveryStatusDetailPanel item={detail} loading={detailLoading} error={detailError}
      canEdit={Boolean(detail && (detailPermissions.update || detailPermissions.delete))}
      onClose={() => { if (!editorMode) { setSelectedId(null); setDetail(null); } }}
      onView={() => setEditorMode('view')} onEdit={() => setEditorMode('edit')} /> : null}
    {selectedId !== null && editorMode ? <DeliveryEditorDialog id={selectedId} mode={editorMode} page={props} permissions={detailPermissions}
      onClose={closeEditor} onSaved={handleSaved} onDeleted={handleDeleted} /> : null}
  </Box>;
}
