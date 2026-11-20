import { useMemo, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import { Box, IconButton, TextField } from '@mui/material';
import { F1Grid } from '../../../../shared/components/f1-grid';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import { createHistoryColumns, SOURCE_OPTIONS } from '../data/orderGridData';
import { defaultHistoryValues, toHistoryFilters } from '../data/orderSearch';
import type { useOrderHistory } from '../hooks/useOrderHistory';
import type { OrderTypeDef } from '../types/order.types';

type Props = {
  history: ReturnType<typeof useOrderHistory>;
  types: OrderTypeDef[];
  canExportExcel: boolean;
};

/** 처리 내역 탭: 처리일 기간·사원명/사번·유형·출처로 조회하는 읽기 전용 표. */
export function OrderHistoryPanel({ history, types, canExportExcel }: Props) {
  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(defaultHistoryValues());
  const [appliedValues, setAppliedValues] = useState<Record<string, PageSearchFieldValue>>(defaultHistoryValues());
  const columns = useMemo(() => createHistoryColumns(), []);
  const detailFields = useMemo<PageSearchField[]>(() => [
    { field: 'processDt', label: '처리일', type: 'date', searchSpan: 2 },
    {
      field: 'orderType', label: '명령 유형', type: 'select', searchSpan: 1,
      options: [
        ...types.map((item) => ({ value: item.code, label: item.name })),
        { value: 'JOIN', label: '입사' },
        { value: 'DIRECT_EDIT', label: '직접 수정' },
      ],
    },
    { field: 'source', label: '출처', type: 'select', searchSpan: 1, options: SOURCE_OPTIONS },
  ], [types]);

  const search = (values: Record<string, PageSearchFieldValue>) => {
    setAppliedValues(values);
    setDetailValues(values);
    history.apply(toHistoryFilters(keyword, values));
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      <PageSearchArea
        searchField={(
          <TextField
            size="small"
            margin="none"
            placeholder="사원명·사번 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            slotProps={{
              htmlInput: { 'aria-label': '처리 내역 검색' },
              input: {
                endAdornment: keyword ? (
                  <IconButton size="small" edge="end" aria-label="처리 내역 검색어 초기화" onClick={() => setKeyword('')} sx={{ p: 0.25 }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
            sx={(theme) => ({
              width: '100%', height: 40,
              '& .MuiOutlinedInput-root': {
                height: '100%', borderRadius: '0 6px 6px 0', backgroundColor: theme.palette.background.paper,
              },
            })}
          />
        )}
        onDefaultSearch={() => search(appliedValues)}
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedValues}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={search}
        detailLoading={history.loading}
      />
      <PageMessageArea message={history.error} onClose={() => history.setError('')} />
      <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, p: 1 }}>
        <F1Grid
          ariaLabel="인사명령 처리 내역"
          storageKey="hr-order-history-grid-v1"
          rows={history.rows}
          columns={columns}
          rowKey="orderDtId"
          height="100%"
          loading={history.loading}
          showCheckbox={false}
          highlightKeyword={history.filters.keyword}
          rowFormPlugin={{ enabled: false }}
          canExportExcel={canExportExcel}
          allowAddRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false}
          allowDeleteRowInContextMenu={false}
        />
      </Box>
    </Box>
  );
}
