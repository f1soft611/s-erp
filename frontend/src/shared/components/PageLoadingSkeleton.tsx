import { Box, Skeleton } from '@mui/material';

type PageLoadingSkeletonProps = {
  rows?: number;
};

type GridColumnLike = {
  field: string;
  headerName?: string;
  flex?: number;
  minWidth?: number;
};

type GridLoadingSkeletonProps = {
  columns: GridColumnLike[];
  rows?: number;
  showHeader?: boolean;
};

export function PageLoadingSkeleton({ rows = 6 }: PageLoadingSkeletonProps) {
  return (
    <Box
      data-testid="page-loading-skeleton"
      sx={{
        display: 'grid',
        gap: 1.5,
        p: 3,
        width: '100%',
      }}
    >
      <Skeleton variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
      {Array.from({ length: rows - 1 }).map((_, index) => (
        <Skeleton
          key={`page-loading-skeleton-row-${index}`}
          variant="text"
          height={28}
          sx={{ borderRadius: 1 }}
        />
      ))}
    </Box>
  );
}

export function GridLoadingSkeleton({
  columns,
  rows = 6,
  showHeader = true,
}: GridLoadingSkeletonProps) {
  const gridTemplateColumns = columns
    .map((column) => {
      const minWidth = Math.max(column.minWidth ?? 80, 60);
      const flex = column.flex ?? 1;
      return `minmax(${minWidth}px, ${flex}fr)`;
    })
    .join(' ');

  return (
    <Box
      data-testid="grid-loading-skeleton"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: 180,
        gap: 1,
      }}
    >
      {showHeader ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns,
            gap: 1,
            alignItems: 'center',
            px: 0.5,
            py: 0.5,
            borderBottom: '1px solid rgba(148,163,184,0.25)',
          }}
        >
          {columns.map((column, index) => (
            <Box
              key={`grid-loading-header-${String(column.field)}-${index}`}
              sx={{
                minHeight: 26,
                display: 'flex',
                alignItems: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'text.secondary',
              }}
            >
              {column.headerName ?? column.field}
            </Box>
          ))}
        </Box>
      ) : null}
      {Array.from({ length: rows }).map((_, index) => (
        <Box
          key={`grid-loading-row-${index}`}
          data-testid="grid-loading-row-skeleton"
          sx={{
            display: 'grid',
            gridTemplateColumns,
            gap: 1,
            alignItems: 'center',
          }}
        >
          {columns.map((column, columnIndex) => (
            <Skeleton
              key={`grid-loading-cell-${String(column.field)}-${index}-${columnIndex}`}
              variant="text"
              height={22}
              sx={{ borderRadius: 1 }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}
