import ClearIcon from '@mui/icons-material/Clear';
import { IconButton, TextField } from '@mui/material';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type { SalesOrderStatusSearchValues } from '../types/salesOrderStatus.types';

type SalesOrderStatusSearchAreaProps = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  detailFields: PageSearchField[];
  detailValues: SalesOrderStatusSearchValues;
  defaultValues: SalesOrderStatusSearchValues;
  onDetailValuesChange: (values: SalesOrderStatusSearchValues) => void;
  onSearch: (values?: SalesOrderStatusSearchValues) => void;
  onReset: () => void;
  initialized: boolean;
  loading: boolean;
};

export function SalesOrderStatusSearchArea({
  keyword,
  onKeywordChange,
  detailFields,
  detailValues,
  defaultValues,
  onDetailValuesChange,
  onSearch,
  onReset,
  initialized,
  loading,
}: SalesOrderStatusSearchAreaProps) {
  return (
    <PageSearchArea
      searchField={
        <TextField
          size="small"
          margin="none"
          placeholder="수주번호/거래처/품목/견적번호 검색"
          value={keyword}
          disabled={!initialized}
          onChange={(event) => onKeywordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && initialized) onSearch();
          }}
          slotProps={{
            htmlInput: { 'aria-label': '수주현황 빠른 검색' },
            input: {
              endAdornment: keyword ? (
                <IconButton
                  type="button"
                  size="small"
                  edge="end"
                  aria-label="수주현황 검색어 초기화"
                  onClick={() => onKeywordChange('')}
                  sx={{ p: 0.25 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
          sx={{ width: '100%', height: 40 }}
        />
      }
      onDefaultSearch={() => {
        if (initialized) onSearch();
      }}
      detailFields={detailFields}
      detailValues={detailValues}
      defaultValues={defaultValues}
      onDetailValuesChange={onDetailValuesChange}
      onDetailSearch={onSearch}
      onDetailReset={(values) => {
        onDetailValuesChange(values);
        onReset();
      }}
      detailLoading={loading || !initialized}
    />
  );
}
