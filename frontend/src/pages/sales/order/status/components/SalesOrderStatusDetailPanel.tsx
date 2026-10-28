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

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box
      role="group"
      aria-label={title}
      sx={{
        minWidth: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        bgcolor: 'background.paper',
      }}
    >
      <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
        {children}
      </Box>
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
        subtitle={order ? `수주번호: ${order.orderNo}` : undefined}
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
              aria-label="수주 요약"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
                alignItems: 'center',
                gap: { xs: 1.5, sm: 2 },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 2, sm: 2.5 },
                bgcolor: 'action.hover',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" component="div">
                  거래처
                </Typography>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                >
                  {order.customerName || '-'}
                </Typography>
                <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <InfoItem label="수주일자">{order.orderDt || '-'}</InfoItem>
                  <InfoItem label="납기일자">{order.deliveryDt || '-'}</InfoItem>
                </Stack>
              </Box>
              <Box sx={{ minWidth: { sm: 150 }, textAlign: { sm: 'right' } }}>
                <Typography variant="caption" color="text.secondary" component="div">
                  총 합계
                </Typography>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatAmount(order.totalAmt)}
                </Typography>
              </Box>
            </Box>

            <Box
              aria-label="수주 기본정보"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              <InfoGroup title="수주 정보">
                <InfoItem label="견적번호">{order.quotNo || '-'}</InfoItem>
                <InfoItem label="배송방법">{order.deliveryMethod || '-'}</InfoItem>
              </InfoGroup>
              <InfoGroup title="납품 정보">
                <InfoItem label="납품장소" wide>{order.deliveryPlace || '-'}</InfoItem>
                <InfoItem label="비고" wide>{order.remark || '-'}</InfoItem>
              </InfoGroup>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>
                  수주 품목
                </Typography>
                <Chip size="small" variant="outlined" label={`${order.details.length}건`} />
              </Stack>
              <TableContainer
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflowX: 'auto' }}
              >
                <Table
                  size="small"
                  aria-label="수주 품목 목록"
                  sx={{
                    minWidth: 560,
                    '& .MuiTableCell-head': {
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    },
                    '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
                      borderBottom: 0,
                    },
                  }}
                >
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
                    {order.details.length ? (
                      order.details.map((detail) => (
                        <TableRow
                          key={detail.salesOrderDetailId}
                          sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell align="center">{detail.lineNo}</TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {detail.materialCode ?? '-'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                              {detail.materialName ?? '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{formatAmount(detail.orderQty)}</TableCell>
                          <TableCell align="right">{formatAmount(detail.unitPrice)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatAmount(detail.totalAmt)}
                          </TableCell>
                          <TableCell align="center">{detail.deliveryDt || '-'}</TableCell>
                          <TableCell align="center">{detail.lineStatus || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                          등록된 수주 품목이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
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
