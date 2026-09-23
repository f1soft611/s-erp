import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import type {
  PageSearchField,
  PageSearchFieldValue,
} from './page-search/searchFields';

export type PageSearchAreaProps = {
  children?: ReactNode;
  searchField?: ReactNode;
  onDefaultSearch?: () => void;
  detailFields?: PageSearchField[];
  detailValues?: Record<string, PageSearchFieldValue>;
  onDetailValuesChange?: (values: Record<string, PageSearchFieldValue>) => void;
  onDetailSearch?: (values: Record<string, PageSearchFieldValue>) => void;
  onDetailClose?: () => void;
  detailLoading?: boolean;
};

function getFieldValue(
  values: Record<string, PageSearchFieldValue>,
  field: PageSearchField,
): PageSearchFieldValue {
  if (values[field.field] !== undefined) return values[field.field];
  return field.type === 'date' ? { from: '', to: '' } : '';
}

function getDateValue(value: PageSearchFieldValue, key: 'from' | 'to'): string {
  if (!value || typeof value !== 'object') return '';
  return value[key] ?? '';
}

function areSearchValuesEqual(
  current: Record<string, PageSearchFieldValue>,
  next: Record<string, PageSearchFieldValue>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
  for (const key of keys) {
    const currentValue = current[key];
    const nextValue = next[key];
    if (currentValue === nextValue) continue;
    if (
      currentValue &&
      nextValue &&
      typeof currentValue === 'object' &&
      typeof nextValue === 'object' &&
      currentValue.from === nextValue.from &&
      currentValue.to === nextValue.to
    ) {
      continue;
    }
    return false;
  }
  return true;
}

export function PageSearchArea({
  children,
  searchField,
  onDefaultSearch,
  detailFields = [],
  detailValues = {},
  onDetailValuesChange,
  onDetailSearch,
  onDetailClose,
  detailLoading = false,
}: PageSearchAreaProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [draftValues, setDraftValues] = useState(detailValues);

  useEffect(() => {
    setDraftValues((current) =>
      areSearchValuesEqual(current, detailValues) ? current : detailValues,
    );
  }, [detailValues]);

  const updateValue = (field: string, value: PageSearchFieldValue) => {
    const next = { ...draftValues, [field]: value };
    setDraftValues(next);
    onDetailValuesChange?.(next);
  };

  const closeDetails = () => {
    setDetailOpen(false);
    onDetailClose?.();
  };

  const handleDefaultSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' && onDefaultSearch) {
      event.preventDefault();
      onDefaultSearch();
    }
  };

  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        zIndex: detailOpen ? 10 : 1,
        px: 3,
        py: 1.25,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor:
          theme.palette.mode === 'dark'
            ? 'rgba(15, 23, 42, 0.72)'
            : 'rgba(148, 163, 184, 0.03)',
        backdropFilter: 'blur(8px)',
        transition: 'background-color 0.2s ease',
      })}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          minWidth: 0,
          flexWrap: 'nowrap',
        }}
      >
        {searchField ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
              flex: { xs: '1 1 100%', md: 1 },
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: 1.5,
                flex: { xs: '1 1 100%', md: '1 1 auto' },
                minWidth: 0,
                order: 2,
              }}
              onKeyDown={handleDefaultSearchKeyDown}
            >
              {children}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: { xs: '1 1 100%', md: '1 1 220px' },
                maxWidth: 360,
                minWidth: { xs: '100%', md: 220 },
                order: 1,
                height: 40,
              }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 40,
                  height: 40,
                  flex: '0 0 40px',
                  borderRadius: '8px 0 0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: '#fff',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.23)'
                      : 'rgba(0, 0, 0, 0.23)',
                  borderRight: 0,
                  boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <SearchRoundedIcon fontSize="small" />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  '& .MuiOutlinedInput-root': {
                    height: '100%',
                    borderRadius: '0 8px 8px 0',
                  },
                }}
                onKeyDown={handleDefaultSearchKeyDown}
              >
                {searchField}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flex: { xs: '1 1 100%', md: '1 1 220px' },
              maxWidth: 360,
              minWidth: { xs: '100%', md: 220 },
              height: 40,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 40,
                height: 40,
                flex: '0 0 40px',
                borderRadius: '8px 0 0 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: '#fff',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.23)'
                    : 'rgba(0, 0, 0, 0.23)',
                borderRight: 0,
                boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
                transition: 'background-color 0.2s ease',
              }}
            >
              <SearchRoundedIcon fontSize="small" />
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                gap: 0,
                flex: 1,
                minWidth: 0,
                height: '100%',
                '& > :first-of-type .MuiOutlinedInput-root': {
                  borderRadius: '0 8px 8px 0',
                },
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  borderRadius: '0 8px 8px 0',
                },
              }}
              onKeyDown={handleDefaultSearchKeyDown}
            >
              {children}
            </Box>
          </Box>
        )}
        {detailFields.length > 0 && (
          <IconButton
            type="button"
            size="small"
            aria-label={detailOpen ? '상세 검색 닫기' : '상세 검색 열기'}
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((current) => !current)}
            sx={{
              flex: '0 0 auto',
              ml: 'auto',
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {detailOpen ? (
              <KeyboardArrowUpRoundedIcon fontSize="small" />
            ) : (
              <KeyboardArrowDownRoundedIcon fontSize="small" />
            )}
          </IconButton>
        )}
      </Box>

      {detailOpen && detailFields.length > 0 && (
        <Paper
          role="dialog"
          aria-label="상세 검색"
          elevation={8}
          sx={{
            position: 'absolute',
            zIndex: 2,
            top: '100%',
            left: 0,
            right: 0,
            p: { xs: 2, sm: 2.5 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 0,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1.5,
            }}
          >
            {detailFields.map((field) => {
              const value = getFieldValue(draftValues, field);
              const span = field.searchSpan ?? 1;
              const gridColumn = {
                xs: 'span 1',
                sm: `span ${Math.min(span, 2)}`,
                md: `span ${span}`,
              };

              if (field.type === 'date') {
                return (
                  <Box key={field.field} sx={{ gridColumn }}>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      {field.label}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 1,
                      }}
                    >
                      <TextField
                        size="small"
                        margin="none"
                        type="date"
                        label={`${field.label} 시작일`}
                        value={getDateValue(value, 'from')}
                        onChange={(event) =>
                          updateValue(field.field, {
                            from: event.target.value,
                            to: getDateValue(value, 'to'),
                          })
                        }
                        slotProps={{
                          htmlInput: { 'aria-label': `${field.label} 시작일` },
                        }}
                      />
                      <TextField
                        size="small"
                        margin="none"
                        type="date"
                        label={`${field.label} 종료일`}
                        value={getDateValue(value, 'to')}
                        onChange={(event) =>
                          updateValue(field.field, {
                            from: getDateValue(value, 'from'),
                            to: event.target.value,
                          })
                        }
                        slotProps={{
                          htmlInput: { 'aria-label': `${field.label} 종료일` },
                        }}
                      />
                    </Box>
                  </Box>
                );
              }

              if (field.type === 'select' || field.type === 'checkbox') {
                return (
                  <FormControl
                    key={field.field}
                    size="small"
                    sx={{ gridColumn }}
                  >
                    <InputLabel id={`${field.field}-search-label`}>
                      {field.label}
                    </InputLabel>
                    <Select
                      labelId={`${field.field}-search-label`}
                      label={field.label}
                      value={
                        value === null || value === undefined
                          ? ''
                          : String(value)
                      }
                      onChange={(event) =>
                        updateValue(field.field, event.target.value)
                      }
                      inputProps={{ 'aria-label': field.label }}
                    >
                      <MenuItem value="">전체</MenuItem>
                      {(field.options ?? []).map((option) => (
                        <MenuItem
                          key={String(option.value)}
                          value={String(option.value)}
                        >
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              }

              return (
                <TextField
                  key={field.field}
                  size="small"
                  margin="none"
                  type={
                    ['number', 'decimal', 'currency'].includes(field.type)
                      ? 'number'
                      : 'text'
                  }
                  label={field.label}
                  value={
                    value == null || typeof value === 'object'
                      ? ''
                      : String(value)
                  }
                  onChange={(event) =>
                    updateValue(field.field, event.target.value)
                  }
                  slotProps={{ htmlInput: { 'aria-label': field.label } }}
                  sx={{ gridColumn }}
                />
              );
            })}
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 1,
              mt: 2,
            }}
          >
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setDraftValues({});
                onDetailValuesChange?.({});
              }}
              disabled={detailLoading}
            >
              초기화
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={() => {
                onDetailSearch?.(draftValues);
                closeDetails();
              }}
              disabled={detailLoading}
            >
              조회
            </Button>
            <Button
              type="button"
              // variant="outlined"
              aria-label="검색 닫기"
              onClick={closeDetails}
              disabled={detailLoading}
            >
              닫기
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
