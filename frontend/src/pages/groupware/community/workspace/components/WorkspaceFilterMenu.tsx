import { useState } from 'react';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import { Box, Checkbox, Chip, FormControlLabel, IconButton, Popover, Stack, TextField } from '@mui/material';
import type { WorkspaceViewPrefs } from '../types/workspace.types';

type WorkspaceFilterMenuProps = {
  prefs: WorkspaceViewPrefs;
  onPrefsChange: (partial: Partial<WorkspaceViewPrefs>) => void;
};

/**
 * 문서작성 화면과 같은 필터 아이콘. 누르면 내가 쓴 글·검색 조건이 나오고,
 * 적용된 조건은 아이콘 옆에 해제할 수 있는 칩으로 보여준다.
 */
export function WorkspaceFilterMenu({ prefs, onPrefsChange }: WorkspaceFilterMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const keyword = prefs.keyword.trim();
  const active = prefs.onlyMine || keyword !== '';

  const chips = [
    ...(prefs.onlyMine
      ? [{ key: 'mine', label: '내가 쓴 글', deleteLabel: '내가 쓴 글 필터 해제', clear: () => onPrefsChange({ onlyMine: false }) }]
      : []),
    ...(keyword !== ''
      ? [{ key: 'keyword', label: `검색: ${keyword}`, deleteLabel: '검색어 필터 해제', clear: () => onPrefsChange({ keyword: '' }) }]
      : []),
  ];

  return (
    <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, flexWrap: 'wrap', alignItems: 'center' }}>
      <IconButton
        size="small"
        aria-label="글 필터"
        title="필터"
        onClick={(event) => setAnchor(event.currentTarget)}
        color={active ? 'primary' : 'default'}
      >
        <FilterListOutlined fontSize="small" />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, width: 280, maxWidth: 'calc(100vw - 32px)' }}>
          <FormControlLabel
            label="내가 쓴 글"
            slotProps={{ typography: { variant: 'body2' } }}
            control={
              <Checkbox size="small" checked={prefs.onlyMine} onChange={(event) => onPrefsChange({ onlyMine: event.target.checked })} />
            }
          />
          <TextField
            size="small"
            fullWidth
            placeholder="제목·본문 검색"
            value={prefs.keyword}
            onChange={(event) => onPrefsChange({ keyword: event.target.value })}
            slotProps={{ htmlInput: { 'aria-label': '글 검색' } }}
            sx={{ mt: 0.5 }}
          />
        </Box>
      </Popover>
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          size="small"
          aria-label={chip.deleteLabel}
          onDelete={chip.clear}
          deleteIcon={<CloseOutlinedIcon data-testid={`filter-delete-icon-${chip.key}`} fontSize="small" aria-hidden="true" />}
          sx={{ maxWidth: '100%', minWidth: 0 }}
        />
      ))}
    </Stack>
  );
}
