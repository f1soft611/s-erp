import { Box, Chip, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import type { CommonViewItem } from './commonViewTypes';

type ListViewProps<T extends CommonViewItem> = {
  items: T[];
  onItemClick?: (item: T) => void;
  ariaLabel?: string;
};

export function ListView<T extends CommonViewItem>({
  items,
  onItemClick,
  ariaLabel = '리스트형 목록',
}: ListViewProps<T>) {
  return (
    <Stack
      component="section"
      aria-label={ariaLabel}
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      {items.map((item) => (
        <Box
          component="button"
          type="button"
          key={item.id}
          onClick={() => onItemClick?.(item)}
          sx={{
            display: 'grid',
            gridTemplateColumns: '24px minmax(0, 1fr)',
            gap: 1.5,
            alignItems: 'center',
            width: '100%',
            minHeight: 68,
            px: 1.5,
            py: 1,
            textAlign: 'left',
            border: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'inherit',
            cursor: onItemClick ? 'pointer' : 'default',
            '&:hover': onItemClick ? { bgcolor: 'action.hover' } : undefined,
          }}
        >
          <DescriptionOutlinedIcon
            fontSize="small"
            sx={{ color: item.isPinned ? 'primary.main' : 'text.secondary' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minWidth: 0,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  minWidth: 0,
                  flex: 1,
                  fontWeight: 700,
                  color: item.isPinned ? 'primary.main' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </Typography>
              {item.categoryLabel && (
                <Chip
                  label={item.categoryLabel}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    ml: 'auto',
                    height: 22,
                    bgcolor: 'rgba(59,130,246,0.18)',
                    color: '#2563eb',
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.authorLabel}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {item.dateLabel}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
