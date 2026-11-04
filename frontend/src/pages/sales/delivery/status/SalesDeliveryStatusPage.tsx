import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Link, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { F1Grid, type F1GridColumn } from '../../../../shared/components/f1-grid';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import type { MenuPermission, MenuTreeNode } from '../../../dashboard/types/dashboard';
import { defaultDeliveryFilters, getDeliveryStatus, restoreDeliveryFilters, validDeliveryPeriod } from '../create/services/salesDelivery.service';
import type { DeliveryFilters, DeliveryPageProps, DeliveryStatusRow } from '../create/types/salesDelivery.types';
import { DeliveryEditorDialog } from './components/DeliveryEditorDialog';

const SESSION_KEY = 's-erp:page:sales-delivery-status';
const fields: PageSearchField[] = [
  { field: 'deliveryDt', label: '납품일', type: 'date', required: true, searchSpan: 2 },
  { field: 'deliveryType', label: '납품구분', type: 'select', searchSpan: 1,
    options: [{ value: '', label: '전체' }, { value: 'DIRECT', label: '직납품' }, { value: 'ORDER', label: '수주납품' }] },
  { field: 'customerKeyword', label: '거래처', type: 'text', searchSpan: 1 },
  { field: 'materialKeyword', label: '품목', type: 'text', searchSpan: 1 },
  { field: 'deliveryNo', label: '납품번호', type: 'text', searchSpan: 1 },
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
  const [refresh, setRefresh] = useState(0);
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
    setLoading(true); setError(''); setInitialError(false);
    getDeliveryStatus(filters).then((items) => {
      if (active && token === request.current) { setRows(items); setHasLoaded(true); }
    }).catch((cause) => {
      if (active && token === request.current) {
        setError(cause instanceof Error ? cause.message : '납품현황 조회에 실패했습니다.');
        setInitialError(true);
      }
    }).finally(() => { if (active && token === request.current) setLoading(false); });
    return () => { active = false; };
  }, [filters, refresh, canRead]);
  const search = useCallback((values: SearchValues = detailValues) => {
    const next = filtersOf(keyword, values);
    if (!validDeliveryPeriod(next)) { setError('납품일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    setDetailValues(values); setFilters(next); setSession(next);
  }, [detailValues, keyword, setSession]);
  const columns = useMemo<F1GridColumn<DeliveryStatusRow>[]>(() => [
    { field: 'deliveryNo', headerName: '납품번호', width: 180, renderCell: ({ row }) => (
      <Link component="button" disabled={!canRead} onClick={(event) => {
        event.stopPropagation(); if (canRead) setSelectedId(row.salesDeliveryId);
      }} aria-label={`${row.deliveryNo} 상세 보기`} sx={{ fontSize: 'inherit' }}>{row.deliveryNo}</Link>
    ) },
    { field: 'deliveryDt', headerName: '납품일자', type: 'date', width: 120 },
    { field: 'deliveryType', headerName: '납품구분', width: 100, renderCell: ({ row }) => row.deliveryType === 'ORDER' ? '수주납품' : '직납품' },
    { field: 'customerCode', headerName: '거래처코드', width: 120 },
    { field: 'customerName', headerName: '거래처', width: 160 },
    { field: 'orderNo', headerName: '연결 수주번호', width: 180 },
    { field: 'materialCode', headerName: '품목코드', width: 120 },
    { field: 'materialName', headerName: '품목명', width: 180 },
    { field: 'unit', headerName: '단위', width: 80 },
    ...(['deliveryQty', 'unitPrice', 'supplyAmt', 'vatAmt', 'totalAmt'] as const).map((field, index) => ({
      field, headerName: ['납품수량', '단가', '공급가', 'VAT', '합계'][index],
      type: 'decimal' as const, decimalPlaces: 2, width: 130,
    })),
    { field: 'deliveryPlace', headerName: '납품장소', width: 180 },
    { field: 'deliveryMethod', headerName: '배송방법', width: 130 },
    { field: 'remark', headerName: '비고', width: 200 },
  ], [canRead]);
  if (!canRead) return <Alert severity="warning">납품현황 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={props.breadcrumbItems.length ? props.breadcrumbItems : [props.currentMenuName]} description={props.content.description}
      actionGroups={[{ key: 'read', actions: [{ label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => search(appliedValues) }] }]} />
    <PageMessageArea message={error} onClose={() => setError('')} />
    <PageLoadBoundary loading={loading} error={initialError && !hasLoaded ? 'server' : null} label="납품현황" onRetry={() => setRefresh((value) => value + 1)}>
      <PageSearchArea detailFields={fields} detailValues={detailValues} appliedDetailValues={appliedValues}
        defaultValues={defaultValues} onDetailValuesChange={setDetailValues} onDetailSearch={search}
        onDetailReset={() => {
          setKeyword(''); setDetailValues(defaultValues); setFilters(defaults); setSession(defaults);
        }} detailLoading={loading} onDefaultSearch={() => search(appliedValues)}
        searchField={<TextField fullWidth size="small" label="통합검색" value={keyword} onChange={(event) => setKeyword(event.target.value)} />} />
      {hasLoaded && !loading && !error ? <Typography sx={{ px: 2, py: 1 }} variant="body2">조회 결과 {rows.length}건</Typography> : null}
      <Box sx={{ p: { xs: 1, sm: 2 }, minWidth: 0, minHeight: 340, flex: 1, overflow: 'hidden' }}>
        <F1Grid ariaLabel="납품현황 목록" rows={rows} columns={columns} rowKey="salesDeliveryDetailId"
          storageKey="sales-delivery-status-grid-v1" loading={loading} showCheckbox={false} height="100%" minHeight={320}
          allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          canExportExcel={Boolean(permissions?.excel)} />
      </Box>
    </PageLoadBoundary>
    {selectedId !== null ? <DeliveryEditorDialog id={selectedId} page={props} permissions={detailPermissions}
      onClose={() => setSelectedId(null)} onChanged={() => setRefresh((value) => value + 1)} /> : null}
  </Box>;
}
