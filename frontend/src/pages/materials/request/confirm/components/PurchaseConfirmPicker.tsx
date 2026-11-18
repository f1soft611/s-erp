import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, MenuItem, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { searchPurchaseConfirms } from '../services/purchaseRequestConfirm.service';
import type { PurchaseConfirmListItem, PurchaseConfirmStatusFilter } from '../types/purchaseRequestConfirm.types';

const SEARCH_CONTROL_HEIGHT = 40;
const STATUS_FILTERS: { value: PurchaseConfirmStatusFilter; label: string }[] = [
  { value: 'ACTIVE', label: '확정' },
  { value: 'CANCELED', label: '확정 취소' },
  { value: 'ALL', label: '전체' },
];
const USE_AT_OPTIONS = [
  { value: 'Y', label: '확정' },
  { value: 'N', label: '확정 취소' },
];

/** 기존 구매요청확정(확정번호)을 골라 연다. */
export function PurchaseConfirmPicker({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (confirm: PurchaseConfirmListItem) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [status, setStatus] = useState<PurchaseConfirmStatusFilter>('ACTIVE');
  const [rows, setRows] = useState<PurchaseConfirmListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const search = useCallback(async (nextStatus: PurchaseConfirmStatusFilter, nextKeyword: string) => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('확정일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchPurchaseConfirms(nextKeyword, nextStatus, { fromDt, toDt });
      if (token === request.current) setRows(result);
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '구매요청확정 조회에 실패했습니다.');
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [fromDt, toDt]);

  useEffect(() => {
    if (open && rangeReady) void search(status, keyword);
    // 열릴 때 현재 조건으로 한 번 조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rangeReady]);

  useEffect(() => () => {
    request.current += 1;
  }, []);

  const columns = useMemo<F1GridColumn<PurchaseConfirmListItem>[]>(() => [
    {
      field: 'confirmNo',
      headerName: '확정번호',
      width: 165,
      align: 'center',
      renderCell: ({ row }) => (
        <Button
          size="small"
          aria-label={`${row.confirmNo} 선택`}
          sx={{ minWidth: 0, px: 0.5, whiteSpace: 'nowrap' }}
          onClick={() => onSelect(row)}
        >
          {row.confirmNo}
        </Button>
      ),
    },
    { field: 'confirmDt', headerName: '확정일', type: 'date', width: 100, align: 'center' },
    { field: 'confirmerName', headerName: '확정자', width: 100, align: 'center' },
    { field: 'requestCount', headerName: '요청 건수', type: 'number', width: 84, align: 'right' },
    { field: 'currencyCode', headerName: '통화', width: 64, align: 'center' },
    { field: 'totalAmt', headerName: '합계금액', type: 'decimal', decimalPlaces: 2, width: 120, align: 'right' },
    { field: 'useAt', headerName: '상태', type: 'select', options: USE_AT_OPTIONS, width: 90, align: 'center' },
    { field: 'remark', headerName: '비고', width: 200 },
  ], [onSelect]);

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="구매요청확정 선택"
      size="lg"
      fullScreenOnMobile
      bodyMode="fill"
      paperHeight="min(900px, 85vh)"
      actions={<Button onClick={onClose}>닫기</Button>}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
        <Box
          component="form"
          aria-label="구매요청확정 선택 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search(status, keyword);
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <TextField
            select
            size="small"
            margin="none"
            label="상태"
            value={status}
            onChange={(event) => {
              const next = event.target.value as PurchaseConfirmStatusFilter;
              setStatus(next);
              void search(next, keyword);
            }}
            sx={{ width: 120, '& .MuiOutlinedInput-root': { height: SEARCH_CONTROL_HEIGHT } }}
          >
            {STATUS_FILTERS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <PickerDateRangeFields label="확정일" fromDt={fromDt} toDt={toDt} onFromChange={setFromDt} onToChange={setToDt} />
          <TextField
            size="small"
            margin="none"
            label="확정번호·구매요청번호·확정자 검색"
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
        <PageMessageArea message={error} />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
          <F1Grid
            ariaLabel="구매요청확정 목록"
            storageKey="materials-purchase-confirm-picker-grid-v1"
            rows={rows}
            columns={columns}
            rowKey="purchaseConfirmId"
            loading={loading}
            showCheckbox={false}
            selectionMode="row"
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
