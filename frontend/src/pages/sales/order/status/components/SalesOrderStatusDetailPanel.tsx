import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { ProfileAvatar } from '../../../../../shared/components/ProfileAvatar';
import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import type { SalesOrderItem } from '../../create/types/salesOrder.types';
import { SalesOrderActionsMenu } from './SalesOrderActionsMenu';

type SalesOrderStatusDetailPanelProps = {
  order: SalesOrderItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
};

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'info' | 'success' | 'error'> = {
  수주등록: 'primary',
  생산대기: 'info',
  생산중: 'info',
  출하완료: 'success',
  취소: 'error',
};

function formatAmount(value: number | null | undefined, fractionDigits = 0) {
  if (value == null) return '-';
  return Number(value).toLocaleString('ko-KR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
}

function InfoItem({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

export function SalesOrderStatusDetailPanel({
  order,
  loading,
  error,
  canEdit,
  onClose,
  onView,
  onEdit,
}: SalesOrderStatusDetailPanelProps) {
  const writerName = order?.createdByName || order?.createdBy || '-';

  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="수주 상세"
        subtitle={order?.orderNo}
        onClose={onClose}
        isLoading={loading && order === null}
        loadingLabel="수주 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {order ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 1,
                minWidth: 0,
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 220px' }}>
                <ProfileAvatar
                  name={writerName}
                  imageUrl={order.createdByProfileImage}
                  fallback={writerName.slice(0, 1)}
                  sx={{ width: 40, height: 40, flexShrink: 0 }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                    {writerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    작성자 · 등록 {order.createdAt ?? '-'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip size="small" color={STATUS_COLORS[order.status] ?? 'default'} label={order.status} />
                <Divider orientation="vertical" flexItem />
                <SalesOrderActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>

            <Box
              aria-label="수주 기본정보"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 1.5, sm: 2 },
                bgcolor: 'background.default',
              }}
            >
              <InfoItem label="수주일자">{order.orderDt}</InfoItem>
              <InfoItem label="거래처">{order.customerName ?? '-'}</InfoItem>
              <InfoItem label="견적번호">{order.quotNo || '-'}</InfoItem>
              <InfoItem label="납기일자">{order.deliveryDt || '-'}</InfoItem>
              <InfoItem label="납품장소">{order.deliveryPlace || '-'}</InfoItem>
              <InfoItem label="배송방법">{order.deliveryMethod || '-'}</InfoItem>
              <InfoItem label="총 합계">{formatAmount(order.totalAmt)}</InfoItem>
              <InfoItem label="품목 수">{order.details.length}건</InfoItem>
              <InfoItem label="비고" wide>
                {order.remark || '-'}
              </InfoItem>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                수주 품목
              </Typography>
              <TableContainer
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}
              >
                <Table size="small" aria-label="수주 품목 목록" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">행</TableCell>
                      <TableCell>품목코드</TableCell>
                      <TableCell>품목명</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">합계</TableCell>
                      <TableCell align="center">납기</TableCell>
                      <TableCell align="center">행상태</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.details.map((detail) => (
                      <TableRow key={detail.salesOrderDetailId}>
                        <TableCell align="center">{detail.lineNo}</TableCell>
                        <TableCell>{detail.materialCode ?? '-'}</TableCell>
                        <TableCell>{detail.materialName ?? '-'}</TableCell>
                        <TableCell align="right">{formatAmount(detail.orderQty)}</TableCell>
                        <TableCell align="right">{formatAmount(detail.unitPrice)}</TableCell>
                        <TableCell align="right">{formatAmount(detail.totalAmt)}</TableCell>
                        <TableCell align="center">{detail.deliveryDt || '-'}</TableCell>
                        <TableCell align="center">{detail.lineStatus || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        ) : null}
      </PostDetailPanel>
    </PageAreaOverlay>
  );
}
