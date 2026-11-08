import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { DeliveryPlanDetail, DeliveryPlanFilters, DeliveryPlanPageProps, DeliveryPlanStatusRow } from '../types/salesDeliveryPlan.types';
import { defaultDeliveryPlanFilters, getDeliveryPlan, getDeliveryPlanStatus, updateDeliveryPlan, validDeliveryPlanPeriod } from '../services/salesDeliveryPlan.service';

export function SalesDeliveryPlanStatusPage({
  currentMenuName, content, breadcrumbItems, selectedMenuPermissions: permissions,
}: DeliveryPlanPageProps) {
  const [filters, setFilters] = useState<DeliveryPlanFilters>(() => defaultDeliveryPlanFilters());
  const [rows, setRows] = useState<DeliveryPlanStatusRow[]>([]);
  const [selected, setSelected] = useState<DeliveryPlanStatusRow | null>(null);
  const [details, setDetails] = useState<DeliveryPlanDetail[]>([]);
  const [editRows, setEditRows] = useState<DeliveryPlanDetail[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const runSearch = useCallback(async (next: DeliveryPlanFilters) => {
    if (!validDeliveryPlanPeriod(next)) { setError('계획일 기간의 시작일과 종료일을 확인해 주세요.'); return; }
    setLoading(true);
    setError('');
    try { setRows(await getDeliveryPlanStatus(next)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '출하계획 현황 조회에 실패했습니다.'); }
    finally { setLoading(false); }
  }, []);

  const search = () => runSearch(filters);
  useEffect(() => {
    let active = true;
    getDeliveryPlanStatus(defaultDeliveryPlanFilters())
      .then((result) => { if (active) setRows(result); })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '출하계획 현황 조회에 실패했습니다.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const open = async (row: DeliveryPlanStatusRow) => {
    setSelected(row);
    setDetailLoading(true);
    setError('');
    setEditing(false);
    try {
      const item = await getDeliveryPlan(row.salesDeliveryPlanId);
      setDetails(item.details);
      setEditRows(item.details);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '출하계획 상세 조회에 실패했습니다.'); }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const updated = await updateDeliveryPlan(selected.salesDeliveryPlanId, {
        salesOrderId: selected.salesOrderId,
        details: editRows.map((row) => ({
          salesDeliveryPlanDetailId: row.salesDeliveryPlanDetailId,
          salesOrderDetailId: row.salesOrderDetailId,
          planDt: row.planDt,
          plannedQty: Number(row.plannedQty),
        })),
      });
      setDetails(updated.details);
      setEditRows(updated.details);
      setEditing(false);
      setNotice(`출하계획 ${updated.planNo}이 수정되었습니다.`);
      await runSearch(filters);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '출하계획 수정에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const actions: PermissionActionGroupDefinition[] = [{
    key: 'read',
    actions: [{
      label: '조회', icon: SearchIcon, visible: Boolean(permissions?.read),
      disabled: loading, onClick: () => void search(),
    }],
  }];
  if (!permissions?.read) return <Alert severity="warning">출하계획 현황 조회 권한이 없습니다.</Alert>;

  return <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
      description={content.description} actionGroups={actions} />
    <Box sx={{ p: { xs: 1.5, sm: 2, lg: 3 }, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: 1, gap: 1.5 }}>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
        <Box component="form" onSubmit={(event) => { event.preventDefault(); void search(); }}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr)) auto' }, gap: 1.5, alignItems: 'center' }}>
          <TextField size="small" type="date" label="계획일 시작" required value={filters.planDtFrom}
            onChange={(event) => setFilters((value) => ({ ...value, planDtFrom: event.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="계획일 종료" required value={filters.planDtTo}
            onChange={(event) => setFilters((value) => ({ ...value, planDtTo: event.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" label="계획번호·수주번호·거래처" value={filters.keyword}
            onChange={(event) => setFilters((value) => ({ ...value, keyword: event.target.value }))} />
          <Button type="submit" variant="contained" startIcon={<SearchIcon />} disabled={loading}>조회</Button>
        </Box>
      </Paper>
      <PageMessageArea message={error} onClose={() => setError('')} />
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <SearchResultMessage resultCount={rows.length} />
      <Paper variant="outlined" sx={{ flex: 1, minHeight: 240, minWidth: 0, overflow: 'hidden', borderRadius: 2 }}>
        <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: 720 }} aria-label="출하계획 현황 목록">
            <TableHead><TableRow><TableCell>계획번호</TableCell><TableCell>수주번호</TableCell>
              <TableCell>수주일자</TableCell><TableCell>거래처</TableCell><TableCell>상세</TableCell></TableRow></TableHead>
            <TableBody>{rows.map((row) => <TableRow key={row.salesDeliveryPlanId} hover>
              <TableCell>{row.planNo}</TableCell><TableCell>{row.orderNo}</TableCell>
              <TableCell>{row.orderDt}</TableCell><TableCell>{row.customerName}</TableCell>
              <TableCell><Button size="small" onClick={() => void open(row)}>상세 보기</Button></TableCell>
            </TableRow>)}
            {!loading && rows.length === 0 ? <TableRow><TableCell colSpan={5} align="center">조회 결과가 없습니다.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {selected ? <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{selected.planNo} · {selected.orderNo}</Typography>
            <Typography variant="body2" color="text.secondary">{selected.customerName}</Typography></Box>
          {permissions?.update ? <Button size="small" startIcon={editing ? <SaveIcon /> : <EditIcon />}
            disabled={detailLoading || loading} onClick={() => editing ? void save() : setEditing(true)}>
            {editing ? '저장' : '수정'}</Button> : null}
        </Box>
        <TableContainer sx={{ maxHeight: 320, overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 660 }} aria-label="출하계획 상세 목록">
            <TableHead><TableRow><TableCell>품목코드</TableCell><TableCell>품목명</TableCell>
              <TableCell>계획일</TableCell><TableCell align="right">수주수량</TableCell>
              <TableCell align="right">계획수량</TableCell><TableCell align="right">출하</TableCell>
              <TableCell align="right">미출하수량</TableCell><TableCell align="right">초과출하</TableCell></TableRow></TableHead>
            <TableBody>{(editing ? editRows : details).map((detail) => <TableRow key={detail.salesDeliveryPlanDetailId}>
              <TableCell>{detail.materialCode}</TableCell><TableCell>{detail.materialName}</TableCell>
              <TableCell>{editing ? <TextField type="date" size="small" value={detail.planDt ?? ''}
                onChange={(event) => setEditRows((current) => current.map((row) => row.salesDeliveryPlanDetailId === detail.salesDeliveryPlanDetailId
                  ? { ...row, planDt: event.target.value || null } : row))}
                slotProps={{ inputLabel: { shrink: true } }} /> : detail.planDt ?? '-'}</TableCell>
              <TableCell align="right">{Number(detail.orderQty).toLocaleString()}</TableCell>
              <TableCell align="right">{editing ? <TextField size="small" type="number" value={detail.plannedQty}
                slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                onChange={(event) => setEditRows((current) => current.map((row) => row.salesDeliveryPlanDetailId === detail.salesDeliveryPlanDetailId
                  ? { ...row, plannedQty: Number(event.target.value) } : row))} />
                : Number(detail.plannedQty).toLocaleString()}</TableCell>
              <TableCell align="right">{Number(detail.deliveredQty).toLocaleString()}</TableCell>
              <TableCell align="right">{Math.max(Number(detail.plannedQty) - Number(detail.deliveredQty), 0).toLocaleString()}</TableCell>
              <TableCell align="right">{Math.max(Number(detail.deliveredQty) - Number(detail.plannedQty), 0).toLocaleString()}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      </Paper> : null}
    </Box>
  </Box>;
}
