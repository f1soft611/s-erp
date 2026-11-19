import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { PURCHASE_REQUEST_STATUS_OPTIONS } from '../../create/services/purchaseRequest.service';
import { searchConfirmCandidates } from '../services/purchaseRequestConfirm.service';
import type { PurchaseRequestConfirmCandidate } from '../types/purchaseRequestConfirm.types';

const SEARCH_CONTROL_HEIGHT = 40;

/** 출하등록의 계획 선택처럼 확정할 구매요청 품목 행을 여러 개 고른다(MES 방식). */
export function PurchaseRequestSourcePicker({ open, onClose, onSelect }: {
  open: boolean;
  onClose: () => void;
  onSelect: (candidates: PurchaseRequestConfirmCandidate[]) => void;
}) {
  const gridRef = useRef<F1GridRef<PurchaseRequestConfirmCandidate>>(null);
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [rows, setRows] = useState<PurchaseRequestConfirmCandidate[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);

  const search = useCallback(async (nextKeyword: string) => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('요청일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchConfirmCandidates(nextKeyword, { fromDt, toDt });
      if (token === request.current) {
        setRows(result);
        setSelectedCount(0);
      }
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '구매요청 조회에 실패했습니다.');
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

  const columns = useMemo<F1GridColumn<PurchaseRequestConfirmCandidate>[]>(() => [
    { field: 'requestNo', headerName: '구매요청번호', width: 150, align: 'center', pinned: 'left', mergeRows: true },
    { field: 'requestDt', headerName: '요청일', type: 'date', width: 100, align: 'center', mergeRows: true },
    { field: 'requesterName', headerName: '요청자', width: 90, align: 'center', mergeRows: true },
    {
      field: 'requestStatus', headerName: '상태', type: 'select', options: PURCHASE_REQUEST_STATUS_OPTIONS,
      width: 80, align: 'center', mergeRows: true,
    },
    { field: 'lineNo', headerName: '행', type: 'number', width: 52, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 180 },
    { field: 'materialSpec', headerName: '규격', width: 110 },
    { field: 'unit', headerName: '단위', width: 64, align: 'center' },
    { field: 'requestQty', headerName: '요청수량', type: 'decimal', width: 96, align: 'right' },
    { field: 'requestDeliveryDt', headerName: '요청납기일', type: 'date', width: 104, align: 'center' },
    { field: 'useTypeName', headerName: '사용용도', width: 90, align: 'center' },
    { field: 'requestRemark', headerName: '비고', width: 180 },
  ], []);

  const confirmSelection = () => {
    const selected = gridRef.current?.getSelectedRows() ?? [];
    if (selected.length > 0) onSelect(selected);
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="구매요청 선택"
      size="lg"
      fullScreenOnMobile
      bodyMode="fill"
      paperHeight="min(900px, 85vh)"
      actions={(
        <>
          <Button onClick={onClose}>닫기</Button>
          <Button variant="contained" disabled={selectedCount === 0} onClick={confirmSelection}>
            {selectedCount > 0 ? `선택 불러오기 (${selectedCount})` : '선택 불러오기'}
          </Button>
        </>
      )}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
        <Box
          component="form"
          aria-label="구매요청 선택 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search(keyword);
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <PickerDateRangeFields label="요청일" fromDt={fromDt} toDt={toDt} onFromChange={setFromDt} onToChange={setToDt} />
          <TextField
            size="small"
            margin="none"
            label="구매요청번호·요청자·품목코드·품목명 검색"
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
            ref={gridRef}
            ariaLabel="확정 대상 구매요청 품목 목록"
            storageKey="materials-purchase-request-source-picker-grid-v1"
            rows={rows}
            columns={columns}
            rowKey="purchaseRequestDetailId"
            loading={loading}
            showCheckbox
            multiSelect
            onSelectionChange={(ids) => setSelectedCount(ids.length)}
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
