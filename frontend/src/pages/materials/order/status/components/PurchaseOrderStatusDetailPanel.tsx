import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { PostDetailPanel } from '../../../../../shared/components/feed/PostDetailPanel';
import { PageAreaOverlay } from '../../../../../shared/components/view-mode/PageAreaOverlay';
import type { PurchaseOrderItem } from '../../create/types/purchaseOrder.types';
import { purchaseOrderStatusLabel } from '../services/purchaseOrderStatus.service';

type Props = {
  item: PurchaseOrderItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onReceiptClose: () => void;
  /** 출력은 취소되지 않은 발주에서만 보인다. */
  canPrint: boolean;
  onPrint: () => void;
};

const TAX_LABELS: Record<string, string> = { TAXABLE: '과세', ZERO_RATED: '영세', EXEMPT: '면세' };

function formatNumber(value: number | null | undefined) {
  return value == null ? '-' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

function ActionsMenu({ canEdit, onView, onEdit, onReceiptClose, canPrint, onPrint }: {
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onReceiptClose: () => void;
  canPrint: boolean;
  onPrint: () => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label="발주 더보기" size="small" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
        {canEdit ? <MenuItem onClick={() => { setAnchor(null); onReceiptClose(); }}>입고대기마감</MenuItem> : null}
        {canPrint ? <MenuItem onClick={() => { setAnchor(null); onPrint(); }}>출력</MenuItem> : null}
      </Menu>
    </>
  );
}

export function PurchaseOrderStatusDetailPanel({
  item, loading, error, canEdit, onClose, onView, onEdit, onReceiptClose, canPrint, onPrint,
}: Props) {
  const status = item?.useAt === 'N' ? 'CANCELED' : 'ACTIVE';
  const details = item?.details ?? [];
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="발주 상세"
        subtitle={item ? `발주번호: ${item.orderNo}` : undefined}
        onClose={onClose}
        isLoading={loading && item === null}
        loadingLabel="발주 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {item ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                발주자 {item.ordererName ?? '-'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  color={status === 'CANCELED' ? 'default' : 'primary'}
                  label={purchaseOrderStatusLabel(status)}
                />
                <Divider orientation="vertical" flexItem />
                <ActionsMenu
                  canEdit={canEdit}
                  onView={onView}
                  onEdit={onEdit}
                  onReceiptClose={onReceiptClose}
                  canPrint={canPrint}
                  onPrint={onPrint}
                />
              </Stack>
            </Stack>
            <Box
              aria-label="발주 요약"
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                gap: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                bgcolor: 'action.hover',
              }}
            >
              <InfoItem label="발주일">{item.orderDt || '-'}</InfoItem>
              <InfoItem label="구매처">{item.supplierName || '-'}</InfoItem>
              <InfoItem label="부가세">
                {`${TAX_LABELS[item.taxType ?? ''] ?? '-'}${item.taxType === 'TAXABLE' ? (item.vatIncludedAt === 'Y' ? ' · 포함' : ' · 미포함') : ''}`}
              </InfoItem>
              <InfoItem label="통화">{item.currencyCode || '-'}</InfoItem>
              <InfoItem label="공급가액">{formatNumber(item.supplyAmt)}</InfoItem>
              <InfoItem label="부가세액">{formatNumber(item.vatAmt)}</InfoItem>
              <InfoItem label="합계액">{formatNumber(item.totalAmt)}</InfoItem>
              <InfoItem label="품목 수">{`${details.length}건`}</InfoItem>
            </Box>
            <InfoItem label="비고">{item.remark || '-'}</InfoItem>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small" aria-label="발주 품목 목록" sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">순번</TableCell>
                    <TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell>
                    <TableCell align="right">발주수량</TableCell>
                    <TableCell align="right">발주단가</TableCell>
                    <TableCell align="right">합계</TableCell>
                    <TableCell align="center">납기일</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.purchaseOrderDetailId}>
                      <TableCell align="center">{detail.lineNo}</TableCell>
                      <TableCell>{detail.materialCode ?? '-'}</TableCell>
                      <TableCell>{detail.materialName ?? '-'}</TableCell>
                      <TableCell align="right">{formatNumber(detail.orderQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.unitPrice)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.totalAmt)}</TableCell>
                      <TableCell align="center">{detail.deliveryDt || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        ) : null}
      </PostDetailPanel>
    </PageAreaOverlay>
  );
}
