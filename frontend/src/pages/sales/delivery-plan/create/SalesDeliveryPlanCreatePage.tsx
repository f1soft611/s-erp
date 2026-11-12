import { useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, TextField } from '@mui/material';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { CommonDialog } from '../../../../shared/components/CommonDialog';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../shared/components/f1-grid';
import { DeliveryPlanForm } from '../components/DeliveryPlanForm';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { DeliveryPlanRequest, DeliveryPlanPageProps, PlanRow, PlanSourceOrderRow } from '../types/salesDeliveryPlan.types';
import { createDeliveryPlan, getDeliveryPlanByOrder, planRowsFromDetails, searchPlanSourceOrders, updateDeliveryPlan, validateDeliveryPlan } from '../services/salesDeliveryPlan.service';

function sourceKey(row: Pick<PlanSourceOrderRow, 'salesOrderId' | 'salesOrderDetailId'>) {
  return `${row.salesOrderId}:${row.salesOrderDetailId}`;
}

function createRequest(rows: PlanRow[]): DeliveryPlanRequest {
  return {
    details: rows.map(({ salesDeliveryPlanDetailId, salesOrderId, salesOrderDetailId, planDt, plannedQty }) => ({
      salesDeliveryPlanDetailId, salesOrderId, salesOrderDetailId, planDt, plannedQty,
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
  const [selectedSourceKeys, setSelectedSourceKeys] = useState<(string | number)[]>([]);
  const [selectedSources, setSelectedSources] = useState<PlanSourceOrderRow[]>([]);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const gridRef = useRef<F1GridRef<PlanRow>>(null);
  const sourceGridRef = useRef<F1GridRef<PlanSourceOrderRow>>(null);
  const [formVersion, setFormVersion] = useState(0);
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
  const search = async () => {
    sourceGridRef.current?.clearSelection();
    setSelectedSourceKeys([]);
    setLoading(true);
    setError('');
    try {
      const result = await searchPlanSourceOrders(keyword);
      setSourceRows(result.map((row) => ({ ...row, selectionKey: sourceKey(row) })));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : '수주 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const selectSources = async (orderId?: number) => {
    const selectedKeys = new Set(selectedSourceKeys.map(String));
    const selected = deliveryPlanMode === 'AUTO' && orderId !== undefined
      ? sourceRows.filter((row) => row.salesOrderId === orderId)
      : sourceRows.filter((row) => selectedKeys.has(sourceKey(row)));
    if (!selected.length) return;
    setSelectedSources(selected);
    setFormVersion((version) => version + 1);
    setRows(selected.map((row, index) => ({
      rowId: `${sourceKey(row)}-${index}`, salesDeliveryPlanDetailId: null,
      salesOrderId: row.salesOrderId, salesOrderDetailId: row.salesOrderDetailId,
      planDt: row.planDt, plannedQty: Number(row.remainingPlanQty ?? row.orderQty),
      materialId: row.materialId, materialCode: row.materialCode, materialName: row.materialName,
      unit: row.unit, orderNo: row.orderNo, customerName: row.customerName,
      orderQty: Number(row.orderQty), remainingPlanQty: Number(row.remainingPlanQty ?? row.orderQty),
    })));
    setPlanNo('');
    setPlanId(null);
    setNotice('');
    setError('');
    setSourceOpen(false);
    if (deliveryPlanMode !== 'AUTO') return;

    setLoading(true);
    try {
      const saved = await getDeliveryPlanByOrder(selected[0].salesOrderId);
      setPlanId(saved.salesDeliveryPlanId);
      setPlanNo(saved.planNo);
      setRows(planRowsFromDetails(saved.details));
      setFormVersion((version) => version + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '기존 출하계획을 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!canWrite) return;
    const currentRequest = createRequest(gridRef.current?.getActiveRows() ?? rows);
    const message = validateDeliveryPlan(currentRequest, selectedSources);
    if (message) { setError(message); return; }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = planId === null
        ? await createDeliveryPlan(currentRequest)
        : await updateDeliveryPlan(planId, currentRequest);
      setPlanId(saved.salesDeliveryPlanId);
      setPlanNo(saved.planNo);
      setRows(planRowsFromDetails(saved.details));
      setFormVersion((version) => version + 1);
      setNotice(`${planId === null ? '출하계획이 등록' : '출하계획이 수정'}되었습니다. 계획번호: ${saved.planNo}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '출하계획 저장에 실패했습니다.');
    } finally { setSaving(false); }
  };

  const createNew = () => {
    setSourceOpen(false);
    setKeyword('');
    setSourceRows([]);
    setSelectedSourceKeys([]);
    setSelectedSources([]);
    setRows([]);
    setFormVersion((version) => version + 1);
    setPlanNo('');
    setPlanId(null);
    setNotice('');
    setError('');
  };

  const actions: PermissionActionGroupDefinition[] = [{
    key: 'write',
    actions: [
      { label: '신규', icon: NoteAddOutlinedIcon, visible: canRead, disabled: !canSelectOrder, onClick: createNew },
      { label: planId === null ? '저장' : '수정 저장', icon: SaveIcon, visible: canRead, saving,
        disabled: !canWrite || !selectedSources.length || (deliveryPlanMode === 'AUTO' && planId === null),
        onClick: () => void save() },
    ],
  }];
  const selectedOrderNo = useMemo(() => Array.from(new Set(selectedSources.map((row) => row.orderNo))).join(', '),
    [selectedSources]);
  const selectedOrderDates = useMemo(() => Array.from(new Set(selectedSources.map((row) => row.orderDt))).join(', '),
    [selectedSources]);
  const selectedCustomers = useMemo(() => Array.from(new Set(selectedSources.map((row) => row.customerName))).join(', '),
    [selectedSources]);
  const openSourcePicker = () => {
    setSelectedSourceKeys([]);
    sourceGridRef.current?.clearSelection();
    setSourceOpen(true);
  };
  const sourceColumns: F1GridColumn<PlanSourceOrderRow>[] = [
    { field: 'orderNo', headerName: '수주번호', width: 150, align: 'center', mergeRows: true,
      renderCell: ({ row }) => <Button size="small" sx={{ minWidth: 0, px: 0.5, whiteSpace: 'nowrap' }}
        disabled={deliveryPlanMode !== 'AUTO'}
        onClick={() => void selectSources(row.salesOrderId)}>{row.orderNo}</Button> },
    { field: 'orderDt', headerName: '수주일자', type: 'date', width: 100, align: 'center' },
    { field: 'customerName', headerName: '거래처', width: 150, align: 'left' },
    { field: 'lineNo', headerName: '수주상세', width: 90, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 150, align: 'left' },
    { field: 'orderQty', headerName: '수주수량', type: 'decimal', width: 110, align: 'right' },
    { field: 'remainingPlanQty', headerName: '계획잔량', type: 'decimal', width: 110, align: 'right' },
  ];

  if (!canRead) return <Alert severity="warning">출하계획등록 조회 권한이 없습니다.</Alert>;

  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
      description={content.description} actionGroups={actions} />
    <Box role="region" aria-label="출하계획 입력 내용"
      sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 2, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, overflowX: 'hidden', overflowY: 'auto', gap: 2 }}>
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <DeliveryPlanForm key={formVersion} gridRef={gridRef} planNo={planNo} orderNo={selectedOrderNo} orderDt={selectedOrderDates}
        customerName={selectedCustomers} rows={rows} setRows={setRows} editable={canWrite}
        canSelectOrder={canSelectOrder && planId === null} onSelectOrder={openSourcePicker} />
    </Box>
    <CommonDialog open={sourceOpen} onClose={() => setSourceOpen(false)} title="계획대상 수주 품목 선택"
      size="lg" fullScreenOnMobile bodyMode="fill" paperHeight="min(900px, 85vh)"
      actions={<>
        {deliveryPlanMode === 'MANUAL' ? <Button variant="contained" disabled={loading || selectedSourceKeys.length === 0}
          onClick={() => void selectSources()}>선택</Button> : null}
        <Button onClick={() => setSourceOpen(false)}>닫기</Button>
      </>}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box component="form" aria-label="계획대상 수주 품목 선택 검색" onSubmit={(event) => { event.preventDefault(); void search(); }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexShrink: 0 }}>
        <TextField fullWidth size="small" margin="none" label="수주번호·거래처 검색" value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { height: 40 } }} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={<SearchIcon />}
          sx={{ flexShrink: 0, minWidth: 88, height: 40, minHeight: 40 }}>검색</Button>
      </Box>
      <PageMessageArea message={error} />
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
        <F1Grid ref={sourceGridRef} ariaLabel="계획대상 수주 품목 목록" rows={sourceRows} columns={sourceColumns} rowKey="selectionKey"
          loading={loading} showCheckbox={deliveryPlanMode === 'MANUAL'} multiSelect={deliveryPlanMode === 'MANUAL'}
          selectionMode="row" onSelectionChange={setSelectedSourceKeys} canExportExcel={false} height="100%"
          allowAddRowInContextMenu={false} allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} />
      </Box>
      </Box>
    </CommonDialog>
  </Box>;
}
