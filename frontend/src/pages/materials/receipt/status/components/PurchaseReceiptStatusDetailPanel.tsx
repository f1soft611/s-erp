import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Alert,
  Box,
  Chip,
  Divider,
  IconButton,
  Link,
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
import type { PurchaseReceiptItem } from '../../create/types/purchaseReceipt.types';
import { purchaseReceiptStatusLabel } from '../services/purchaseReceiptStatus.service';

type Props = {
  item: PurchaseReceiptItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  /** 연결된 정상 가입고의 상세를 연다. */
  onOpenArrival?: (purchaseArrivalId: number) => void;
};

const TAX_LABELS: Record<string, string> = { TAXABLE: '과세', ZERO_RATED: '영세', EXEMPT: '면세' };

/** `YYYYMM` → `YYYY-MM`. */
function formatMonth(month: string | null | undefined) {
  return month && /^\d{6}$/.test(month) ? `${month.slice(0, 4)}-${month.slice(4)}` : '';
}

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

function ActionsMenu({ canEdit, onView, onEdit }: { canEdit: boolean; onView: () => void; onEdit: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label="입고 더보기" size="small" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
      </Menu>
    </>
  );
}

export function PurchaseReceiptStatusDetailPanel({
  item,
  loading,
  error,
  canEdit,
  onClose,
  onView,
  onEdit,
  onOpenArrival,
}: Props) {
  const status = item?.useAt === 'N' ? 'CANCELED' : 'ACTIVE';
  const details = item?.details ?? [];
  const closedDetails = details.filter((detail) => detail.closingMonth);
  const closedMonths = Array.from(new Set(closedDetails.map((detail) => formatMonth(detail.closingMonth)))).sort();
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="입고 상세"
        subtitle={item ? `입고번호: ${item.receiptNo}` : undefined}
        onClose={onClose}
        isLoading={loading && item === null}
        loadingLabel="입고 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {item ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                담당자 {item.receiverName ?? '-'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  color={status === 'CANCELED' ? 'default' : 'primary'}
                  label={purchaseReceiptStatusLabel(status)}
                />
                {closedDetails.length > 0 ? <Chip size="small" color="warning" label="매입마감" /> : null}
                <Divider orientation="vertical" flexItem />
                <ActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>
            {closedDetails.length > 0 ? (
              <Alert severity="warning">
                {`매입마감된 입고입니다(마감 ${closedDetails.length}건, 마감월 ${closedMonths.join(', ')}). 수정·취소하려면 매입마감처리에서 마감을 해제하세요.`}
              </Alert>
            ) : null}
            <Box
              aria-label="입고 요약"
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
              <InfoItem label="입고일">{item.receiptDt || '-'}</InfoItem>
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
              <Table size="small" aria-label="입고 품목 목록" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">순번</TableCell>
                    <TableCell>가입고번호</TableCell>
                    <TableCell>검사번호</TableCell>
                    <TableCell>발주번호</TableCell>
                    <TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell>
                    <TableCell align="right">입고수량</TableCell>
                    <TableCell align="right">입고단가</TableCell>
                    <TableCell align="right">합계</TableCell>
                    <TableCell align="center">마감월</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.purchaseReceiptDetailId}>
                      <TableCell align="center">{detail.lineNo}</TableCell>
                      <TableCell>
                        {onOpenArrival && detail.arrivalActive === 'Y' && detail.purchaseArrivalId != null ? (
                          <Link
                            component="button"
                            type="button"
                            underline="hover"
                            aria-label={`${detail.arrivalNo} 가입고 보기`}
                            onClick={() => onOpenArrival(detail.purchaseArrivalId as number)}
                            sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
                          >
                            {detail.arrivalNo}
                          </Link>
                        ) : (detail.arrivalNo ?? '-')}
                      </TableCell>
                      <TableCell>{detail.inspectionNo ?? '-'}</TableCell>
                      <TableCell>{detail.orderNo ?? '-'}</TableCell>
                      <TableCell>{detail.materialCode ?? '-'}</TableCell>
                      <TableCell>{detail.materialName ?? '-'}</TableCell>
                      <TableCell align="right">{formatNumber(detail.receiptQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.unitPrice)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.totalAmt)}</TableCell>
                      <TableCell align="center">{formatMonth(detail.closingMonth) || '-'}</TableCell>
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
