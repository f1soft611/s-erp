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
import type { MaterialInspectionItem } from '../../create/types/materialInspection.types';
import { materialInspectionStatusLabel } from '../services/materialInspectionStatus.service';

type Props = {
  item: MaterialInspectionItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  /** 연결된 정상 가입고의 상세를 연다. */
  onOpenArrival?: (materialArrivalId: number) => void;
};

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
      <IconButton aria-label="검사 더보기" size="small" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { setAnchor(null); onView(); }}>자세히보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { setAnchor(null); onEdit(); }}>수정</MenuItem> : null}
      </Menu>
    </>
  );
}

export function MaterialInspectionStatusDetailPanel({
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
  const passQty = details.reduce((sum, detail) => sum + Number(detail.passQty), 0);
  const failQty = details.reduce((sum, detail) => sum + Number(detail.failQty), 0);
  const inspectQty = Math.round((passQty + failQty) * 100) / 100;
  const passRate = inspectQty > 0 ? Math.round((passQty * 1000) / inspectQty) / 10 : null;
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="검사 상세"
        subtitle={item ? `검사번호: ${item.inspectionNo}` : undefined}
        onClose={onClose}
        isLoading={loading && item === null}
        loadingLabel="검사 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {item ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                검사자 {item.inspectorName ?? '-'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  color={status === 'CANCELED' ? 'default' : 'primary'}
                  label={materialInspectionStatusLabel(status)}
                />
                <Divider orientation="vertical" flexItem />
                <ActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>
            <Box
              aria-label="검사 요약"
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
              <InfoItem label="검사일">{item.inspectionDt || '-'}</InfoItem>
              <InfoItem label="검사자">{item.inspectorName || '-'}</InfoItem>
              <InfoItem label="품목 수">{`${details.length}건`}</InfoItem>
              <InfoItem label="합격률">{passRate == null ? '-' : `${formatNumber(passRate)}%`}</InfoItem>
              <InfoItem label="검사량">{formatNumber(inspectQty)}</InfoItem>
              <InfoItem label="합격량">{formatNumber(passQty)}</InfoItem>
              <InfoItem label="불합격량">{formatNumber(failQty)}</InfoItem>
            </Box>
            <InfoItem label="비고">{item.remark || '-'}</InfoItem>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small" aria-label="검사 품목 목록" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">행</TableCell>
                    <TableCell>가입고번호</TableCell>
                    <TableCell>발주번호</TableCell>
                    <TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell>
                    <TableCell align="right">가입고량</TableCell>
                    <TableCell align="right">기검사량</TableCell>
                    <TableCell align="right">합격량</TableCell>
                    <TableCell align="right">불합격량</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.map((detail) => (
                    <TableRow key={detail.materialInspectionDetailId}>
                      <TableCell align="center">{detail.lineNo}</TableCell>
                      <TableCell>
                        {onOpenArrival && detail.arrivalLinked && detail.materialArrivalId != null ? (
                          <Link
                            component="button"
                            type="button"
                            underline="hover"
                            aria-label={`${detail.arrivalNo} 가입고 보기`}
                            onClick={() => onOpenArrival(detail.materialArrivalId as number)}
                            sx={{ fontSize: 'inherit', verticalAlign: 'baseline' }}
                          >
                            {detail.arrivalNo}
                          </Link>
                        ) : (detail.arrivalNo ?? '-')}
                      </TableCell>
                      <TableCell>{detail.orderNo ?? '-'}</TableCell>
                      <TableCell>{detail.materialCode ?? '-'}</TableCell>
                      <TableCell>{detail.materialName ?? '-'}</TableCell>
                      <TableCell align="right">{formatNumber(detail.arrivalQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.otherInspectedQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.passQty)}</TableCell>
                      <TableCell align="right">{formatNumber(detail.failQty)}</TableCell>
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
