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
import { purchaseRequestStatusLabel } from '../../create/services/purchaseRequest.service';
import type { PurchaseRequestItem } from '../../create/types/purchaseRequest.types';

type Props = {
  item: PurchaseRequestItem | null;
  loading: boolean;
  error: string;
  canEdit: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
};

function formatQty(value: number | null | undefined) {
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
      <IconButton aria-label="구매요청 더보기" size="small" onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onView();
          }}
        >
          자세히보기
        </MenuItem>
        {canEdit ? (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onEdit();
            }}
          >
            수정
          </MenuItem>
        ) : null}
      </Menu>
    </>
  );
}

export function PurchaseRequestStatusDetailPanel({ item, loading, error, canEdit, onClose, onView, onEdit }: Props) {
  return (
    <PageAreaOverlay onClose={onClose}>
      <PostDetailPanel
        title="구매요청 상세"
        subtitle={item ? `구매요청번호: ${item.requestNo}` : undefined}
        onClose={onClose}
        isLoading={loading && item === null}
        loadingLabel="구매요청 상세를 불러오는 중입니다."
      >
        {error ? <Alert severity="error">{error}</Alert> : null}
        {item ? (
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                작성 {item.createdByName ?? '-'} · {item.createdAt ?? '-'}
                {item.updatedAt ? ` / 수정 ${item.updatedByName ?? '-'} · ${item.updatedAt}` : ''}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Chip
                  size="small"
                  color={item.status === 'CONFIRMED' ? 'success' : item.status === 'PARTIALLY_CONFIRMED' ? 'warning' : 'primary'}
                  label={purchaseRequestStatusLabel(item.status)}
                />
                <Divider orientation="vertical" flexItem />
                <ActionsMenu canEdit={canEdit} onView={onView} onEdit={onEdit} />
              </Stack>
            </Stack>
            <Box
              aria-label="구매요청 요약"
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
              <InfoItem label="요청일">{item.requestDt || '-'}</InfoItem>
              <InfoItem label="요청자">{item.requesterName || '-'}</InfoItem>
              <InfoItem label="요청부서">{item.requestDeptName || '-'}</InfoItem>
              <InfoItem label="품목 수">{`${item.details.length}건`}</InfoItem>
            </Box>
            <InfoItem label="비고">{item.remark || '-'}</InfoItem>
            <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflowX: 'auto' }}>
              <Table size="small" aria-label="구매요청 품목 목록" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center">순번</TableCell>
                    <TableCell>품목코드</TableCell>
                    <TableCell>품목명</TableCell>
                    <TableCell align="right">요청수량</TableCell>
                    <TableCell align="center">요청납기일</TableCell>
                    <TableCell align="center">사용용도</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.details.map((detail) => (
                    <TableRow key={detail.purchaseRequestDetailId}>
                      <TableCell align="center">{detail.lineNo}</TableCell>
                      <TableCell>{detail.materialCode ?? '-'}</TableCell>
                      <TableCell>{detail.materialName ?? '-'}</TableCell>
                      <TableCell align="right">{formatQty(detail.requestQty)}</TableCell>
                      <TableCell align="center">{detail.requestDeliveryDt || '-'}</TableCell>
                      <TableCell align="center">{detail.useTypeName ?? detail.useType}</TableCell>
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
