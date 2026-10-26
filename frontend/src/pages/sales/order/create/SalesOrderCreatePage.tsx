import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import {
  MaterialPickerDialog,
  CustomerPicker,
} from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { sumSalesOrderAmounts } from './data/salesOrderAmounts';
import {
  SalesOrderDetailGrid,
} from './components/SalesOrderDetailGrid';
import type { SalesOrderDetailRow } from './data/salesOrderDetail';
import {
  searchOrderCustomers,
  searchOrderMaterials,
} from './services/salesOrderMaster.service';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
};

function getLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function SalesOrderCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
}: Props) {
  const gridRef = useRef<F1GridRef<SalesOrderDetailRow>>(null);
  const materialApplyPatchRef = useRef<
    ((changes: Partial<SalesOrderDetailRow>) => void) | null
  >(null);
  const [customer, setCustomer] = useState<MasterPickerOption | null>(null);
  const [orderDate, setOrderDate] = useState(() =>
    getLocalDateInputValue(new Date()),
  );
  const [quotationNumber, setQuotationNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [remark, setRemark] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [amounts, setAmounts] = useState({
    supplyAmount: 0,
    vatAmount: 0,
    totalAmount: 0,
  });
  const [error, setError] = useState('');

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<SalesOrderDetailRow>) => {
      setAmounts(
        sumSalesOrderAmounts([
          ...changes.insertedRows,
          ...changes.updatedRows,
        ]),
      );
    },
    [],
  );

  const openMaterialPicker = useCallback(
    (applyPatch: (changes: Partial<SalesOrderDetailRow>) => void) => {
      materialApplyPatchRef.current = applyPatch;
      setPickerOpen(true);
    },
    [],
  );

  const closeMaterialPicker = useCallback(() => {
    materialApplyPatchRef.current = null;
    setPickerOpen(false);
  }, []);

  const selectMaterial = useCallback((option: MasterPickerOption) => {
    materialApplyPatchRef.current?.({
      materialId: option.id,
      materialCode: option.code,
      materialName: option.name,
    });
    closeMaterialPicker();
  }, [closeMaterialPicker]);

  const actions = useMemo<PermissionActionGroupDefinition[]>(
    () => [
      {
        key: 'write',
        actions: [
          {
            label: '상세 행 추가',
            icon: AddIcon,
            onClick: () => gridRef.current?.addRow(),
          },
          {
            label: '선택 행 삭제',
            icon: DeleteOutlineIcon,
            disabled: selectedRowIds.length === 0,
            onClick: () => gridRef.current?.deleteSelectedRows(),
          },
          {
            label: '저장',
            icon: SaveIcon,
            disabled: true,
          },
        ],
      },
    ],
    [selectedRowIds.length],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems.length
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={actions}
      />
      <Box
        role="region"
        aria-label="수주 입력 내용"
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          p: { xs: 1.5, sm: 2, lg: 3 },
        }}
      >
        <Alert severity="info">
          저장 API는 아직 연결되지 않았습니다. 입력한 내용은 현재 화면에서만
          유지됩니다.
        </Alert>
        <PageMessageArea
          message={error}
          onClose={() => setError('')}
          severity="error"
        />
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 2 }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            수주 기본정보
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              label="수주번호"
              size="small"
              value="저장 연동 단계에서 채번 기준 확정"
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="수주일자"
              type="date"
              size="small"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <CustomerPicker
              value={customer}
              search={searchOrderCustomers}
              onChange={setCustomer}
            />
            <TextField
              label="견적번호"
              size="small"
              value={quotationNumber}
              onChange={(event) => setQuotationNumber(event.target.value)}
            />
            <TextField
              label="납기일자"
              type="date"
              size="small"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="납품장소"
              size="small"
              value={deliveryPlace}
              onChange={(event) => setDeliveryPlace(event.target.value)}
            />
            <TextField
              label="배송방법"
              size="small"
              value={deliveryMethod}
              onChange={(event) => setDeliveryMethod(event.target.value)}
            />
            <TextField
              label="수주상태"
              size="small"
              value="수주등록"
              slotProps={{ input: { readOnly: true } }}
            />
            <TextField
              label="비고"
              size="small"
              multiline
              minRows={2}
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
              sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }}
            />
          </Box>
        </Paper>
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            minHeight: 320,
            minWidth: 0,
            overflow: 'hidden',
            borderRadius: 2,
          }}
        >
          <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              수주 상세
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 260, minWidth: 0, px: 1 }}>
            <SalesOrderDetailGrid
              gridRef={gridRef}
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              onOpenMaterialPicker={openMaterialPicker}
            />
          </Box>
          <Box
            aria-label="수주 금액 합계"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 1,
              p: { xs: 1.5, sm: 2 },
            }}
          >
            <AmountSummary label="공급가 합계" amount={amounts.supplyAmount} />
            <AmountSummary label="부가세 합계" amount={amounts.vatAmount} />
            <AmountSummary label="총 합계" amount={amounts.totalAmount} />
          </Box>
        </Paper>
      </Box>
      <MaterialPickerDialog
        open={pickerOpen}
        search={searchOrderMaterials}
        onClose={closeMaterialPicker}
        onChange={selectMaterial}
      />
    </Box>
  );
}

function AmountSummary({ label, amount }: { label: string; amount: number }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.5,
        py: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
      >
        {amount.toLocaleString('ko-KR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Box>
  );
}
