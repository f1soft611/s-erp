import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export function FeedViewSkeleton() {
  return (
    <Stack spacing={2} data-testid="feed-view-skeleton">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="30%" />
                <Skeleton variant="text" width="48%" />
              </Box>
            </Box>
            <Skeleton variant="text" width="65%" height={28} />
            <Skeleton variant="text" />
            <Skeleton variant="text" width="90%" />
            <Skeleton
              variant="rectangular"
              width={100}
              height={28}
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
