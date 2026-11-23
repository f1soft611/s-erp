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
import type { PurchaseArrivalItem } from '../../create/types/purchaseArrival.types';
import { purchaseArrivalStatusLabel } from '../services/purchaseArrivalStatus.service';

type Props = {
  item: PurchaseArrivalItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  /** 가입고 행에 등록된 수입검사의 상세를 연다(검사현황). */
  onOpenInspection?: (inspectionId: number) => void;
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

function ActionsMenu({ canEdit, onView, onEdit }: { canEdit: boolean; onView: () => void; onEdit: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton aria-label="가입고 더보기" size="small" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
      </Menu>
    </>
  );
}

export function PurchaseArrivalStatusDetailPanel({
  item,
  loading,
  error,
  canEdit,
  onClose,
  onView,
  onEdit,
  onOpenInspection,
}: Props) {
  const status = item?.useAt === 'N' ? 'CANCELED' : 'ACTIVE';
  const details = item?.details ?? [];
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="가입고 상세"
        subtitle={item ? `가입고번호: ${item.arrivalNo}` : undefined}
        onClose={onClose}
        isLoading={loading && item === null}
        loadingLabel="가입고 상세를 불러오는 중입니다."
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
                  label={purchaseArrivalStatusLabel(status)}
                />
                <Divider orientation="vertical" flexItem />
                <ActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>
            <Box
              aria-label="가입고 요약"
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
              <InfoItem label="가입고일">{item.arrivalDt || '-'}</InfoItem>
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
              <Table size="small" aria-label="가입고 품목 목록" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">순번</TableCell>
                    <TableCell>발주번호</TableCell>
                    <TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell>
                    <TableCell align="right">가입고수량</TableCell>
                    <TableCell align="right">가입고단가</TableCell>
                    <TableCell align="right">합계</TableCell>
                    <TableCell>입고번호</TableCell>
                    <TableCell>검사번호</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.purchaseArrivalDetailId}>
                      <TableCell align="center">{detail.lineNo}</TableCell>
                      <TableCell>{detail.orderNo ?? '-'}</TableCell>
                      <TableCell>{detail.materialCode ?? '-'}</TableCell>
                      <TableCell>{detail.materialName ?? '-'}</TableCell>
                      <TableCell align="right">{formatNumber(detail.arrivalQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.unitPrice)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.totalAmt)}</TableCell>
                      <TableCell>{detail.receiptNo ?? '-'}</TableCell>
                      <TableCell>
                        {onOpenInspection && detail.inspectionId != null && detail.inspectionNo ? (
                          <Link
                            component="button"
                            type="button"
                            underline="hover"
                            aria-label={`${detail.inspectionNo} 수입검사 보기`}
                            onClick={() => onOpenInspection(detail.inspectionId as number)}
                            sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
                          >
                            {detail.inspectionNo}
                          </Link>
                        ) : (detail.inspectionNo ?? '-')}
                      </TableCell>
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
