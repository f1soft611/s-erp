import { Box, Chip, Stack } from '@mui/material';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';

type NoticeFilterBarProps = {
  isDark: boolean;
};

const filters = ['전체', '중요 공지', '운영', '보안', '필독'];

export function NoticeFilterBar({ isDark }: NoticeFilterBarProps) {
  return (
    <Box
      sx={{
        px: 3,
        pt: 1,
        pb: 1,
        borderBottom: `1px solid ${
          isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.18)'
        }`,
        backgroundColor: isDark
          ? 'rgba(15,23,42,0.42)'
          : 'rgba(255,255,255,0.7)',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(30,41,59,0.9)' : '#f1f5f9',
            border: `1px solid ${
              isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.18)'
            }`,
          }}
          aria-label="필터 아이콘"
        >
          <FilterListOutlined
            fontSize="small"
            sx={{ color: isDark ? '#e2e8f0' : 'text.secondary' }}
          />
        </Box>
        {filters.map((filter) => (
          <Chip
            key={filter}
            label={filter}
            size="small"
            sx={{
              borderRadius: 999,
              bgcolor:
                filter === '중요 공지'
                  ? isDark
                    ? 'rgba(251, 191, 36, 0.18)'
                    : '#fef3c7'
                  : isDark
                    ? 'rgba(15, 23, 42, 0.9)'
                    : '#f1f5f9',
              color:
                filter === '중요 공지'
                  ? '#fbbf24'
                  : isDark
                    ? '#e2e8f0'
                    : 'text.primary',
              fontWeight: 700,
              border: `1px solid ${
                isDark ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.18)'
              }`,
            }}
          />
        ))}
      </Stack>
    </Box>
  );
}
