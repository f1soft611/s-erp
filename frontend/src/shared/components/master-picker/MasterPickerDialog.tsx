import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
} from '@mui/material';
import type {
  MasterPickerDialogProps,
  MasterPickerOption,
} from './masterPicker.types';

export function MasterPickerDialog({
  label,
  open,
  search,
  onClose,
  onChange,
}: MasterPickerDialogProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<MasterPickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

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
    onChange(option);
    close();
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{label} 선택</DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            void handleSearch(event);
          }}
          sx={{ display: 'flex', gap: 1, pt: 1 }}
        >
          <TextField
            autoFocus
            size="small"
            fullWidth
            label={`${label} 검색`}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={<SearchIcon />}
            aria-label="검색"
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
              {results.map((option) => (
                <ListItemButton
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  aria-label={`${option.code} ${option.name} 선택`}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemText primary={option.name} secondary={option.code} />
                </ListItemButton>
              ))}
            </List>
          )}
          {!loading && !error && !hasSearched && (
            <Alert severity="info">검색어를 입력한 뒤 검색해 주세요.</Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
}
