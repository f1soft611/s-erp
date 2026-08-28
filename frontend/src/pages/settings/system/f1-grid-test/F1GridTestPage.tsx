import { Box, Button, Typography } from '@mui/material';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  F1Grid,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../shared/components/f1-grid';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';

type ItemRow = {
  id: string;
  itemCode: string;
  itemName: string;
  qty: number;
  price: number;
  ratio: number;
  deliveryAt: string;
  workTime: string;
  status: string;
};

type F1GridTestPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
};

const rows: ItemRow[] = [
  {
    id: 'line-1',
    itemCode: 'ITEM-001',
    itemName: '기본 품목',
    qty: 1,
    price: 12000,
    ratio: 1.5,
    deliveryAt: '2026-08-28T09:30',
    workTime: '09:30',
    status: 'ready',
  },
];

export function F1GridTestPage({
  selectedModule,
  currentMenuName,
  content,
}: F1GridTestPageProps) {
  const gridRef = useRef<F1GridRef<ItemRow>>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [sequence, setSequence] = useState(2);
  const [pickerOpen, setPickerOpen] = useState(false);
  const applyPickerPatchRef = useRef<
    ((changes: Partial<ItemRow>) => void) | undefined
  >(undefined);

  function createSampleRow(): ItemRow {
    const id = `line-${sequence}`;
    setSequence((current) => current + 1);
    return { ...rows[0], id, itemCode: '', itemName: '', qty: 0 };
  }

  function createSampleDuplicate(row: ItemRow): ItemRow {
    const id = `line-${sequence}`;
    setSequence((current) => current + 1);
    return { ...row, id };
  }
  const columns: F1GridColumn<ItemRow>[] = [
    {
      field: 'itemCode',
      headerName: '품목코드',
      type: 'code',
      editable: true,
      required: true,
      onOpenCodePicker: (_row, applyPatch) => {
        applyPickerPatchRef.current = applyPatch;
        setPickerOpen(true);
      },
    },
    { field: 'itemName', headerName: '품목명', editable: true, required: true },
    {
      field: 'qty',
      headerName: '수량',
      type: 'number',
      editable: true,
      min: 1,
    },
    { field: 'price', headerName: '단가', type: 'currency', editable: true },
    { field: 'ratio', headerName: '공급비율', type: 'decimal', editable: true },
    {
      field: 'deliveryAt',
      headerName: '납기 일시',
      type: 'datetime',
      editable: true,
    },
    {
      field: 'workTime',
      headerName: '작업 시각',
      type: 'time',
      editable: true,
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'autocomplete',
      editable: true,
      options: [
        { value: 'ready', label: '준비' },
        { value: 'done', label: '완료' },
      ],
    },
  ];

  return (
    <Box sx={{ flex: 1, p: 3 }}>
      <Typography variant="overline" color="text.secondary">
        {selectedModule.name} / {currentMenuName}
      </Typography>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 800, mb: 1 }}>
        {content.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {content.description}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={() =>
            setValidationMessage(
              gridRef.current?.validate()
                ? '검증 성공'
                : '검증 오류가 있습니다.',
            )
          }
        >
          검증 실행
        </Button>
      </Box>
      <F1Grid
        ref={gridRef}
        rows={rows}
        columns={columns}
        rowKey="id"
        ariaLabel="F1-GRID 기능 테스트"
        createRow={createSampleRow}
        createDuplicate={createSampleDuplicate}
      />
      {validationMessage && (
        <Typography sx={{ mt: 1 }} role="status">
          {validationMessage}
        </Typography>
      )}
      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <DialogTitle>품목 선택</DialogTitle>
        <DialogContent>ITEM-002 테스트 품목</DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>취소</Button>
          <Button
            onClick={() => {
              applyPickerPatchRef.current?.({
                itemCode: 'ITEM-002',
                itemName: '테스트 품목',
              });
              setPickerOpen(false);
            }}
          >
            ITEM-002 테스트 품목 선택
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
