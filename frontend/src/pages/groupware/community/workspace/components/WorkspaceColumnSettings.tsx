import { useState } from 'react';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowUpwardRounded from '@mui/icons-material/ArrowUpwardRounded';
import ViewColumnOutlined from '@mui/icons-material/ViewColumnOutlined';
import { Box, Button, Checkbox, FormControlLabel, IconButton, Popover, Stack, Typography } from '@mui/material';
import type { WorkspaceColumn, WorkspaceViewPrefs } from '../types/workspace.types';
import { WorkspaceColorPicker } from './WorkspaceColorPicker';

type WorkspaceColumnSettingsProps = {
  prefs: WorkspaceViewPrefs;
  columns: WorkspaceColumn[];
  onPrefsChange: (partial: Partial<WorkspaceViewPrefs>) => void;
};

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

/** 칸반의 컬럼 숨김·접기·순서를 사용자별로 바꾸는 메뉴. 보기 전환 버튼 왼쪽에 둔다. */
export function WorkspaceColumnSettings({ prefs, columns, onPrefsChange }: WorkspaceColumnSettingsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const orderedColumns = prefs.columnOrder
    .map((id) => columns.find((column) => column.id === id))
    .filter((column): column is WorkspaceColumn => column !== undefined);

  const moveColumn = (index: number, delta: -1 | 1) => {
    const next = prefs.columnOrder.slice();
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onPrefsChange({ columnOrder: next });
  };

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<ViewColumnOutlined />} onClick={(event) => setAnchor(event.currentTarget)}>
        컬럼 설정
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, minWidth: 280 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            내 화면에서만 적용됩니다
          </Typography>
          {orderedColumns.map((column, index) => (
            <Stack key={column.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Checkbox
                size="small"
                checked={!prefs.hiddenColumnIds.includes(column.id)}
                onChange={() => onPrefsChange({ hiddenColumnIds: toggle(prefs.hiddenColumnIds, column.id) })}
                slotProps={{ input: { 'aria-label': `${column.name} 표시` } }}
              />
              <WorkspaceColorPicker
                value={prefs.columnColors[column.id] ?? column.color}
                ariaLabel={`${column.name} 색상`}
                resetLabel="방 기본 색상 사용"
                onChange={(color) => {
                  if (color) {
                    onPrefsChange({ columnColors: { ...prefs.columnColors, [column.id]: color } });
                    return;
                  }
                  const { [column.id]: _removed, ...rest } = prefs.columnColors;
                  onPrefsChange({ columnColors: rest });
                }}
              />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                {column.name}
              </Typography>
              <FormControlLabel
                sx={{ mr: 0 }}
                label="접기"
                slotProps={{ typography: { variant: 'caption' } }}
                control={
                  <Checkbox
                    size="small"
                    checked={prefs.collapsedColumnIds.includes(column.id)}
                    onChange={() => onPrefsChange({ collapsedColumnIds: toggle(prefs.collapsedColumnIds, column.id) })}
                    slotProps={{ input: { 'aria-label': `${column.name} 접기` } }}
                  />
                }
              />
              <IconButton size="small" aria-label={`${column.name} 위로`} disabled={index === 0} onClick={() => moveColumn(index, -1)}>
                <ArrowUpwardRounded fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`${column.name} 아래로`}
                disabled={index === orderedColumns.length - 1}
                onClick={() => moveColumn(index, 1)}
              >
                <ArrowDownwardRounded fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Box>
      </Popover>
    </>
  );
}
