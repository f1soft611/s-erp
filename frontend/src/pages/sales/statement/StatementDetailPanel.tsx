import { useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Alert, Box, Chip, Divider, IconButton, Menu, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PostDetailPanel } from '../../../shared/components/feed/PostDetailPanel';
import { ProfileAvatar } from '../../../shared/components/ProfileAvatar';
import { PageAreaOverlay } from '../../../shared/components/view-mode/PageAreaOverlay';
import type { StatementItem } from './types';

const amount = (value: number) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
export function StatementDetailPanel({ item, loading, error, canEdit, onClose, onView, onEdit, onPrint }: {
  item: StatementItem | null; loading: boolean; error: string; canEdit: boolean;
  onClose: () => void; onView: () => void; onEdit: () => void; onPrint: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const writer = item?.createdByName || item?.createdBy || '-';
  return <PageAreaOverlay onClose={onClose}>
    <PostDetailPanel title="거래명세서 상세" subtitle={item ? `명세번호: ${item.statementNo}` : undefined}
      onClose={onClose} isLoading={loading && !item} loadingLabel="거래명세서를 불러오는 중입니다.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {item ? <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <ProfileAvatar name={writer} imageUrl={item.createdByProfileImage} fallback={writer.slice(0, 1)}
              sx={{ width: 40, height: 40, flexShrink: 0 }} />
            <Box><Typography variant="body2" sx={{ fontWeight: 700 }}>{writer}</Typography>
              <Typography variant="caption" color="text.secondary">{item.createdAt || '작성자'}</Typography></Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" color="primary" label={item.deliveryType === 'ORDER' ? '수주출하' : '직출하'} />
            <Divider orientation="vertical" flexItem />
            <IconButton size="small" aria-label="거래명세서 더보기" aria-haspopup="menu" aria-expanded={Boolean(anchor)}
              onClick={(event) => setAnchor(event.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
              {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
              <MenuItem onClick={() => { setAnchor(null); onPrint(); }}>출력</MenuItem>
            </Menu>
          </Stack>
        </Stack>
        <Box aria-label="거래명세서 요약" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' },
          gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover' }}>
          <Box><Typography variant="caption" color="text.secondary">거래처</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{item.customerName || '-'}</Typography>
            <Typography variant="body2">명세일: {item.statementDt}　출하번호: {item.deliveryNo}</Typography></Box>
          <Box sx={{ textAlign: { sm: 'right' } }}><Typography variant="caption" color="text.secondary">총 합계</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{amount(item.totalAmt)}</Typography></Box>
        </Box>
        <Box role="group" aria-label="거래명세서 기본정보"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>기본정보</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
            <Typography variant="body2">공급자: {item.supplierName || '-'}</Typography>
            <Typography variant="body2">거래처코드: {item.customerCode || '-'}</Typography>
            <Typography variant="body2">출하일자: {item.deliveryDt}</Typography>
            <Typography variant="body2">비고: {item.remark || '-'}</Typography>
          </Box>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>거래명세서 품목 ({item.details.length}건)</Typography>
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
            <Table size="small" aria-label="거래명세서 품목 목록" sx={{ minWidth: 560 }}>
              <TableHead><TableRow><TableCell>행</TableCell><TableCell>품목코드</TableCell><TableCell>품목명</TableCell>
                <TableCell align="right">수량</TableCell><TableCell align="right">단가</TableCell><TableCell align="right">합계</TableCell></TableRow></TableHead>
              <TableBody>{item.details.map((row) => <TableRow key={row.salesStatementDetailId}>
                <TableCell>{row.lineNo}</TableCell><TableCell>{row.materialCode || '-'}</TableCell>
                <TableCell>{row.materialName || '-'}</TableCell><TableCell align="right">{amount(row.deliveryQty)}</TableCell>
                <TableCell align="right">{amount(row.unitPrice)}</TableCell><TableCell align="right">{amount(row.totalAmt)}</TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack> : null}
    </PostDetailPanel>
  </PageAreaOverlay>;
}
