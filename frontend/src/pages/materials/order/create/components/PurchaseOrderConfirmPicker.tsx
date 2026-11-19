import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, Chip, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { distinctCandidateCurrencies, searchOrderCandidates } from '../services/purchaseOrder.service';
import type { PurchaseOrderCandidate } from '../types/purchaseOrder.types';

const SEARCH_CONTROL_HEIGHT = 40;

type RowId = string | number;

/**
 * 확정 품목 행을 불러온다. 한 발주서는 구매처 1곳이므로 첫 번째로 체크한 행의 구매처를 칩으로 고정하고,
 * 다른 구매처 행을 체크하면 선택에서 제외한다. 칩의 ✕로 선택을 초기화한다.
 */
export function PurchaseOrderConfirmPicker({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (candidates: PurchaseOrderCandidate[]) => void;
}) {
  const gridRef = useRef<F1GridRef<PurchaseOrderCandidate>>(null);
  const request = useRef(0);
  const programmaticSelection = useRef(false);
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [rows, setRows] = useState<PurchaseOrderCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<RowId[]>([]);
  const [lockedSupplier, setLockedSupplier] = useState<{ id: number; name: string } | null>(null);
  const [lockNotice, setLockNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rowById = useMemo(() => new Map(rows.map((row) => [row.purchaseRequestDetailId, row])), [rows]);

  const search = useCallback(async (nextKeyword: string) => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('확정일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchOrderCandidates({ fromDt, toDt, keyword: nextKeyword });
      if (token === request.current) {
        setRows(result);
        setSelectedIds([]);
        setLockedSupplier(null);
        setLockNotice('');
      }
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '확정 품목 조회에 실패했습니다.');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [fromDt, toDt]);

  useEffect(() => {
    if (open && rangeReady) void search(keyword);
    // 열릴 때 현재 검색어로 한 번 조회한다.
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
      .filter((row): row is PurchaseOrderCandidate => row !== undefined);
    if (selected.length === 0) {
      setSelectedIds([]);
      setLockedSupplier(null);
      return;
    }
    const lockedId = lockedSupplier?.id ?? selected[0].supplierId;
    const allowed = selected.filter((row) => row.supplierId === lockedId);
    if (lockedId === null || lockedId === undefined) {
      // 구매처가 없는 확정 행은 발주할 수 없다.
      setLockNotice('구매처가 지정되지 않은 확정 품목은 발주할 수 없습니다.');
      gridRef.current?.setSelectedRowIds([]);
      setSelectedIds([]);
      return;
    }
    if (allowed.length !== selected.length) {
      setLockNotice('한 발주서는 구매처 1곳만 담을 수 있습니다. 다른 구매처 품목은 선택에서 제외했습니다.');
      programmaticSelection.current = true;
      gridRef.current?.setSelectedRowIds(allowed.map((row) => row.purchaseRequestDetailId));
    } else {
      setLockNotice('');
    }
    setLockedSupplier({ id: lockedId, name: allowed[0].supplierName ?? '' });
    setSelectedIds(allowed.map((row) => row.purchaseRequestDetailId));
  }, [lockedSupplier, rowById]);

  const columns = useMemo<F1GridColumn<PurchaseOrderCandidate>[]>(() => [
    { field: 'supplierName', headerName: '구매처', width: 150, pinned: 'left', mergeRows: true },
    { field: 'confirmNo', headerName: '확정번호', width: 150, align: 'center', mergeRows: true },
    { field: 'confirmDt', headerName: '확정일', type: 'date', width: 100, align: 'center', mergeRows: true },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180 },
    { field: 'materialSpec', headerName: '규격', width: 110 },
    { field: 'unit', headerName: '단위', width: 64, align: 'center' },
    { field: 'stockQty', headerName: '재고량', type: 'decimal', width: 90, align: 'right' },
    { field: 'confirmQty', headerName: '확정수량', type: 'decimal', width: 96, align: 'right' },
    { field: 'orderedQty', headerName: '기발주', type: 'decimal', width: 90, align: 'right' },
    { field: 'remainQty', headerName: '잔량', type: 'decimal', width: 90, align: 'right' },
    { field: 'requestDeliveryDt', headerName: '요청납기일', type: 'date', width: 104, align: 'center' },
    { field: 'confirmDeliveryDt', headerName: '확정납기일', type: 'date', width: 104, align: 'center' },
    { field: 'useTypeName', headerName: '사용용도', width: 90, align: 'center' },
    { field: 'remark', headerName: '비고', width: 180 },
  ], []);

  const confirmSelection = () => {
    const selected = (gridRef.current?.getSelectedRows() ?? [])
      .filter((row) => lockedSupplier !== null && row.supplierId === lockedSupplier.id);
    if (selected.length === 0) return;
    if (distinctCandidateCurrencies(selected).length > 1) {
      setLockNotice('통화가 다른 확정 품목은 한 발주서에 담을 수 없습니다. 같은 통화 품목끼리 선택해 주세요.');
      return;
    }
    onSelect(selected);
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="확정 품목 선택"
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
          aria-label="확정 품목 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search(keyword);
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <PickerDateRangeFields label="확정일" fromDt={fromDt} toDt={toDt} onFromChange={setFromDt} onToChange={setToDt} />
          <TextField
            size="small"
            margin="none"
            label="확정번호·구매요청번호·구매처·품목코드·품목명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            sx={{ flex: '1 1 200px', minWidth: 0, '& .MuiOutlinedInput-root': { height: SEARCH_CONTROL_HEIGHT } }}
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
            ariaLabel="발주 대상 확정 품목 목록"
            storageKey="materials-purchase-order-confirm-picker-grid-v1"
            rows={rows}
            columns={columns}
            rowKey="purchaseRequestDetailId"
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
