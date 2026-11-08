import { useState, type ReactNode } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Alert, Box, Chip, Divider, IconButton, Menu, MenuItem, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { ProfileAvatar } from '../../../../../shared/components/ProfileAvatar';
import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import type { DeliveryItem } from '../../create/types/salesDelivery.types';

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
    <Typography variant="body2" component="div" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{children || '-'}</Typography>
  </Box>;
}
function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return <Box role="group" aria-label={title} sx={{ minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 1.5, sm: 2 }, bgcolor: 'background.paper' }}>
    <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>{children}</Box>
  </Box>;
}
const amount = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export function DeliveryStatusDetailPanel({ item, loading, error, canEdit, onClose, onView, onEdit }: {
  item: DeliveryItem | null; loading: boolean; error: string; canEdit: boolean;
  onClose: () => void; onView: () => void; onEdit: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const writer = item?.createdBy || '-';
  return <PageAreaOverlay onClose={onClose}>
    <PostDetailPanel title="출하 상세" subtitle={item ? `출하번호: ${item.deliveryNo}` : undefined}
      onClose={onClose} isLoading={loading && !item} loadingLabel="출하 상세를 불러오는 중입니다.">
      {error ? <Alert severity="error">{error}</Alert> : null}
      {item ? <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 220px' }}>
            <ProfileAvatar name={writer} fallback={writer.slice(0, 1)} sx={{ width: 40, height: 40, flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{writer}</Typography>
              <Typography variant="caption" color="text.secondary">작성자</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" color="primary" label={item.deliveryType === 'ORDER' ? '수주출하' : '직출하'} />
            <Divider orientation="vertical" flexItem />
            <IconButton size="small" aria-label="출하 더보기" aria-haspopup="menu" aria-expanded={Boolean(anchor)}
              onClick={(event) => setAnchor(event.currentTarget)}><MoreVertIcon fontSize="small" /></IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
              <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
              {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
            </Menu>
          </Stack>
        </Stack>
        <Box aria-label="출하 요약" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
          alignItems: 'center', gap: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover' }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div">거래처</Typography>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{item.customerName || '-'}</Typography>
            <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
              <InfoItem label="출하일자">{item.deliveryDt}</InfoItem>
              <InfoItem label="연결 수주번호">{item.orderNo}</InfoItem>
            </Stack>
          </Box>
          <Box sx={{ minWidth: { sm: 150 }, textAlign: { sm: 'right' } }}>
            <Typography variant="caption" color="text.secondary" component="div">총 합계</Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{amount(item.totalAmt)}</Typography>
          </Box>
        </Box>
        <Box aria-label="출하 기본정보" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
          <InfoGroup title="출하 정보"><InfoItem label="출하장소">{item.deliveryPlace}</InfoItem><InfoItem label="배송방법">{item.deliveryMethod}</InfoItem></InfoGroup>
          <InfoGroup title="추가 정보"><InfoItem label="거래처코드">{item.customerCode}</InfoItem><InfoItem label="비고">{item.remark}</InfoItem></InfoGroup>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>출하 품목</Typography>
            <Chip size="small" variant="outlined" label={`${item.details.length}건`} />
          </Stack>
          <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}>
            <Table size="small" aria-label="출하 품목 목록" sx={{ minWidth: 560,
              '& .MuiTableCell-head': { bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' },
              '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': { borderBottom: 0 } }}>
              <TableHead><TableRow>
                <TableCell align="center">행</TableCell><TableCell>품목코드</TableCell><TableCell>품목명</TableCell>
                <TableCell align="right">수량</TableCell><TableCell align="right">단가</TableCell><TableCell align="right">합계</TableCell>
              </TableRow></TableHead>
              <TableBody>{item.details.length ? item.details.map((detail) => (
                <TableRow key={detail.salesDeliveryDetailId} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                  <TableCell align="center">{detail.lineNo}</TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{detail.materialCode || '-'}</Typography></TableCell>
                  <TableCell sx={{ minWidth: 120 }}><Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{detail.materialName || '-'}</Typography></TableCell>
                  <TableCell align="right">{amount(detail.deliveryQty)}</TableCell><TableCell align="right">{amount(detail.unitPrice)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{amount(detail.totalAmt)}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>등록된 출하 품목이 없습니다.</TableCell></TableRow>}</TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Stack> : null}
    </PostDetailPanel>
  </PageAreaOverlay>;
}
