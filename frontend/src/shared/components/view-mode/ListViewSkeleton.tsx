import { Box, Skeleton, Stack } from '@mui/material';

export function ListViewSkeleton() {
  return (
    <Stack
      data-testid="list-view-skeleton"
      sx={{ borderTop: '1px solid', borderColor: 'divider' }}
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <Box
          key={index}
          sx={{
            display: 'grid',
            gridTemplateColumns: '24px minmax(0, 1fr)',
            gap: 1.5,
            alignItems: 'center',
            minHeight: 68,
            px: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="rounded" width={18} height={20} />
          <Box>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="48%" />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
