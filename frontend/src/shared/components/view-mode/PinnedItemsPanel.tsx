import { Box, Stack, Typography } from '@mui/material';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import type { CommonViewItem } from './commonViewTypes';

type PinnedItemsPanelProps<T extends CommonViewItem = CommonViewItem> = {
  items: T[];
};

export function PinnedItemsPanel<T extends CommonViewItem>({
  items,
}: PinnedItemsPanelProps<T>) {
  const pinnedItems = items.filter((item) => item.isPinned);

  return (
    <Box
      component="section"
      aria-label="상단 고정 공지"
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        px: 1.5,
        py: 1,
      }}
    >
      <Stack spacing={0.75}>
        {pinnedItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            고정된 공지가 없습니다.
          </Typography>
        ) : (
          pinnedItems.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
              }}
            >
              <PushPinOutlinedIcon fontSize="small" color="primary" />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.title}
              </Typography>
            </Box>
          ))
        )}
      </Stack>
    </Box>
  );
}
