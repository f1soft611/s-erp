import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import type { ArchiveCategory, ArchivePost } from '../types/archive.types';

type ArchivePostTableProps = {
  posts: ArchivePost[];
  categories: ArchiveCategory[];
  isLoading: boolean;
  pageIndex: number;
  pageUnit: number;
  resultCnt: number;
  onSelect: (post: ArchivePost) => void;
  onPageChange: (pageIndex: number) => void;
};

function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('ko-KR');
}

export function ArchivePostTable({
  posts,
  categories,
  isLoading,
  pageIndex,
  pageUnit,
  resultCnt,
  onSelect,
  onPageChange,
}: ArchivePostTableProps) {
  const categoryNames = new Map(
    categories.map((category) => [category.code, category.name]),
  );

  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      {isLoading ? (
        <Box
          role="status"
          aria-label="자료 목록 불러오는 중"
          sx={{ display: 'flex', justifyContent: 'center', p: 5 }}
        >
          <CircularProgress size={28} />
        </Box>
      ) : posts.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ py: 5, px: 2, textAlign: 'center', color: 'text.secondary' }}
        >
          <Typography>등록된 자료가 없습니다.</Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          aria-label="자료 목록 표 영역"
          sx={{ maxWidth: '100%', overflowX: 'auto' }}
        >
          <Table
            aria-label="자료실 목록"
            size="small"
            sx={{ minWidth: 700, tableLayout: 'fixed' }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '42%', fontWeight: 700 }}>제목</TableCell>
                <TableCell sx={{ width: '17%', fontWeight: 700 }}>분류</TableCell>
                <TableCell sx={{ width: '15%', fontWeight: 700 }}>작성자</TableCell>
                <TableCell sx={{ width: '16%', fontWeight: 700 }}>등록일</TableCell>
                <TableCell align="right" sx={{ width: '10%', fontWeight: 700 }}>
                  파일 수
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.postId} hover>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>
                    <Button
                      type="button"
                      variant="text"
                      onClick={() => onSelect(post)}
                      sx={{
                        minWidth: 0,
                        maxWidth: '100%',
                        p: 0,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {post.title}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>
                    {categoryNames.get(post.categoryCode) ?? post.categoryCode}
                  </TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere' }}>
                    {post.writerName ?? post.writerId ?? '—'}
                  </TableCell>
                  <TableCell>{formatDate(post.createdAt)}</TableCell>
                  <TableCell align="right">{post.attachmentCount ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={resultCnt}
            page={Math.max(0, pageIndex - 1)}
            rowsPerPage={pageUnit}
            rowsPerPageOptions={[pageUnit]}
            onPageChange={(_, page) => onPageChange(page + 1)}
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} / ${count !== -1 ? count : `${to} 이상`}`
            }
            sx={{
              overflow: 'hidden',
              '.MuiTablePagination-toolbar': {
                px: { xs: 1, sm: 2 },
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              },
              '.MuiTablePagination-selectLabel, .MuiTablePagination-select': {
                display: 'none',
              },
            }}
          />
        </TableContainer>
      )}
    </Box>
  );
}
