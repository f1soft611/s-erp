import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, Button, Chip, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import {
  distinctReceiptCandidateCurrencies,
  searchReceiptCandidates,
} from '../services/purchaseReceipt.service';
import type { PurchaseReceiptCandidate } from '../types/purchaseReceipt.types';

const SEARCH_CONTROL_HEIGHT = 40;

type RowId = string | number;

/**
 * 입고할 수입검사 합격분을 불러온다. 한 입고는 구매처 1곳·통화 1종이므로 첫 번째로 체크한 행의 구매처를 칩으로 고정하고,
 * 다른 구매처 행을 체크하면 선택에서 제외한다. 칩의 ✕로 선택을 초기화한다. 이미 담긴 행은 목록에서 뺀다.
 */
export function PurchaseReceiptInspectionPicker({ open, onClose, onSelect, excludeIds }: {
  open: boolean;
  onClose: () => void;
  onSelect: (candidates: PurchaseReceiptCandidate[]) => void;
  /** 이미 담긴 수입검사 행 ID. 목록에서 제외한다. */
  excludeIds: number[];
}) {
  const gridRef = useRef<F1GridRef<PurchaseReceiptCandidate>>(null);
  const request = useRef(0);
  const programmaticSelection = useRef(false);
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [rows, setRows] = useState<PurchaseReceiptCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<RowId[]>([]);
  const [lockedSupplier, setLockedSupplier] = useState<{ id: number; name: string } | null>(null);
  const [lockNotice, setLockNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const visibleRows = useMemo(
    () => rows.filter((row) => !excluded.has(row.qualityInspectionDetailId)),
    [excluded, rows],
  );
  const rowById = useMemo(
    () => new Map(visibleRows.map((row) => [row.qualityInspectionDetailId, row])),
    [visibleRows],
  );

  const search = useCallback(async () => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('검사일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchReceiptCandidates({ fromDt, toDt, keyword });
      if (token === request.current) {
        setRows(result.rows);
        setSelectedIds([]);
        setLockedSupplier(null);
        setLockNotice('');
      }
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '수입검사 합격분 조회에 실패했습니다.');
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
      .filter((row): row is PurchaseReceiptCandidate => row !== undefined);
    if (selected.length === 0) {
      setSelectedIds([]);
      setLockedSupplier(null);
      return;
    }
    const lockedId = lockedSupplier?.id ?? selected[0].supplierId;
    const allowed = selected.filter((row) => row.supplierId === lockedId);
    if (allowed.length !== selected.length) {
      setLockNotice('한 입고는 구매처 1곳만 담을 수 있습니다. 다른 구매처 품목은 선택에서 제외했습니다.');
      programmaticSelection.current = true;
      gridRef.current?.setSelectedRowIds(allowed.map((row) => row.qualityInspectionDetailId));
    } else {
      setLockNotice('');
    }
    setLockedSupplier({ id: lockedId, name: allowed[0].supplierName ?? '' });
    setSelectedIds(allowed.map((row) => row.qualityInspectionDetailId));
  }, [lockedSupplier, rowById]);

  const columns = useMemo<F1GridColumn<PurchaseReceiptCandidate>[]>(() => [
    { field: 'supplierName', headerName: '구매처', width: 140, pinned: 'left', mergeRows: true },
    { field: 'inspectionNo', headerName: '검사번호', width: 150, align: 'center', mergeRows: true },
    { field: 'inspectionDt', headerName: '검사일', type: 'date', width: 100, align: 'center', mergeRows: true },
    { field: 'arrivalNo', headerName: '가입고번호', width: 150, align: 'center' },
    { field: 'orderNo', headerName: '발주번호', width: 150, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 170 },
    { field: 'materialSpec', headerName: '규격', width: 110 },
    { field: 'unit', headerName: '단위', width: 64, align: 'center' },
    { field: 'passQty', headerName: '합격수량', type: 'decimal', width: 96, align: 'right' },
    { field: 'receivedQty', headerName: '기입고', type: 'decimal', width: 90, align: 'right' },
    { field: 'receivableQty', headerName: '입고 가능량', type: 'decimal', width: 104, align: 'right' },
  ], []);

  const confirmSelection = () => {
    const selected = (gridRef.current?.getSelectedRows() ?? [])
      .filter((row) => lockedSupplier !== null && row.supplierId === lockedSupplier.id);
    if (selected.length === 0) return;
    if (distinctReceiptCandidateCurrencies(selected).length > 1) {
      setLockNotice('통화가 다른 수입검사 품목은 한 입고에 담을 수 없습니다. 같은 통화 품목끼리 선택해 주세요.');
      return;
    }
    onSelect(selected);
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="수입검사 합격분 선택"
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
          aria-label="수입검사 합격분 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <PickerDateRangeFields
            label="검사일"
            fromDt={fromDt}
            toDt={toDt}
            onFromChange={setFromDt}
            onToChange={setToDt}
          />
          <TextField
            size="small"
            margin="none"
            label="검사번호·가입고번호·발주번호·구매처·품목 검색"
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
            ariaLabel="입고 대상 수입검사 합격분 목록"
            storageKey="materials-purchase-receipt-inspection-picker-grid-v1"
            rows={visibleRows}
            columns={columns}
            rowKey="qualityInspectionDetailId"
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
