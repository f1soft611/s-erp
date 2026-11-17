import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import ClearIcon from '@mui/icons-material/Clear';
import { IconButton, TextField } from '@mui/material';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type { QuotationStatusSearchValues } from '../types/quotationStatus.types';

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  detailFields: PageSearchField[];
  detailValues: QuotationStatusSearchValues;
  appliedDetailValues: QuotationStatusSearchValues;
  defaultValues: QuotationStatusSearchValues;
  onDetailValuesChange: (values: QuotationStatusSearchValues) => void;
  onSearch: (values?: QuotationStatusSearchValues) => void;
  onReset: () => void;
  initialized: boolean;
  loading: boolean;
};

export function QuotationStatusSearchArea({
  keyword,
  onKeywordChange,
  detailFields,
  detailValues,
  appliedDetailValues,
  defaultValues,
  onDetailValuesChange,
  onSearch,
  onReset,
  initialized,
  loading,
}: Props) {
  return (
    <PageSearchArea
      searchField={
        <TextField size="small" margin="none" placeholder="견적번호/거래처/품목 검색"
          value={keyword} disabled={!initialized}
          onChange={(event) => onKeywordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && initialized) onSearch(appliedDetailValues);
          }}
          slotProps={{
            htmlInput: { 'aria-label': '견적현황 빠른 검색' },
            input: {
              endAdornment: keyword ? (
                <IconButton type="button" size="small" edge="end"
                  aria-label="견적현황 검색어 초기화" onClick={() => onKeywordChange('')} sx={{ p: 0.25 }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
          sx={(theme) => ({
            width: '100%', height: 40,
            '& .MuiOutlinedInput-root': {
              height: '100%', borderRadius: '0 6px 6px 0',
              backgroundColor: theme.palette.background.paper,
            },
          })}
        />
      }
      onDefaultSearch={() => { if (initialized) onSearch(appliedDetailValues); }}
      detailFields={detailFields}
      detailValues={detailValues}
      appliedDetailValues={appliedDetailValues}
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
