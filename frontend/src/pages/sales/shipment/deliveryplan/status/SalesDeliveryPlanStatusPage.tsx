import { useNotification } from '../../../../../shared/context/notification';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isApiNetworkError } from '../../../../../shared/services/apiErrors';
import { Alert, Box, Button, Chip, Divider, IconButton, Link, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { COMMON_DIALOG_BODY_PADDING } from '../../../../../shared/components/commonDialogLayout';
import { ProfileAvatar } from '../../../../../shared/components/ProfileAvatar';
import { resetGridDecimalPolicyCache } from '../../../../../shared/services/gridDecimalPolicy.service';
import { PageLoadBoundary } from '../../../../../shared/components/PageLoadBoundary';
import { useInitialLoadState } from '../../../../../shared/hooks/useInitialLoadState';
import { PageHeader } from '../../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import { F1Grid, F1GridHighlightText, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { usePolicyDecimalStatus } from '../../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';
import { decimalColumnOptions, getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import { SalesDecimalPolicyError } from '../../../shared/SalesDecimalPolicyError';
import { formatSalesOrderAmount, subtractExactSalesDecimals } from '../../../order/create/data/salesOrderAmounts';
import { useCommonConfirmDialog } from '../../../../../shared/hooks/useCommonConfirmDialog';
import { DeliveryPlanForm } from '../components/DeliveryPlanForm';
import type { PageSearchField, PageSearchFieldValue } from '../../../../../shared/components/page-search/searchFields';
import type { MenuTreeNode } from '../../../../dashboard/types/dashboard';
import { SearchResultMessage } from '../../../../../shared/components/SearchResultMessage';
import type { PermissionActionGroupDefinition } from '../../../../../shared/components/PermissionGroup';
import type { DeliveryPlanDetail, DeliveryPlanFilters, DeliveryPlanItem, DeliveryPlanPageProps, DeliveryPlanStatusRow, PlanRow } from '../types/salesDeliveryPlan.types';
import { defaultDeliveryPlanFilters, getDeliveryPlan, getDeliveryPlanStatus, planRowsFromDetails, updateDeliveryPlan, validDeliveryPlanPeriod, validateDeliveryPlan } from '../services/salesDeliveryPlan.service';

const fields: PageSearchField[] = [
  { field: 'planDt', label: '계획일', type: 'date', required: true, searchSpan: 2 },
];
type SearchValues = Record<string, PageSearchFieldValue>;

function registrationCanUpdate(nodes: MenuTreeNode[]): boolean {
  return nodes.some((node) => (
    (!node.children?.length && node.pageKey === 'delivery-plan-create'
      && Boolean(node.permissions?.read && node.permissions.update))
    || Boolean(node.children && registrationCanUpdate(node.children))
  ));
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{children || '-'}</Typography>
  </Box>;
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return <Box role="group" aria-label={title} sx={{ minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 1.5, sm: 2 }, bgcolor: 'background.paper' }}>
    <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>{children}</Box>
  </Box>;
}

export function SalesDeliveryPlanStatusPage({
  currentMenuName, content, breadcrumbItems, selectedModule, selectedMenuPermissions: permissions,
}: DeliveryPlanPageProps) {
  const policyState = usePolicyDecimalStatus();
  const policy = policyState.rule;
  const policyReady = policyState.status === 'ready' || policyState.status === 'unmanaged';
  const quantityRule = policy && ('places' in policy ? policy : policy.number);
  const plannedColumn = getDecimalColumnContract('sales.deliveryPlan').plannedQty;
  const plannedRule = policy && resolveDecimalColumn(plannedColumn, policy);
  const { confirm, dialog } = useCommonConfirmDialog();
  const [filters, setFilters] = useState<DeliveryPlanFilters>(() => defaultDeliveryPlanFilters());
  const { start: startLoad, succeed: succeedLoad, fail: failLoad, ...initialLoad } = useInitialLoadState({ networkOnly: true });
  const [rows, setRows] = useState<DeliveryPlanStatusRow[]>([]);
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [selected, setSelected] = useState<DeliveryPlanItem | DeliveryPlanStatusRow | null>(null);
  const [details, setDetails] = useState<DeliveryPlanDetail[]>([]);
  const [editRows, setEditRows] = useState<PlanRow[]>([]);
  const editGridRef = useRef<F1GridRef<PlanRow>>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  // 수정 창 저장 중(목록 로딩과 분리: 저장 중에도 현황 목록은 그대로 둔다)
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);
  const [error, setError] = useState('');
  // 수정 창 안에서만 보여 줄 실패 메시지(현황 화면 메시지 영역과 분리)
  const [dialogError, setDialogError] = useState('');
  const { showSuccess } = useNotification();
  const [detailValues, setDetailValues] = useState<SearchValues>(() => ({
    planDt: { from: filters.planDtFrom, to: filters.planDtTo },
  }));
  const appliedValues = useMemo<SearchValues>(() => ({
    planDt: { from: filters.planDtFrom, to: filters.planDtTo },
  }), [filters]);

  // quiet: 수정 창 저장 후 재조회처럼 목록 로딩 표시 없이 갱신한다.
  const runSearch = useCallback(async (next: DeliveryPlanFilters, { quiet = false }: { quiet?: boolean } = {}) => {
    if (!validDeliveryPlanPeriod(next)) { setError('계획일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    if (!quiet) setLoading(true);
    setError('');
    startLoad();
    try { setRows(await getDeliveryPlanStatus(next)); setAppliedKeyword(next.keyword.trim()); succeedLoad(); }
    catch (cause) { failLoad(cause); if (!isApiNetworkError(cause)) setError(cause instanceof Error ? cause.message : '출하계획 현황 조회에 실패했습니다.'); }
    finally { if (!quiet) setLoading(false); }
  }, [startLoad, succeedLoad, failLoad]);

  const search = () => runSearch(filters);
  useEffect(() => {
    let active = true;
    startLoad();
    getDeliveryPlanStatus(defaultDeliveryPlanFilters())
      .then((result) => { if (active) { setRows(result); succeedLoad(); } })
      .catch((cause) => {
        if (!active) return;
        failLoad(cause);
        if (!isApiNetworkError(cause)) setError(cause instanceof Error ? cause.message : '출하계획 현황 조회에 실패했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [startLoad, succeedLoad, failLoad]);

  const open = useCallback(async (row: DeliveryPlanStatusRow) => {
    setSelected(row);
    setDetails([]);
    setEditRows([]);
    setDetailLoading(true);
    setDetailLoaded(false);
    setError('');
    setDialogMode(null);
    try {
      const item = await getDeliveryPlan(row.salesDeliveryPlanId);
      setSelected(item);
      setDetails(item.details);
      setEditRows(planRowsFromDetails(item.details));
      setDetailLoaded(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '출하계획 상세 조회에 실패했습니다.'); }
    finally { setDetailLoading(false); }
  }, []);

  const save = async () => {
    if (!selected || !policyReady) return;
    const request = {
      ...(policy ? { decimalPolicy: policy, decimalColumns: getDecimalColumnContract('sales.deliveryPlan') } : {}),
      details: (editGridRef.current?.getActiveRows() ?? editRows).map((row) => ({
        salesDeliveryPlanDetailId: row.salesDeliveryPlanDetailId,
        salesOrderId: row.salesOrderId,
        salesOrderDetailId: row.salesOrderDetailId,
        planDt: row.planDt,
        plannedQty: row.plannedQty,
      })),
    };
    const message = validateDeliveryPlan(request, details, plannedRule);
    const gridValid = editGridRef.current?.validate() ?? true;
    if (message || !gridValid) { if (message) setDialogError(message); return; }
    setSaving(true);
    setDialogError('');
    try {
      const updated = await updateDeliveryPlan(selected.salesDeliveryPlanId, request);
      setDetails(updated.details);
      setEditRows(planRowsFromDetails(updated.details));
      setDialogMode(null);
      showSuccess(`출하계획 ${updated.planNo}이 수정되었습니다.`);
      await runSearch(filters, { quiet: true });
    } catch (cause) { setDialogError(cause instanceof Error ? cause.message : '출하계획 수정에 실패했습니다.'); }
    finally { setSaving(false); }
  };

  const actions: PermissionActionGroupDefinition[] = [{
    key: 'read',
    actions: [{
      label: '조회', icon: SearchIcon, visible: Boolean(permissions?.read),
      disabled: loading, onClick: () => void search(),
    }],
  }];
  const columns = useMemo<F1GridColumn<DeliveryPlanStatusRow>[]>(() => [
    { field: 'salesDeliveryPlanId', headerName: 'No', type: 'rownumber', width: 56, align: 'center' },
    { field: 'planNo', headerName: '계획번호', width: 150, align: 'center', mergeRows: true, highlightSearch: true,
      renderCell: ({ row, highlightKeyword }) => <Link component="button" type="button" underline="hover" aria-label={`${row.planNo} 상세 보기`}
        onClick={(event) => { event.stopPropagation(); void open(row); }}
        sx={{ position: 'relative', zIndex: 1, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', fontWeight: 600, fontSize: 'inherit', verticalAlign: 'baseline' }}>
        {highlightKeyword ? <F1GridHighlightText text={row.planNo} keyword={highlightKeyword} /> : row.planNo}</Link> },
    { field: 'orderNo', headerName: '수주번호', width: 150, align: 'center', highlightSearch: true },
    { field: 'orderDt', headerName: '수주일자', type: 'date', width: 100, align: 'center' },
    { field: 'customerName', headerName: '거래처', width: 180, align: 'left', highlightSearch: true },
    { field: 'planDt', headerName: '계획일', type: 'date', width: 100, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 120, align: 'center', highlightSearch: true },
    { field: 'materialName', headerName: '품목명', width: 180, align: 'left', highlightSearch: true },
    { field: 'orderQty', headerName: '수주수량', ...decimalColumnOptions(getDecimalColumnContract('sales.order'), 'orderQty'), exactDecimal: true, width: 110, align: 'right' },
    { field: 'plannedQty', headerName: '계획수량', ...decimalColumnOptions(getDecimalColumnContract('sales.deliveryPlan'), 'plannedQty'),
      exactDecimal: true, width: 110, align: 'right' },
    { field: 'deliveredQty', headerName: '출하수량', ...decimalColumnOptions(getDecimalColumnContract('sales.delivery'), 'deliveryQty'), exactDecimal: true, width: 110, align: 'right' },
    { field: 'remainingQty', headerName: '출하잔량', ...decimalColumnOptions(getDecimalColumnContract('sales.delivery'), 'deliveryQty'), exactDecimal: true, width: 110, align: 'right' },
  ], [open, plannedColumn]);
  if (!permissions?.read) return <Alert severity="warning">출하계획 현황 조회 권한이 없습니다.</Alert>;

  const canEdit = Boolean(permissions.update || registrationCanUpdate(selectedModule.tree));
  const closeDialog = async () => {
    if (saving) return;
    if (
      dialogMode === 'edit' &&
      JSON.stringify(editGridRef.current?.getActiveRows() ?? editRows) !== JSON.stringify(planRowsFromDetails(details)) &&
      !(await confirm({
        description: '저장되지 않은 출하계획 내용이 있습니다. 닫으시겠습니까?',
      }))
    ) {
      return;
    }
    setDialogMode(null);
    setEditRows(planRowsFromDetails(details));
    setDialogError('');
  };
  const orderNumbers = Array.from(new Set(details.map((detail) => detail.orderNo))).join(', ');
  const orderDates = Array.from(new Set(details.map((detail) => detail.orderDt))).join(', ');
  const customerNames = Array.from(new Set(details.map((detail) => detail.customerName))).join(', ');
  const customerCodes = Array.from(new Set(details.map((detail) => detail.customerCode))).join(', ');
  const planDates = Array.from(new Set(details.map((detail) => detail.planDt ?? '').filter(Boolean))).join(', ');
  const selectedOrderNumbers = orderNumbers || (selected && 'orderNo' in selected ? selected.orderNo : '');
  const selectedOrderDates = orderDates || (selected && 'orderDt' in selected ? selected.orderDt : '');
  const selectedCustomerNames = customerNames || (selected && 'customerName' in selected ? selected.customerName : '');
  const selectedCustomerCodes = customerCodes || (selected && 'customerCode' in selected ? selected.customerCode : '');
  const selectedPlanDates = planDates;
  const formatQuantity = (value: number | string, rule = quantityRule) => {
    try { return formatSalesOrderAmount(value, rule); }
    catch { return '표현 불가'; }
  };
  const formatDifference = (left: number | string, right: number | string) => {
    if (!quantityRule) return '-';
    try {
      return formatQuantity(subtractExactSalesDecimals(String(left), String(right), quantityRule));
    } catch { return '표현 불가'; }
  };
  const detailTable = <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
    <Table size="small" sx={{ minWidth: 660, '& .MuiTableCell-head': { bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' },
      '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': { borderBottom: 0 } }} aria-label="출하계획 상세 목록">
      <TableHead><TableRow><TableCell>품목코드</TableCell><TableCell>품목명</TableCell>
        <TableCell>계획일</TableCell><TableCell align="right">수주수량</TableCell>
        <TableCell align="right">계획수량</TableCell><TableCell align="right">출하</TableCell>
        <TableCell align="right">미출하수량</TableCell><TableCell align="right">초과출하</TableCell></TableRow></TableHead>
      <TableBody>{details.map((detail) => <TableRow key={detail.salesDeliveryPlanDetailId} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
        <TableCell><Typography variant="caption" color="text.secondary">{detail.materialCode}</Typography></TableCell>
        <TableCell sx={{ minWidth: 120 }}><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{detail.materialName}</Typography></TableCell>
        <TableCell>{detail.planDt ?? '-'}</TableCell>
        <TableCell align="right">{formatQuantity(detail.orderQty)}</TableCell>
        <TableCell align="right">{formatQuantity(detail.plannedQty, plannedRule)}</TableCell>
        <TableCell align="right">{formatQuantity(detail.deliveredQty)}</TableCell>
        <TableCell align="right">{formatDifference(detail.plannedQty, detail.deliveredQty)}</TableCell>
        <TableCell align="right">{formatDifference(detail.deliveredQty, detail.plannedQty)}</TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </TableContainer>;
  return <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
      description={content.description} actionGroups={actions} />
    <PageLoadBoundary {...initialLoad} error={initialLoad.error ?? (policyState.network ? 'network' : null)} label="출하계획현황"
      onRetry={() => { if (policyState.network) resetGridDecimalPolicyCache(); void runSearch(filters); }}>
    <PageSearchArea detailFields={fields} detailValues={detailValues} appliedDetailValues={appliedValues}
      onDetailValuesChange={setDetailValues} onDetailSearch={(values) => {
        const period = values.planDt;
        const next = { ...filters, planDtFrom: typeof period === 'object' && period ? period.from ?? '' : '',
          planDtTo: typeof period === 'object' && period ? period.to ?? '' : '' };
        if (!validDeliveryPlanPeriod(next)) { setError('계획일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
        setFilters(next); void runSearch(next);
      }} onDetailReset={() => {
        const next = defaultDeliveryPlanFilters();
        setFilters(next); setDetailValues({ planDt: { from: next.planDtFrom, to: next.planDtTo } }); void runSearch(next);
      }} detailLoading={loading} onDefaultSearch={() => void search()}
      searchField={<TextField size="small" margin="none" placeholder="계획번호/수주번호/거래처/품목 검색"
        value={filters.keyword} onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))}
        onKeyDown={(event) => { if (event.key === 'Enter') void search(); }}
        slotProps={{ htmlInput: { 'aria-label': '출하계획현황 빠른 검색' } }}
        sx={(theme) => ({ width: '100%', height: 40, '& .MuiOutlinedInput-root': {
          height: '100%', borderRadius: '0 4px 4px 0', backgroundColor: theme.palette.background.paper,
        } })} />} />
    <Box data-testid="sales-status-content" sx={{ px: 2, pt: 2, pb: 2, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1 }}>
      <PageMessageArea
        message={error}
        onClose={() => setError('')}
        horizontalPadding="none"
        salesSpacing="contained"
      />
      <SearchResultMessage
        resultCount={rows.length}
        horizontalPadding="none"
        salesSpacing="contained"
      />
      <Box data-testid="delivery-plan-status-grid-shell" sx={{ flex: 1, minHeight: 240, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid storageKey="sales-delivery-plan-status-grid-v1" ariaLabel="출하계획 현황 목록" rows={rows} columns={columns} rowKey="salesDeliveryPlanDetailId" highlightKeyword={appliedKeyword}
          loading={loading} showCheckbox={false} height="100%" minHeight={240} selectionMode="row"
          allowAddRowInContextMenu={false} allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          canExportExcel={Boolean(permissions?.excel)} />
      </Box>
    </Box>
    </PageLoadBoundary>
      {selected ? <PageAreaOverlay onClose={() => setSelected(null)}>
      <PostDetailPanel title="출하계획 상세" subtitle={`계획번호: ${selected.planNo}`}
        onClose={() => setSelected(null)} isLoading={detailLoading} loadingLabel="출하계획 상세를 불러오는 중입니다.">
        <PageMessageArea message={error} onClose={() => setError('')} />
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 220px' }}>
              <ProfileAvatar name={selected.createdByName || selected.createdBy || '-'} imageUrl={selected.createdByProfileImage}
                fallback={(selected.createdByName || selected.createdBy || '-').slice(0, 1)} sx={{ width: 40, height: 40, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}><Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{selected.createdByName || selected.createdBy || '-'}</Typography>
                <Typography variant="caption" color="text.secondary">작성자 · 등록 {selected.createdAt ?? '-'}</Typography></Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip size="small" color="primary" label="출하계획" /><Divider orientation="vertical" flexItem />
              <IconButton size="small" aria-label="출하계획 더보기" aria-haspopup="menu" aria-expanded={Boolean(anchor)}
                disabled={detailLoading || !detailLoaded} onClick={(event) => setAnchor(event.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton>
              <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                <MenuItem onClick={() => { setAnchor(null); setEditRows(planRowsFromDetails(details)); setDialogError(''); setDialogMode('view'); }}>자세히보기</MenuItem>
                {canEdit ? <MenuItem onClick={() => { setAnchor(null); setEditRows(planRowsFromDetails(details)); setDialogError(''); setDialogMode('edit'); }}>수정</MenuItem> : null}
              </Menu>
            </Stack>
          </Stack>
          <Box aria-label="출하계획 요약" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
            alignItems: 'center', gap: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" component="div">수주번호</Typography>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{selectedOrderNumbers || '-'}</Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>거래처</Typography>
              <Typography variant="body1" component="div" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{selectedCustomerNames || '-'}</Typography>
              <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                <InfoItem label="계획번호">{selected.planNo}</InfoItem>
                <InfoItem label="수주일자">{selectedOrderDates}</InfoItem>
              </Stack>
            </Box>
          </Box>
          <Box aria-label="출하계획 기본정보" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
            <InfoGroup title="출하계획 정보"><InfoItem label="계획번호">{selected.planNo}</InfoItem><InfoItem label="계획일">{selectedPlanDates}</InfoItem></InfoGroup>
            <InfoGroup title="거래처 정보"><InfoItem label="거래처코드">{selectedCustomerCodes}</InfoItem><InfoItem label="수주일자">{selectedOrderDates}</InfoItem></InfoGroup>
          </Box>
          <Box sx={{ minWidth: 0 }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>출하계획 품목</Typography>
            <Chip size="small" variant="outlined" label={`${details.length}건`} /></Stack>
            {detailTable}</Box>
        </Stack>
      </PostDetailPanel></PageAreaOverlay> : null}
    {selected && dialogMode ? <CommonDialog open title={dialogMode === 'edit' ? '출하계획 수정' : '출하계획 상세보기'}
      onClose={closeDialog} size="lg" bodyMode="fill" disableBodyGutters paperHeight="min(900px, 92vh)" fullScreenOnMobile
      actions={dialogMode === 'edit' ? <><Button variant="contained" disabled={saving || !policyReady} onClick={() => void save()}>저장</Button>
        <Button disabled={saving} onClick={closeDialog}>취소</Button></> : <Button onClick={closeDialog}>닫기</Button>}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ ...COMMON_DIALOG_BODY_PADDING, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, overflowX: 'hidden', overflowY: 'auto', gap: 2 }}>
        {/* 등록 화면(embedded)과 같이 본문 레이아웃(gap)에 바로 놓아 여백·폭을 맞춘다. */}
        {dialogError ? <Alert severity="error" onClose={() => setDialogError('')}>{dialogError}</Alert> : null}
        <SalesDecimalPolicyError status={policyState.status} network={policyState.network} />
        <DeliveryPlanForm gridRef={editGridRef} storageKey="sales-delivery-plan-status-details-v1" planNo={selected.planNo} orderNo={selectedOrderNumbers} orderDt={selectedOrderDates}
          customerName={selectedCustomerNames} rows={editRows} setRows={setEditRows} editable={dialogMode === 'edit' && !saving && policyReady}
          canSelectOrder={false} onSelectOrder={() => undefined} />
      </Box>
      </Box>
    </CommonDialog> : null}
    {dialog}
  </Box>;
}
