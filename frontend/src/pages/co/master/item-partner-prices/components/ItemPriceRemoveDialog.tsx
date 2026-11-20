import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import type { ItemPriceRemoveMode } from '../services/itemPriceOverviewChanges';
import type { ItemPriceOverviewRow, ItemPriceSideKey } from '../types/itemPriceOverview.types';

type Props = {
  row: ItemPriceOverviewRow | null;
  onClose: () => void;
  onConfirm: (sides: ItemPriceSideKey[], mode: ItemPriceRemoveMode) => void;
};

const SIDES: { side: ItemPriceSideKey; label: string }[] = [
  { side: 'purchase', label: '매입' },
  { side: 'sales', label: '매출' },
];

function sideInfo(row: ItemPriceOverviewRow, side: ItemPriceSideKey) {
  const record = row as unknown as Record<string, unknown>;
  const priceId = record[`${side}PriceId`] as number | null;
  const unit = record[`${side}UnitPrice`] as number | null;
  const foreign = record[`${side}ForeignUnitPrice`] as number | null;
  const currency = record[`${side}Currency`] as string;
  const start = record[`${side}StartDt`] as string;
  const status = record[`${side}Status`] as string;
  if (priceId === null) return { available: false, text: '등록된 단가 없음' };
  const price = [
    unit === null ? null : `원화 ${unit.toLocaleString('ko-KR')}`,
    foreign === null ? null : `${currency} ${foreign.toLocaleString('ko-KR')}`,
  ].filter(Boolean).join(' / ');
  return { available: true, text: `${price} · 적용일 ${start} (${status === 'future' ? '예정' : '적용 중'})` };
}

/** 선택한 품목·거래처 행의 단가를 삭제(오등록 정정) 또는 미사용 처리하는 확인 창. */
export function ItemPriceRemoveDialog({ row, onClose, onConfirm }: Props) {
  if (!row) return null;
  return <OpenItemPriceRemoveDialog row={row} onClose={onClose} onConfirm={onConfirm} />;
}

function OpenItemPriceRemoveDialog({ row, onClose, onConfirm }: Omit<Props, 'row'> & { row: ItemPriceOverviewRow }) {
  const initial = SIDES.filter(({ side }) => sideInfo(row, side).available).map(({ side }) => side);
  const [sides, setSides] = useState<ItemPriceSideKey[]>(initial);
  const [mode, setMode] = useState<ItemPriceRemoveMode>('delete');
  const toggle = (side: ItemPriceSideKey) => setSides((current) =>
    current.includes(side) ? current.filter((item) => item !== side) : [...current, side]);
  const target = row.parentId === null
    ? `${row.displayName} 공통단가`
    : `${row.materialCode} · ${row.materialName} / ${row.customerName} 특별단가`;

  return (
    <CommonDialog
      open
      onClose={onClose}
      title="단가 삭제"
      description={target}
      size="xs"
      actions={
        <>
          <Button
            variant="contained"
            color={mode === 'delete' ? 'error' : 'primary'}
            disabled={sides.length === 0}
            onClick={() => onConfirm(sides, mode)}
          >
            {mode === 'delete' ? '삭제' : '미사용 처리'}
          </Button>
          <Button onClick={onClose}>취소</Button>
        </>
      }
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <FormGroup aria-label="삭제할 구분">
          {SIDES.map(({ side, label }) => {
            const info = sideInfo(row, side);
            return (
              <FormControlLabel
                key={side}
                disabled={!info.available}
                control={<Checkbox checked={sides.includes(side)} onChange={() => toggle(side)} />}
                label={`${label}: ${info.text}`}
              />
            );
          })}
        </FormGroup>
        <RadioGroup
          aria-label="처리 방식"
          value={mode}
          onChange={(event) => setMode(event.target.value as ItemPriceRemoveMode)}
        >
          <FormControlLabel value="delete" control={<Radio />} label="삭제 (잘못 등록한 단가 정정)" />
          <FormControlLabel value="deactivate" control={<Radio />} label="미사용 처리 (이력은 남김)" />
        </RadioGroup>
        <Typography variant="body2" color="text.secondary">
          {mode === 'delete'
            ? '잘못 등록한 단가를 지웁니다. 되돌릴 수 없고, 직전 단가의 종료일은 다시 열립니다. 종료된 과거 단가는 지울 수 없습니다.'
            : '더 이상 쓰지 않는 단가로 표시합니다. 조회 목록에서는 빠지고 기록은 남습니다.'}
        </Typography>
      </Box>
    </CommonDialog>
  );
}
