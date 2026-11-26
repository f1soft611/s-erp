import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Box, Button, IconButton, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../../../shared/components/page-search/searchFields';
import { usePageSearchDefaults } from '../../../../../../shared/hooks/usePageSearchDefaults';
import { F1Grid, type F1GridColumn, type F1GridRef } from '../../../../../../shared/components/f1-grid';
import { decimalColumnOptions, getDecimalColumnContract } from '../../../../../../shared/services/decimalColumnContract';
import { searchSourceOrders } from '../services/salesDelivery.service';
import type { SourceOrderRow, SourceOrderSearchFilters } from '../types/salesDelivery.types';

type SourcePlanRow = SourceOrderRow & { excessQty: number };
const EMPTY_SEARCH_VALUES: Record<string, PageSearchFieldValue> = {};

function dateRange(values: Record<string, PageSearchFieldValue>, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return { from: '', to: '' };
  return { from: value.from ?? '', to: value.to ?? '' };
}

export function SourceOrderPicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (rows: SourceOrderRow[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<SourceOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue> | null>(null);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue> | null>(null);
  const [detailSearchOpen, setDetailSearchOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const request = useRef(0);
  const grid = useRef<F1GridRef<SourcePlanRow>>(null);
  const columns = useMemo<F1GridColumn<SourcePlanRow>[]>(() => [
    { field: 'orderNo', headerName: '수주번호', width: 150, align: 'center', mergeRows: true,
      search: { label: '수주번호', order: 2, span: 1, group: '수주 조건' } },
    { field: 'planNo', headerName: '계획번호', width: 140, align: 'center',
      search: { label: '계획번호', order: 5, span: 1, group: '수주 조건' } },
    { field: 'orderDt', headerName: '수주일자', type: 'date', width: 96, align: 'center',
      search: { required: true, label: '수주일자', order: 1, span: 2, group: '기준일',
        defaultValue: {
          from: { type: 'systemDate', offset: { months: -1 } },
          to: { type: 'systemDate' },
        } } },
    { field: 'planDt', headerName: '계획일자', type: 'date', width: 96, align: 'center',
      search: { label: '계획일자', order: 6, span: 2, group: '계획 조건' } },
    { field: 'customerName', headerName: '거래처', width: 125, align: 'center',
      search: { label: '거래처', order: 3, span: 1, group: '수주 조건' } },
    { field: 'materialCode', headerName: '품목코드', width: 100, align: 'center', search: { hidden: true } },
    { field: 'materialName', headerName: '품목명', width: 135, align: 'center',
      search: { label: '품목', order: 4, span: 1, group: '수주 조건' } },
    { field: 'plannedQty', headerName: '계획수량', ...decimalColumnOptions(getDecimalColumnContract('sales.deliveryPlan'), 'plannedQty'), exactDecimal: true, width: 90, align: 'right', search: { hidden: true } },
    { field: 'deliveredQty', headerName: '기출하', ...decimalColumnOptions(getDecimalColumnContract('sales.delivery'), 'deliveryQty'), exactDecimal: true, width: 90, align: 'right', search: { hidden: true } },
    { field: 'remainingQty', headerName: '미납수량', ...decimalColumnOptions(getDecimalColumnContract('sales.delivery'), 'deliveryQty'), exactDecimal: true, width: 90, align: 'right', search: { hidden: true } },
    { field: 'excessQty', headerName: '초과출하', type: 'number', width: 90, align: 'right', search: { hidden: true } },
  ], []);
  const detailFields = useMemo(() => toPageSearchFields(columns), [columns]);
  const { values: defaultValues, loading: defaultsLoading, error: defaultsError, retry: retryDefaults } =
    usePageSearchDefaults(detailFields);
  const detailValuesInitialized = defaultValues !== null;
  const currentDetailValues = detailValues ?? defaultValues ?? EMPTY_SEARCH_VALUES;
  const currentAppliedDetailValues = appliedDetailValues ?? defaultValues ?? EMPTY_SEARCH_VALUES;
  const search = useCallback(async (
    searchKeyword = keyword,
    values = currentAppliedDetailValues,
  ) => {
    if (!detailValuesInitialized) return;
    const orderDate = dateRange(values, 'orderDt');
    const planDate = dateRange(values, 'planDt');
    if (!orderDate.from || !orderDate.to || orderDate.from > orderDate.to) {
      setError('수주일자 기준일의 시작일과 종료일을 확인해 주세요.');
      return;
    }
    if (planDate.from && planDate.to && planDate.from > planDate.to) {
      setError('계획일자 기간의 시작일과 종료일을 확인해 주세요.');
      return;
    }
    const filters: SourceOrderSearchFilters = {
      keyword: searchKeyword,
      orderDtFrom: orderDate.from,
      orderDtTo: orderDate.to,
      orderNo: String(values.orderNo ?? ''),
      customerKeyword: String(values.customerName ?? ''),
      materialKeyword: String(values.materialName ?? ''),
      planNo: String(values.planNo ?? ''),
      planDtFrom: planDate.from,
      planDtTo: planDate.to,
    };
    const token = ++request.current;
    grid.current?.clearSelection();
    setSelectedRowIds([]);
    setLoading(true); setError('');
    try { const result = await searchSourceOrders(filters); if (token === request.current) setRows(result); }
    catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : '수주 조회에 실패했습니다.'); }
    finally { if (token === request.current) setLoading(false); }
  }, [currentAppliedDetailValues, detailValuesInitialized, keyword]);
  useEffect(() => {
    return () => { request.current += 1; };
  }, []);
  const displayRows = useMemo<SourcePlanRow[]>(() => rows.map((row) => ({
    ...row, excessQty: Math.max(-Number(row.remainingQty), 0),
  })).filter((row) => Number(row.remainingQty) > 0), [rows]);
  const selectedPlanDetailIds = useMemo(
    () => new Set(selectedRowIds.map(String)),
    [selectedRowIds],
  );
  const selectedRows = useMemo(
    () => displayRows.filter((row) => selectedPlanDetailIds.has(String(row.salesDeliveryPlanDetailId))),
    [displayRows, selectedPlanDetailIds],
  );
  const select = () => {
    if (new Set(selectedRows.map((row) => row.customerId)).size !== 1) {
      setError('서로 다른 거래처의 품목은 한 출하 문서에 함께 선택할 수 없습니다.');
      return;
    }
    onSelect(selectedRows);
  };
  return <CommonDialog open={open} onClose={onClose} title="수주 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<>
      <Button variant="contained" disabled={loading || selectedRows.length === 0} onClick={select}>선택</Button>
      <Button onClick={onClose}>닫기</Button>
    </>} overlay={detailSearchOpen ? (
      <Box
        aria-hidden="true"
        data-testid="source-order-picker-detail-backdrop"
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 12,
          bgcolor: 'rgba(15, 23, 42, 0.12)',
        }}
      />
    ) : null}>
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box role="group" aria-label="수주 선택 검색" sx={{ minWidth: 0, flexShrink: 0 }}>
        <PageSearchArea
          mode="dialog"
          detailFields={detailFields}
          detailValues={currentDetailValues}
          appliedDetailValues={currentAppliedDetailValues}
          defaultValues={defaultValues ?? EMPTY_SEARCH_VALUES}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={(values) => {
            setDetailValues(values);
            setAppliedDetailValues(values);
            void search(keyword, values);
          }}
          onDetailReset={(values) => {
            setKeyword('');
            setDetailValues(values);
            setAppliedDetailValues(values);
            void search('', values);
          }}
          onDetailOpenChange={setDetailSearchOpen}
          detailLoading={loading || defaultsLoading || !detailValuesInitialized}
          onDefaultSearch={() => void search()}
          searchField={
            <TextField
              fullWidth
              size="small"
              margin="none"
              placeholder="수주번호·거래처·품목 통합검색"
              value={keyword}
              disabled={loading || defaultsLoading || !detailValuesInitialized}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '수주 선택 빠른 검색' },
                input: {
                  endAdornment: keyword ? (
                    <IconButton
                      type="button"
                      size="small"
                      edge="end"
                      aria-label="수주 선택 검색어 초기화"
                      onClick={() => setKeyword('')}
                      sx={{ p: 0.25 }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null,
                },
              }}
              sx={(theme) => ({
                width: '100%',
                height: 40,
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          }
        />
      </Box>
      {defaultsError ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={retryDefaults}>기준일 다시 불러오기</Button>}>
          서버 기준일을 불러오지 못했습니다. {defaultsError}
        </Alert>
      ) : <PageMessageArea message={error} />}
      <Box inert={detailSearchOpen} sx={{ flex: 1, minWidth: 0, minHeight: 240, overflow: 'hidden' }}>
      <F1Grid ref={grid} storageKey="sales-delivery-source-order-picker-v1" ariaLabel="출하 대상 수주 목록" rows={displayRows} columns={columns} rowKey="salesDeliveryPlanDetailId"
        loading={loading} showCheckbox multiSelect selectionMode="row" onSelectionChange={setSelectedRowIds}
        canExportExcel={false} allowAddRowInContextMenu={false}
        allowDeleteRowInContextMenu={false} allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
