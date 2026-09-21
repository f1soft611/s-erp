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
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'minmax(0, 1fr) minmax(92px, 0.3fr) minmax(150px, 0.4fr)',
            },
            gap: 1.5,
            alignItems: 'center',
            minHeight: 48,
            px: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
        </Box>
      ))}
    </Stack>
  );
}
