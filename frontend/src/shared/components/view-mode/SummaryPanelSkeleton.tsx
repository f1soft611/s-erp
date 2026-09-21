import { Box, Card, CardContent, Skeleton, Stack } from '@mui/material';

export function SummaryPanelSkeleton() {
  return (
    <Stack data-testid="summary-panel-skeleton" spacing={2}>
      <Card
        sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}
      >
        <CardContent>
          <Skeleton variant="text" width="42%" height={28} />
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Skeleton variant="text" width="45%" />
                <Skeleton variant="text" width="18%" />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
      <Card
        sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}
      >
        <CardContent>
          <Skeleton variant="text" width="38%" height={28} />
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Box key={index} sx={{ display: 'grid', gap: 0.5 }}>
                <Skeleton variant="text" width="82%" />
                <Skeleton variant="text" width="56%" />
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
