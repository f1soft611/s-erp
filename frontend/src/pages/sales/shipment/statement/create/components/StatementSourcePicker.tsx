import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import { Alert, Box, Button, IconButton, TextField } from '@mui/material';
import { CommonDialog } from '../../../../../../shared/components/CommonDialog';
import { PageMessageArea } from '../../../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../../../shared/components/PageSearchArea';
import { toPageSearchFields, type PageSearchFieldValue } from '../../../../../../shared/components/page-search/searchFields';
import { usePageSearchDefaults } from '../../../../../../shared/hooks/usePageSearchDefaults';
import { F1Grid, type F1GridRef } from '../../../../../../shared/components/f1-grid';
import { searchStatementSources } from '../../services/salesStatement.service';
import type { StatementSource, StatementSourceFilters } from '../../types/salesStatement.types';
import { createStatementSourceColumns, type StatementSourceGridRow } from '../data/statementSourceColumns';

const EMPTY_SEARCH_VALUES: Record<string, PageSearchFieldValue> = {};

function dateRange(values: Record<string, PageSearchFieldValue>, field: string) {
  const value = values[field];
  if (!value || typeof value !== 'object') return { from: '', to: '' };
  return { from: value.from ?? '', to: value.to ?? '' };
}

export function StatementSourcePicker({ open, onClose, onSelect }: {
  open: boolean; onClose: () => void; onSelect: (sources: StatementSource[]) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<StatementSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue> | null>(null);
  const [appliedDetailValues, setAppliedDetailValues] = useState<Record<string, PageSearchFieldValue> | null>(null);
  const [detailSearchOpen, setDetailSearchOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Array<number | string>>([]);
  const request = useRef(0);
  const grid = useRef<F1GridRef<StatementSourceGridRow>>(null);
  const columns = useMemo(createStatementSourceColumns, []);
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
    const deliveryDate = dateRange(values, 'deliveryDt');
    if (!deliveryDate.from || !deliveryDate.to || deliveryDate.from > deliveryDate.to) {
      setError('출하일 기간의 시작일과 종료일을 확인해 주세요.');
      return;
    }
    const text = (field: string) => (typeof values[field] === 'string' ? String(values[field]) : '');
    const filters: StatementSourceFilters = {
      keyword: searchKeyword,
      deliveryDtFrom: deliveryDate.from,
      deliveryDtTo: deliveryDate.to,
      deliveryType: text('deliveryType'),
      customerKeyword: text('customerName'),
      materialKeyword: text('materialName'),
      deliveryNo: text('deliveryNo'),
    };
    const token = ++request.current;
    grid.current?.clearSelection();
    setSelectedRowIds([]);
    setLoading(true); setError('');
    try { const result = await searchStatementSources(filters); if (token === request.current) setRows(result); }
    catch (cause) { if (token === request.current) setError(cause instanceof Error ? cause.message : '출하 조회에 실패했습니다.'); }
    finally { if (token === request.current) setLoading(false); }
  }, [currentAppliedDetailValues, detailValuesInitialized, keyword]);
  useEffect(() => {
    return () => { request.current += 1; };
  }, []);
  const selected = new Set(selectedRowIds);
  const selectedSources = rows.filter((row) => selected.has(row.salesDeliveryId));
  const selectedCustomerId = selectedSources[0]?.customerId ?? null;
  function close() {
    setSelectedRowIds([]);
    onClose();
  }
  function completeSelection() {
    const selection = selectedSources;
    setSelectedRowIds([]);
    onSelect(selection);
  }
  return <CommonDialog open={open} onClose={close} title="출하 선택" size="lg" fullScreenOnMobile
    bodyMode="fill" paperHeight="min(900px, 85vh)" actions={<>
      <Button variant="contained" disabled={loading || selectedSources.length === 0}
        onClick={completeSelection}>선택</Button>
      <Button onClick={close}>닫기</Button>
    </>} overlay={detailSearchOpen ? (
      <Box
        aria-hidden="true"
        data-testid="statement-source-picker-detail-backdrop"
        sx={{ position: 'absolute', inset: 0, zIndex: 12, bgcolor: 'rgba(15, 23, 42, 0.12)' }}
      />
    ) : null}>
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0, gap: 1.5 }}>
      <Box role="group" aria-label="출하 선택 검색" sx={{ minWidth: 0, flexShrink: 0 }}>
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
              placeholder="출하번호·거래처 통합검색"
              value={keyword}
              disabled={loading || defaultsLoading || !detailValuesInitialized}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '출하번호·거래처 검색' },
                input: {
                  endAdornment: keyword ? (
                    <IconButton type="button" size="small" edge="end" aria-label="출하 선택 검색어 초기화"
                      onClick={() => setKeyword('')} sx={{ p: 0.25 }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  ) : null,
                },
              }}
              sx={(theme) => ({
                width: '100%',
                height: 40,
                '& .MuiOutlinedInput-root': { height: 40, backgroundColor: theme.palette.background.paper },
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
        <F1Grid ref={grid} storageKey="sales-statement-source-picker-v2" ariaLabel="출하 선택 목록" rows={rows} columns={columns} rowKey="salesDeliveryId"
          loading={loading} showCheckbox selectionMode="row" multiSelect
          isRowSelectable={(row) => selectedCustomerId === null || row.customerId === selectedCustomerId}
          onSelectionChange={setSelectedRowIds} canExportExcel={false}
          allowAddRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false} height="100%" />
      </Box>
    </Box>
  </CommonDialog>;
}
