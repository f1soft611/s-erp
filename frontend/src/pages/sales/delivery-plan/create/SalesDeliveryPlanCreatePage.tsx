import { useMemo, useState } from 'react';
import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { DeliveryPlanRequest, DeliveryPlanPageProps, PlanSourceOrderRow } from '../types/salesDeliveryPlan.types';
import { createDeliveryPlan, getDeliveryPlanByOrder, searchPlanSourceOrders, updateDeliveryPlan, validateDeliveryPlan } from '../services/salesDeliveryPlan.service';

type PlanRow = DeliveryPlanRequest['details'][number] & {
  rowId: string;
  materialId: number;
  materialCode: string;
  materialName: string;
  unit: string | null;
  orderQty: number;
};

function createRequest(order: PlanSourceOrderRow[], rows: PlanRow[]): DeliveryPlanRequest {
  return {
    salesOrderId: order[0]?.salesOrderId ?? 0,
    details: rows.map(({ salesDeliveryPlanDetailId, salesOrderDetailId, planDt, plannedQty }) => ({
      salesDeliveryPlanDetailId, salesOrderDetailId, planDt, plannedQty,
    })),
  };
}

export function SalesDeliveryPlanCreatePage({
  currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions,
  deliveryPlanMode = 'MANUAL',
}: DeliveryPlanPageProps) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [sourceRows, setSourceRows] = useState<PlanSourceOrderRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PlanSourceOrderRow[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [planNo, setPlanNo] = useState('');
  const [planId, setPlanId] = useState<number | null>(null);
  const canRead = Boolean(permissions?.read);
  const canSelectOrder = canRead && !saving
    && (deliveryPlanMode === 'AUTO' ? Boolean(permissions?.update) : Boolean(permissions?.create));
  const canWrite = canRead && !saving
    && (planId === null ? deliveryPlanMode === 'MANUAL' && Boolean(permissions?.create)
      : Boolean(permissions?.update));
  const request = useMemo(() => createRequest(selectedOrder, rows), [selectedOrder, rows]);

  const search = async () => {
    setLoading(true);
    setError('');
    try { setSourceRows(await searchPlanSourceOrders(keyword)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '수주 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const selectOrder = async (orderId: number) => {
    const order = sourceRows.filter((row) => row.salesOrderId === orderId);
    setSelectedOrder(order);
    setRows(order.map((row, index) => ({
      rowId: `${row.salesOrderDetailId}-${index}`, salesDeliveryPlanDetailId: null,
      salesOrderDetailId: row.salesOrderDetailId, planDt: row.planDt, plannedQty: Number(row.orderQty),
      materialId: row.materialId, materialCode: row.materialCode, materialName: row.materialName,
      unit: row.unit, orderQty: Number(row.orderQty),
    })));
    setPlanNo('');
    setPlanId(null);
    setNotice('');
    setError('');
    setSourceOpen(false);
    if (deliveryPlanMode !== 'AUTO') return;

    setLoading(true);
    try {
      const saved = await getDeliveryPlanByOrder(orderId);
      setPlanId(saved.salesDeliveryPlanId);
      setPlanNo(saved.planNo);
      setRows(saved.details.map((detail) => ({
        rowId: String(detail.salesDeliveryPlanDetailId),
        salesDeliveryPlanDetailId: detail.salesDeliveryPlanDetailId,
        salesOrderDetailId: detail.salesOrderDetailId,
        planDt: detail.planDt,
        plannedQty: Number(detail.plannedQty),
        materialId: detail.materialId,
        materialCode: detail.materialCode,
        materialName: detail.materialName,
        unit: detail.unit,
        orderQty: Number(detail.orderQty),
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '기존 출하계획을 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!canWrite) return;
    const message = validateDeliveryPlan(request, selectedOrder);
    if (message) { setError(message); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = planId === null
        ? await createDeliveryPlan(request)
        : await updateDeliveryPlan(planId, request);
      setPlanId(saved.salesDeliveryPlanId);
      setPlanNo(saved.planNo);
      setNotice(`${planId === null ? '출하계획이 등록' : '출하계획이 수정'}되었습니다. 계획번호: ${saved.planNo}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '출하계획 저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const createNew = () => {
    setSourceOpen(false);
    setKeyword('');
    setSourceRows([]);
    setSelectedOrder([]);
    setRows([]);
    setPlanNo('');
    setPlanId(null);
    setNotice('');
    setError('');
  };

  const actions: PermissionActionGroupDefinition[] = [{
    key: 'write',
    actions: [
      { label: '신규', icon: NoteAddOutlinedIcon, visible: canRead, disabled: !canSelectOrder, onClick: createNew },
      { label: '수주 선택', icon: SearchIcon, visible: canRead, disabled: !canSelectOrder || planId !== null, onClick: () => setSourceOpen(true) },
      { label: planId === null ? '저장' : '수정 저장', icon: SaveIcon, visible: canRead, saving,
        disabled: !canWrite || !selectedOrder.length || (deliveryPlanMode === 'AUTO' && planId === null),
        onClick: () => void save() },
    ],
  }];

  if (!canRead) return <Alert severity="warning">출하계획등록 조회 권한이 없습니다.</Alert>;

  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
      description={content.description} actionGroups={actions} />
    <Box role="region" aria-label="출하계획 입력 내용"
      sx={{ p: { xs: 1.5, sm: 2, lg: 3 }, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, overflow: 'auto', gap: 2 }}>
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>출하계획 기본정보</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
          <TextField size="small" label="계획번호" value={planNo || '저장 시 자동 채번'} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="수주번호" value={selectedOrder[0]?.orderNo ?? ''} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="수주일자" value={selectedOrder[0]?.orderDt ?? ''} slotProps={{ input: { readOnly: true } }} />
          <TextField size="small" label="거래처" value={selectedOrder[0]?.customerName ?? ''} slotProps={{ input: { readOnly: true } }} />
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 320, minWidth: 0, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: { xs: 1.5, sm: 2 } }}>
          <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>출하계획 상세</Typography>
            <Typography variant="caption" color="text.secondary">같은 수주 품목을 예정일별로 분할할 수 있습니다.</Typography></Box>
        </Box>
        <TableContainer sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 780 }} aria-label="출하계획 상세 목록">
            <TableHead><TableRow>
              <TableCell>행</TableCell><TableCell>품목코드</TableCell><TableCell>품목명</TableCell>
              <TableCell align="right">수주수량</TableCell><TableCell>계획일</TableCell>
              <TableCell align="right">계획수량</TableCell><TableCell align="right">합계</TableCell><TableCell>분할</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.map((row, index) => {
              const total = rows.filter((item) => item.salesOrderDetailId === row.salesOrderDetailId)
                .reduce((sum, item) => sum + Number(item.plannedQty), 0);
              return <TableRow key={row.rowId}>
                <TableCell>{index + 1}</TableCell><TableCell>{row.materialCode}</TableCell>
                <TableCell>{row.materialName}</TableCell><TableCell align="right">{row.orderQty.toLocaleString()}</TableCell>
                <TableCell><TextField type="date" size="small" value={row.planDt ?? ''} disabled={!canWrite}
                  onChange={(event) => setRows((current) => current.map((item) => item.rowId === row.rowId
                    ? { ...item, planDt: event.target.value || null } : item))}
                  slotProps={{ inputLabel: { shrink: true } }} /></TableCell>
                <TableCell align="right"><TextField size="small" type="number" value={row.plannedQty}
                  disabled={!canWrite} slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                  onChange={(event) => setRows((current) => current.map((item) => item.rowId === row.rowId
                    ? { ...item, plannedQty: Number(event.target.value) } : item))} /></TableCell>
                <TableCell align="right" sx={{ color: total > row.orderQty ? 'error.main' : 'text.primary' }}>
                  {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                <TableCell><Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button size="small" startIcon={<AddIcon />} disabled={!canWrite}
                    onClick={() => setRows((current) => [...current, {
                      ...row, rowId: `split-${crypto.randomUUID()}`, salesDeliveryPlanDetailId: null,
                      planDt: null, plannedQty: 0,
                    }])}>분할</Button>
                  {rows.filter((item) => item.salesOrderDetailId === row.salesOrderDetailId).length > 1
                    ? <Button size="small" color="error" aria-label="분할행 삭제"
                      disabled={!canWrite}
                      onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))}>
                      <DeleteOutlinedIcon fontSize="small" />
                    </Button> : null}
                </Box></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
    <CommonDialog open={sourceOpen} onClose={() => setSourceOpen(false)} title="계획대상 수주 선택"
      size="lg" fullScreenOnMobile actions={<Button onClick={() => setSourceOpen(false)}>닫기</Button>}>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); void search(); }}
        sx={{ display: 'flex', gap: 1, mb: 2, minWidth: 0 }}>
        <TextField fullWidth size="small" label="수주번호·거래처 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={<SearchIcon />}>검색</Button>
      </Box>
      <PageMessageArea message={error} />
      <SearchResultMessage resultCount={sourceRows.length} />
      <TableContainer sx={{ maxHeight: '55vh', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700 }} aria-label="계획대상 수주 목록">
          <TableHead><TableRow><TableCell>수주번호</TableCell><TableCell>수주일자</TableCell>
            <TableCell>거래처</TableCell><TableCell>품목</TableCell><TableCell align="right">수주수량</TableCell>
            <TableCell /></TableRow></TableHead>
          <TableBody>{sourceRows.map((row) => <TableRow key={row.salesOrderDetailId}>
            <TableCell>{row.orderNo}</TableCell><TableCell>{row.orderDt}</TableCell><TableCell>{row.customerName}</TableCell>
            <TableCell>{row.materialName}</TableCell><TableCell align="right">{Number(row.orderQty).toLocaleString()}</TableCell>
            <TableCell><Button size="small" onClick={() => selectOrder(row.salesOrderId)}>선택</Button></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    </CommonDialog>
  </Box>;
}
