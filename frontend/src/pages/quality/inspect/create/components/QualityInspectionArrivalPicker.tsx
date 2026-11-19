import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { PickerDateRangeFields } from '../../../../../shared/components/PickerDateRangeFields';
import { usePickerDateRange } from '../../../../../shared/hooks/usePickerDateRange';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';
import { searchInspectionCandidates } from '../services/qualityInspection.service';
import type { QualityInspectionCandidate } from '../types/qualityInspection.types';

const SEARCH_CONTROL_HEIGHT = 40;

/**
 * 검사할 가입고 행(검사 대기량이 남은 검사 대상 행)을 불러온다. 이 창이 검사 대상 목록 역할을 한다.
 * 구매처가 달라도 한 검사에 담을 수 있고, 이미 검사 그리드에 담긴 행은 목록에서 뺀다.
 */
export function QualityInspectionArrivalPicker({ open, onClose, onSelect, excludeIds }: {
  open: boolean;
  onClose: () => void;
  onSelect: (candidates: QualityInspectionCandidate[]) => void;
  /** 이미 담긴 가입고 행 ID. 목록에서 제외한다. */
  excludeIds: number[];
}) {
  const gridRef = useRef<F1GridRef<QualityInspectionCandidate>>(null);
  const request = useRef(0);
  const [keyword, setKeyword] = useState('');
  const { fromDt, toDt, setFromDt, setToDt, ready: rangeReady } = usePickerDateRange(open);
  const [rows, setRows] = useState<QualityInspectionCandidate[]>([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const visibleRows = useMemo(
    () => rows.filter((row) => !excluded.has(row.purchaseArrivalDetailId)),
    [excluded, rows],
  );

  const search = useCallback(async () => {
    if (fromDt && toDt && fromDt > toDt) {
      setError('가입고일 시작일은 종료일보다 늦을 수 없습니다.');
      return;
    }
    const token = ++request.current;
    setLoading(true);
    setError('');
    try {
      const result = await searchInspectionCandidates({ fromDt, toDt, keyword });
      if (token === request.current) {
        setRows(result.rows);
        setSelectedCount(0);
      }
    } catch (cause) {
      if (token === request.current) setError(cause instanceof Error ? cause.message : '검사 대기 가입고 조회에 실패했습니다.');
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

  const columns = useMemo<F1GridColumn<QualityInspectionCandidate>[]>(() => [
    { field: 'arrivalNo', headerName: '가입고번호', width: 150, align: 'center', pinned: 'left', mergeRows: true },
    { field: 'arrivalDt', headerName: '가입고일', type: 'date', width: 100, align: 'center', mergeRows: true },
    { field: 'supplierName', headerName: '구매처', width: 140, mergeRows: true },
    { field: 'orderNo', headerName: '발주번호', width: 150, align: 'center' },
    { field: 'materialCode', headerName: '품목코드', width: 110, align: 'center' },
    { field: 'materialName', headerName: '품목명', width: 170 },
    { field: 'materialSpec', headerName: '규격', width: 110 },
    { field: 'unit', headerName: '단위', width: 64, align: 'center' },
    { field: 'arrivalQty', headerName: '가입고량', type: 'decimal', width: 96, align: 'right' },
    { field: 'inspectedQty', headerName: '기검사량', type: 'decimal', width: 96, align: 'right' },
    { field: 'waitQty', headerName: '검사 대기량', type: 'decimal', width: 104, align: 'right' },
  ], []);

  const confirmSelection = () => {
    const selected = gridRef.current?.getSelectedRows() ?? [];
    if (selected.length === 0) return;
    onSelect(selected);
  };

  return (
    <CommonDialog
      open={open}
      onClose={onClose}
      title="검사 대기 가입고 선택"
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
          aria-label="검사 대기 가입고 검색"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
          sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0, flexShrink: 0 }}
        >
          <PickerDateRangeFields
            label="가입고일"
            fromDt={fromDt}
            toDt={toDt}
            onFromChange={setFromDt}
            onToChange={setToDt}
          />
          <TextField
            size="small"
            margin="none"
            label="가입고번호·발주번호·구매처·품목 검색"
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
        <PageMessageArea message={error} />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
          <F1Grid
            ref={gridRef}
            ariaLabel="검사 대기 가입고 목록"
            storageKey="quality-quality-inspection-arrival-picker-grid-v1"
            rows={visibleRows}
            columns={columns}
            rowKey="purchaseArrivalDetailId"
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
