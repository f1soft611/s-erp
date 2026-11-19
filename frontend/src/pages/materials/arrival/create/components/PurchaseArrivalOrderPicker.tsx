import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, Chip, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { distinctCandidateCurrencies, searchArrivalCandidates } from '../services/purchaseArrival.service';
import type { PurchaseArrivalCandidate } from '../types/purchaseArrival.types';

const SEARCH_CONTROL_HEIGHT = 40;

type RowId = string | number;

/**
 * 가입고할 발주 품목 행을 불러온다. 한 가입고는 구매처 1곳이므로 첫 번째로 체크한 행의 구매처를 칩으로 고정하고,
 * 다른 구매처 행을 체크하면 선택에서 제외한다. 칩의 ✕로 선택을 초기화한다.
 */
export function PurchaseArrivalOrderPicker({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (candidates: PurchaseArrivalCandidate[]) => void;
}) {
  const gridRef = useRef<F1GridRef<PurchaseArrivalCandidate>>(null);
  const request = useRef(0);
  const programmaticSelection = useRef(false);
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [rows, setRows] = useState<PurchaseArrivalCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<RowId[]>([]);
  const [lockedSupplier, setLockedSupplier] = useState<{ id: number; name: string } | null>(null);
  const [lockNotice, setLockNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rowById = useMemo(() => new Map(rows.map((row) => [row.purchaseOrderDetailId, row])), [rows]);

  const search = useCallback(async () => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('발주일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchArrivalCandidates({ fromDt, toDt, keyword });
      if (token === request.current) {
        setRows(result);
        setSelectedIds([]);
        setLockedSupplier(null);
        setLockNotice('');
      }
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '발주 품목 조회에 실패했습니다.');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [fromDt, keyword, toDt]);

  useEffect(() => {
    if (open && rangeReady) void search();
    // 열릴 때 현재 검색 조건으로 한 번 조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rangeReady]);

  useEffect(() => () => {
    request.current += 1;
  }, []);

  const resetSelection = useCallback(() => {
    gridRef.current?.clearSelection();
    setSelectedIds([]);
    setLockedSupplier(null);
    setLockNotice('');
  }, []);

  /** 구매처 고정: 첫 선택 행의 구매처만 허용하고 다른 구매처 행은 선택에서 뺀다. */
  const handleSelectionChange = useCallback((ids: RowId[]) => {
    if (programmaticSelection.current) {
      // 구매처 고정으로 선택을 바꾼 직후의 변경 알림이다. 안내 문구는 그대로 두고 선택 개수만 맞춘다.
      programmaticSelection.current = false;
      setSelectedIds(ids.map((id) => Number(id)));
      return;
    }
    const selected = ids
      .map((id) => rowById.get(Number(id)))
      .filter((row): row is PurchaseArrivalCandidate => row !== undefined);
    if (selected.length === 0) {
      setSelectedIds([]);
      setLockedSupplier(null);
      return;
    }
    const lockedId = lockedSupplier?.id ?? selected[0].supplierId;
    if (lockedId === null || lockedId === undefined) {
      setLockNotice('구매처가 지정되지 않은 발주 품목은 가입고할 수 없습니다.');
      gridRef.current?.setSelectedRowIds([]);
      setSelectedIds([]);
      return;
    }
    const allowed = selected.filter((row) => row.supplierId === lockedId);
    if (allowed.length !== selected.length) {
      setLockNotice('한 가입고는 구매처 1곳만 담을 수 있습니다. 다른 구매처 품목은 선택에서 제외했습니다.');
      programmaticSelection.current = true;
      gridRef.current?.setSelectedRowIds(allowed.map((row) => row.purchaseOrderDetailId));
    } else {
      setLockNotice('');
    }
    setLockedSupplier({ id: lockedId, name: allowed[0].supplierName ?? '' });
    setSelectedIds(allowed.map((row) => row.purchaseOrderDetailId));
  }, [lockedSupplier, rowById]);

  const columns = useMemo<F1GridColumn<PurchaseArrivalCandidate>[]>(() => [
    { field: 'supplierName', headerName: '구매처', width: 150, pinned: 'left', mergeRows: true },
    { field: 'orderNo', headerName: '발주번호', width: 150, align: 'center', mergeRows: true },
    { field: 'orderDt', headerName: '발주일', type: 'date', width: 100, align: 'center', mergeRows: true },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180 },
    { field: 'materialSpec', headerName: '규격', width: 110 },
    { field: 'unit', headerName: '단위', width: 64, align: 'center' },
    { field: 'orderQty', headerName: '발주수량', type: 'decimal', width: 96, align: 'right' },
    { field: 'arrivedQty', headerName: '기가입고', type: 'decimal', width: 90, align: 'right' },
    { field: 'remainQty', headerName: '잔량', type: 'decimal', width: 90, align: 'right' },
    { field: 'deliveryDt', headerName: '납기일', type: 'date', width: 104, align: 'center' },
    { field: 'warehouseName', headerName: '입고창고', width: 110, align: 'center' },
    {
      field: 'inspectAt',
      headerName: '검사대상',
      type: 'select',
      options: [{ value: 'Y', label: '대상' }, { value: 'N', label: '-' }],
      width: 84,
      align: 'center',
    },
    { field: 'remark', headerName: '비고', width: 180 },
  ], []);

  const confirmSelection = () => {
    const selected = (gridRef.current?.getSelectedRows() ?? [])
      .filter((row) => lockedSupplier !== null && row.supplierId === lockedSupplier.id);
    if (selected.length === 0) return;
    if (distinctCandidateCurrencies(selected).length > 1) {
      setLockNotice('통화가 다른 발주 품목은 한 가입고에 담을 수 없습니다. 같은 통화 품목끼리 선택해 주세요.');
      return;
    }
    onSelect(selected);
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="발주 품목 선택"
      size="lg"
      fullScreenOnMobile
      bodyMode="fill"
      paperHeight="min(900px, 85vh)"
      actions={(
        <>
          <Button onClick={onClose}>닫기</Button>
          <Button variant="contained" disabled={selectedIds.length === 0} onClick={confirmSelection}>
            {selectedIds.length > 0 ? `선택 불러오기 (${selectedIds.length})` : '선택 불러오기'}
          </Button>
        </>
      )}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
        <Box
          component="form"
          aria-label="발주 품목 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <PickerDateRangeFields
            label="발주일"
            fromDt={fromDt}
            toDt={toDt}
            onFromChange={setFromDt}
            onToChange={setToDt}
          />
          <TextField
            size="small"
            margin="none"
            label="발주번호·구매처·품목코드·품목명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { height: SEARCH_CONTROL_HEIGHT } }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<SearchIcon />}
            sx={{ flexShrink: 0, minWidth: 88, height: SEARCH_CONTROL_HEIGHT, minHeight: SEARCH_CONTROL_HEIGHT }}
          >
            검색
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 32, flexShrink: 0 }}>
          {lockedSupplier ? (
            <Chip
              color="primary"
              size="small"
              label={`구매처: ${lockedSupplier.name}`}
              onDelete={resetSelection}
              deleteIcon={<span aria-label="구매처 선택 초기화" role="img">✕</span>}
            />
          ) : (
            <Chip size="small" variant="outlined" label="구매처: 첫 번째로 체크한 품목의 구매처로 고정됩니다" />
          )}
        </Box>
        {lockNotice ? <Alert severity="info" sx={{ py: 0 }}>{lockNotice}</Alert> : null}
        <PageMessageArea message={error} />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
          <F1Grid
            ref={gridRef}
            ariaLabel="가입고 대상 발주 품목 목록"
            storageKey="materials-purchase-arrival-order-picker-grid-v1"
            rows={rows}
            columns={columns}
            rowKey="purchaseOrderDetailId"
            loading={loading}
            showCheckbox
            multiSelect
            onSelectionChange={handleSelectionChange}
            canExportExcel={false}
            allowAddRowInContextMenu={false}
            allowDeleteRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false}
            height="100%"
          />
        </Box>
      </Box>
    </CommonDialog>
  );
}
