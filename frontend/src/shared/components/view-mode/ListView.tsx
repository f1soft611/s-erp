import { Box, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
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
            bgcolor: item.isPinned ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
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
                  fontWeight: 700,
                  color: item.isPinned ? 'primary.main' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </Typography>
              <PeopleAltOutlinedIcon
                fontSize="inherit"
                sx={{ color: 'text.disabled', flexShrink: 0 }}
              />
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
