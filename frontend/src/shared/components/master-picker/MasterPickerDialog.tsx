import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CommonDialog } from '../CommonDialog';
import type {
  MasterPickerDialogProps,
  MasterPickerOption,
} from './masterPicker.types';

const EMPTY_OPTIONS: MasterPickerOption[] = [];

type DraftSelectionState = {
  source: MasterPickerOption[];
  draft: MasterPickerOption[];
};

function hasSameOptions(
  first: MasterPickerOption[],
  second: MasterPickerOption[],
) {
  return (
    first.length === second.length &&
    first.every((option, index) => {
      const other = second[index];
      const details = option.details ?? [];
      const otherDetails = other.details ?? [];

      return (
        option.id === other.id &&
        option.code === other.code &&
        option.name === other.name &&
        details.length === otherDetails.length &&
        details.every(
          (detail, detailIndex) =>
            detail.label === otherDetails[detailIndex].label &&
            detail.value === otherDetails[detailIndex].value,
        )
      );
    })
  );
}

export function MasterPickerDialog({
  ...props
}: MasterPickerDialogProps) {
  const { label, open, search, onClose } = props;
  const isMultiple = props.multiple === true;
  const selectedValues =
    props.multiple === true ? props.selectedValues : EMPTY_OPTIONS;
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<MasterPickerOption[]>([]);
  const [draftState, setDraftState] = useState<DraftSelectionState>(() => ({
    source: selectedValues,
    draft: selectedValues,
  }));
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const hasExternalSelectionChanged = !hasSameOptions(
    draftState.source,
    selectedValues,
  );
  if (hasExternalSelectionChanged) {
    setDraftState({ source: selectedValues, draft: selectedValues });
  }
  const draftSelection = hasExternalSelectionChanged
    ? selectedValues
    : draftState.draft;

  const close = () => {
    requestId.current += 1;
    setLoading(false);
    onClose();
  };

  const handleSearch = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setHasSearched(true);
    setError('');

    try {
      const nextResults = await search(keyword.trim());
      if (currentRequestId === requestId.current) {
        setResults(nextResults);
      }
    } catch (cause) {
      if (currentRequestId === requestId.current) {
        setResults([]);
        setError(
          cause instanceof Error
            ? cause.message
            : `${label} 검색에 실패했습니다.`,
        );
      }
    } finally {
      if (currentRequestId === requestId.current) {
        setLoading(false);
      }
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleSearch();
    }
  };

  const handleSelect = (option: MasterPickerOption) => {
    if (isMultiple) {
      setDraftState({
        source: selectedValues,
        draft: draftSelection.some(({ id }) => id === option.id)
          ? draftSelection.filter(({ id }) => id !== option.id)
          : [...draftSelection, option],
      });
      return;
    }
    props.onChange(option);
    close();
  };

  const handleApply = () => {
    if (props.multiple === true) {
      props.onApply(draftSelection);
      close();
    }
  };

  return (
    <CommonDialog
      open={open}
      onClose={close}
      title={`${label} 선택`}
      description={
        isMultiple
          ? `${label} 코드 또는 이름으로 검색한 뒤 항목을 선택하고 적용하세요.`
          : `${label} 코드 또는 이름으로 검색한 뒤 항목을 선택하세요.`
      }
      size="xs"
      fullScreenOnMobile
      footerStart={
        isMultiple ? (
          <Typography role="status" variant="body2">
            선택 {draftSelection.length}개
          </Typography>
        ) : undefined
      }
      actions={
        isMultiple ? (
          <>
            <Button
              type="button"
              variant="contained"
              disableElevation
              onClick={handleApply}
            >
              적용
            </Button>
            <Button type="button" onClick={close}>
              취소
            </Button>
          </>
        ) : undefined
      }
    >
      <Box>
        <Box
          component="form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            void handleSearch(event);
          }}
          sx={{ alignItems: 'center', display: 'flex', gap: 1 }}
        >
          <TextField
            autoFocus
            margin="none"
            size="small"
            fullWidth
            label={`${label} 검색`}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{
              '& .MuiInputBase-root': { height: 40, borderRadius: 1 },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disableElevation
            startIcon={<SearchIcon />}
            aria-label="검색"
            sx={{
              flexShrink: 0,
              height: 40,
              minHeight: 40,
              borderRadius: 1,
              fontWeight: 700,
            }}
          >
            검색
          </Button>
        </Box>
        <Box aria-live="polite" sx={{ minHeight: 72, mt: 2 }}>
          {loading && (
            <Stack
              direction="row"
              spacing={1}
              role="status"
              sx={{ py: 2, alignItems: 'center' }}
            >
              <CircularProgress size={18} />
              <span>검색 중...</span>
            </Stack>
          )}
          {!loading && error && <Alert severity="error">{error}</Alert>}
          {!loading && !error && hasSearched && results.length === 0 && (
            <Alert severity="info">검색 결과가 없습니다.</Alert>
          )}
          {!loading && !error && results.length > 0 && (
            <List disablePadding>
              {results.map((option) => {
                const detailText =
                  option.details
                    ?.map(({ label: detailLabel, value }) => `${detailLabel}: ${value}`)
                    .join(' · ') || '';
                const progress = option.progress;
                const itemDetails = detailText || progress ? (
                  <>
                    {detailText}
                    {progress ? (
                      <Box component="span" data-testid="picker-progress" sx={{ display: 'block', fontWeight: 600 }}>
                        {`${progress.label} `}
                        <Box component="span" sx={{ color: 'success.main' }}>{progress.done}</Box>
                        {'/'}
                        <Box component="span" sx={{ color: progress.done < progress.total ? 'warning.main' : 'success.main' }}>{progress.total}</Box>
                      </Box>
                    ) : null}
                  </>
                ) : undefined;
                const checkboxLabel = `${option.code} ${option.name} 선택`;
                const itemText = (
                  <>
                    <Chip
                      label={option.code}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ flexShrink: 0, fontWeight: 600 }}
                    />
                    <ListItemText
                      primary={option.name}
                      secondary={itemDetails}
                      slotProps={{
                        primary: { noWrap: true, sx: { fontWeight: 600 } },
                        secondary: { sx: { overflowWrap: 'anywhere' } },
                      }}
                    />
                  </>
                );

                return isMultiple ? (
                  <ListItem
                    key={option.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      gap: 1,
                      mb: 1,
                      p: 1,
                    }}
                  >
                    <Checkbox
                      checked={draftSelection.some(
                        ({ id }) => id === option.id,
                      )}
                      onChange={() => handleSelect(option)}
                      slotProps={{
                        input: { 'aria-label': checkboxLabel },
                      }}
                      sx={{ p: 0.5 }}
                    />
                    {itemText}
                  </ListItem>
                ) : (
                  <ListItemButton
                    key={option.id}
                    onClick={() => handleSelect(option)}
                    aria-label={checkboxLabel}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      gap: 1.5,
                      mb: 1,
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {itemText}
                  </ListItemButton>
                );
              })}
            </List>
          )}
          {!loading && !error && !hasSearched && (
            <Alert severity="info">검색어를 입력한 뒤 검색해 주세요.</Alert>
          )}
        </Box>
      </Box>
    </CommonDialog>
  );
}
