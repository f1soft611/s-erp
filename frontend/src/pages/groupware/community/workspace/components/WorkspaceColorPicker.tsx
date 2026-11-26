import { useState } from 'react';
import { Box, Button, Divider, IconButton, Popover, Typography } from '@mui/material';
import { TEXT_COLOR_SWATCHES } from '../../../../../shared/components/rich-text-editor/textColorSwatches';

type WorkspaceColorPickerProps = {
  /** 지금 적용된 색(#rrggbb). 없으면 기본 모양. */
  value: string | null | undefined;
  onChange: (color: string | null) => void;
  /** 색상 버튼의 접근성 이름 */
  ariaLabel: string;
  /** 기본으로 되돌리는 버튼 이름. 기본값은 서식 에디터와 같은 "기본 색상" */
  resetLabel?: string;
};

const MAX_RECENT_COLORS = 6;

/**
 * 서식 에디터의 글자색 팔레트(기본 색상 버튼, 견본 12색 6열, 최근 색상)와 같은 모양의 색상 선택.
 * 에디터의 팔레트는 도구 모음 안에 묶여 있어 같은 견본 목록과 배치를 따로 구성했다.
 */
export function WorkspaceColorPicker({ value, onChange, ariaLabel, resetLabel = '기본 색상' }: WorkspaceColorPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const current = value?.toLowerCase() ?? null;

  const choose = (color: string | null) => {
    if (color) {
      setRecentColors((recent) => [color, ...recent.filter((item) => item !== color)].slice(0, MAX_RECENT_COLORS));
    }
    onChange(color);
    setAnchor(null);
  };

  const renderSwatch = (color: string, isRecent = false) => (
    <IconButton
      key={`${isRecent ? 'recent' : 'preset'}-${color}`}
      size="small"
      aria-label={`${isRecent ? '최근 색상' : '색상'} ${color}`}
      aria-pressed={current === color}
      onClick={() => choose(color)}
      sx={{
        width: 20,
        height: 20,
        p: 0,
        borderRadius: 1,
        border: 1,
        borderColor: current === color ? 'text.primary' : 'divider',
      }}
    >
      <Box sx={{ width: 14, height: 14, bgcolor: color, borderRadius: 1 }} />
    </IconButton>
  );

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ width: 28, height: 28, border: 1, borderColor: 'divider', borderRadius: 1 }}
      >
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: 0.5,
            bgcolor: value ?? 'transparent',
            border: 1,
            borderColor: value ? 'transparent' : 'divider',
            // 색이 없을 때는 비어 있는 견본(빗금)으로 보여준다.
            backgroundImage: value ? 'none' : 'linear-gradient(135deg, transparent 45%, rgba(148,163,184,0.9) 45%, rgba(148,163,184,0.9) 55%, transparent 55%)',
          }}
        />
      </IconButton>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { width: 176, p: 1, border: 1, borderColor: 'divider' } } }}
      >
        <Button
          size="small"
          fullWidth
          onClick={() => choose(null)}
          sx={{ justifyContent: 'flex-start', mb: 0.75 }}
          startIcon={<Box sx={{ width: 12, height: 12, bgcolor: 'text.primary', border: 1, borderColor: 'divider' }} />}
        >
          {resetLabel}
        </Button>
        <Box
          data-testid="workspace-color-swatches"
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5 }}
        >
          {TEXT_COLOR_SWATCHES.map((color) => renderSwatch(color))}
        </Box>
        {recentColors.length > 0 ? (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              최근 색상
            </Typography>
            <Box
              role="group"
              aria-label="최근 색상"
              sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.5 }}
            >
              {recentColors.map((color) => renderSwatch(color, true))}
            </Box>
          </>
        ) : null}
      </Popover>
    </>
  );
}
