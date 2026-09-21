import { Box, Stack, Typography } from '@mui/material';
import type { CommonViewItem } from './commonViewTypes';

type ListViewProps<T extends CommonViewItem> = {
  items: T[];
  onItemClick?: (item: T) => void;
};

export function ListView<T extends CommonViewItem>({
  items,
  onItemClick,
}: ListViewProps<T>) {
  return (
    <Stack
      component="section"
      aria-label="리스트형 공지 목록"
      sx={{ borderTop: '1px solid', borderColor: 'divider' }}
    >
      {items.map((item) => (
        <Box
          component="button"
          type="button"
          key={item.id}
          onClick={() => onItemClick?.(item)}
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) minmax(92px, 0.3fr) minmax(150px, 0.4fr)',
            },
            gap: 1.5,
            alignItems: 'center',
            width: '100%',
            minHeight: 48,
            px: 1.5,
            py: 1,
            textAlign: 'left',
            border: 0,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'transparent',
            color: 'inherit',
            cursor: onItemClick ? 'pointer' : 'default',
            '&:hover': onItemClick ? { bgcolor: 'action.hover' } : undefined,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {item.authorLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {item.dateLabel}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
