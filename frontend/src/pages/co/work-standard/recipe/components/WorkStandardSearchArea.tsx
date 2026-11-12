import ClearIcon from '@mui/icons-material/Clear';
import { IconButton, TextField } from '@mui/material';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import type { PageSearchField } from '../../../../../shared/components/page-search/searchFields';
import type { WorkStandardSearchValues } from '../types/workStandard.types';

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  detailFields: PageSearchField[];
  detailValues: WorkStandardSearchValues;
  appliedDetailValues: WorkStandardSearchValues;
  defaultValues: WorkStandardSearchValues;
  onDetailValuesChange: (values: WorkStandardSearchValues) => void;
  onSearch: (values?: WorkStandardSearchValues) => void;
  onReset: () => void;
  loading: boolean;
};

export function WorkStandardSearchArea({
  keyword,
  onKeywordChange,
  detailFields,
  detailValues,
  appliedDetailValues,
  defaultValues,
  onDetailValuesChange,
  onSearch,
  onReset,
  loading,
}: Props) {
  return (
    <PageSearchArea
      searchField={
        <TextField
          size="small"
          margin="none"
          placeholder="품목코드/품목명/원료명 검색"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch(appliedDetailValues);
          }}
          slotProps={{
            htmlInput: { 'aria-label': '작업표준서 빠른 검색' },
            input: {
              endAdornment: keyword ? (
                <IconButton
                  type="button"
                  size="small"
                  edge="end"
                  aria-label="작업표준서 검색어 초기화"
                  onClick={() => onKeywordChange('')}
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
              height: '100%',
              borderRadius: '0 6px 6px 0',
              backgroundColor: theme.palette.background.paper,
            },
          })}
        />
      }
      onDefaultSearch={() => onSearch(appliedDetailValues)}
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
      detailLoading={loading}
    />
  );
}
