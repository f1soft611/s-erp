import {
  Alert,
  Box,
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
import { usePolicyDecimalRule } from '../../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../../shared/services/decimalColumnContract';
import { formatSalesOrderAmount, type SalesAmountRule } from '../../../order/create/data/salesOrderAmounts';
import type { QuotationItem } from '../../create/types/quotation.types';
import { QuotationActionsMenu } from './QuotationActionsMenu';

type Props = {
  quotation: QuotationItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
};

function formatAmount(value: number | string | null | undefined, rule?: SalesAmountRule) {
  if (value == null) return '-';
  if (rule) return formatSalesOrderAmount(value, rule);
  if (typeof value === 'string') return formatSalesOrderAmount(value, { places: 2, rounding: 'HALF_UP', trailingZeros: 'AUTO' });
  return Number(value).toLocaleString('ko-KR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function InfoItem({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }}>
      <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
      <Typography variant="body2" component="div" sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  );
}

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box role="group" aria-label={title} sx={{
      minWidth: 0, border: '1px solid', borderColor: 'divider',
      borderRadius: 1, p: { xs: 1.5, sm: 2 }, bgcolor: 'background.paper',
    }}>
      <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
        {children}
      </Box>
    </Box>
  );
}

export function QuotationStatusDetailPanel({
  quotation,
  loading,
  error,
  canEdit,
  onClose,
  onView,
  onEdit,
}: Props) {
  const policy = usePolicyDecimalRule();
  const contract = getDecimalColumnContract('sales.quotation');
  const quantityRule = policy && resolveDecimalColumn(contract.quotationQty, policy);
  const priceRule = policy && resolveDecimalColumn(contract.unitPrice, policy);
  const lineRule = policy && resolveDecimalColumn(contract.lineAmt, policy);
  const supplyRule = policy && resolveDecimalColumn(contract.supplyAmt, policy);
  const vatRule = policy && resolveDecimalColumn(contract.vatAmt, policy);
  const amountRule = policy && resolveDecimalColumn(contract.totalAmt, policy);
  const writerName = quotation?.createdByName || quotation?.createdBy || '-';
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="견적 상세"
        subtitle={quotation ? `견적번호: ${quotation.quotationNo}` : undefined}
        onClose={onClose}
        isLoading={loading && quotation === null}
        loadingLabel="견적 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {quotation ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1.5} sx={{
              alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
              rowGap: 1, minWidth: 0,
            }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0, flex: '1 1 220px' }}>
                <ProfileAvatar name={writerName} imageUrl={quotation.createdByProfileImage}
                  fallback={writerName.slice(0, 1)} sx={{ width: 40, height: 40, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{writerName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    작성자 · 등록 {quotation.createdAt ?? '-'}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
                <QuotationActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>

            <Box aria-label="견적 요약" sx={{
              display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' },
              alignItems: 'center', gap: { xs: 1.5, sm: 2 }, border: '1px solid',
              borderColor: 'divider', borderRadius: 1, p: { xs: 2, sm: 2.5 }, bgcolor: 'action.hover',
            }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" component="div">거래처</Typography>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                  {quotation.customerName || '-'}
                </Typography>
                <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                  <InfoItem label="견적작성일">{quotation.quotationDt || '-'}</InfoItem>
                  <InfoItem label="견적제출일">{quotation.submitDt || '-'}</InfoItem>
                </Stack>
              </Box>
              <Box sx={{ minWidth: { sm: 150 }, textAlign: { sm: 'right' } }}>
                <Typography variant="caption" color="text.secondary" component="div">총액</Typography>
                <Typography variant="h5" component="div" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(quotation.totalAmt, amountRule)}
                </Typography>
              </Box>
            </Box>

            <Box aria-label="견적 기본정보" sx={{
              display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1.5,
            }}>
              <InfoGroup title="견적 조건">
                <InfoItem label="참조">{quotation.customerReference || '-'}</InfoItem>
                <InfoItem label="Incoterms">{quotation.incoterms || '-'}</InfoItem>
                <InfoItem label="결제조건">{quotation.paymentTerm || '-'}</InfoItem>
                <InfoItem label="견적유효기간">{quotation.validTerm || '-'}</InfoItem>
                <InfoItem label="화폐단위">{quotation.currencyCode || '-'}</InfoItem>
              </InfoGroup>
              <InfoGroup title="금액 및 비고">
                <InfoItem label="공급가액">{formatAmount(quotation.supplyAmt, supplyRule)}</InfoItem>
                <InfoItem label="부가세">{formatAmount(quotation.vatAmt, vatRule)}</InfoItem>
                <InfoItem label="비고" wide>{quotation.remark || '-'}</InfoItem>
              </InfoGroup>
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700 }}>견적 품목</Typography>
                <Typography variant="caption" color="text.secondary">
                  {quotation.details.length}건
                </Typography>
              </Stack>
              <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
                <Table size="small" aria-label="견적 품목 목록" sx={{
                  minWidth: 620,
                  '& .MuiTableCell-head': { bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700, whiteSpace: 'nowrap' },
                  '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': { borderBottom: 0 },
                }}>
                  <TableHead><TableRow>
                    <TableCell align="center">행</TableCell><TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell><TableCell>규격</TableCell>
                    <TableCell align="right">수량</TableCell><TableCell align="right">단가</TableCell>
                    <TableCell align="right">금액</TableCell><TableCell>단위</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {quotation.details.length ? quotation.details.map((detail) => (
                      <TableRow key={detail.quotationDetailId} sx={{ '&:nth-of-type(even)': { bgcolor: 'action.hover' } }}>
                        <TableCell align="center">{detail.lineNo}</TableCell>
                        <TableCell>{detail.materialCode || '-'}</TableCell>
                        <TableCell sx={{ minWidth: 140, overflowWrap: 'anywhere' }}>{detail.materialName}</TableCell>
                        <TableCell>{detail.materialSpec || '-'}</TableCell>
                        <TableCell align="right">{formatAmount(detail.quotationQty, quantityRule)}</TableCell>
                        <TableCell align="right">{formatAmount(detail.unitPrice, priceRule)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatAmount(detail.lineAmt, lineRule)}</TableCell>
                        <TableCell>{detail.unit || '-'}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        등록된 견적 품목이 없습니다.
                      </TableCell></TableRow>
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
