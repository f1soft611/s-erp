import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert,
  Box,
  Button,
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
import {
  buildSalesOrderCreatePayload,
  createSalesOrder,
  validateSalesOrderInput,
} from './services/salesOrder.service';
import type {
  SalesOrderCreated,
  SalesOrderValidationErrors,
} from './types/salesOrder.types';

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
  const savingRef = useRef(false);
  const selectedMaterialRowIdRef = useRef<string | null>(null);
  const materialApplyPatchRef = useRef<
    ((changes: Partial<SalesOrderDetailRow>) => void) | null
  >(null);
  const [customer, setCustomer] = useState<MasterPickerOption | null>(null);
  const [initialOrderDate] = useState(() =>
    getLocalDateInputValue(new Date()),
  );
  const [orderDate, setOrderDate] = useState(initialOrderDate);
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
  const [isSaving, setIsSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<SalesOrderCreated | null>(null);
  const [hasDetailChanges, setHasDetailChanges] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<SalesOrderValidationErrors | null>(null);
  const [error, setError] = useState('');
  const blockerPromptedRef = useRef(false);
  const hasUnsavedChanges =
    savedOrder === null &&
    (customer !== null ||
      orderDate !== initialOrderDate ||
      quotationNumber.trim() !== '' ||
      deliveryDate !== '' ||
      deliveryPlace.trim() !== '' ||
      deliveryMethod.trim() !== '' ||
      remark.trim() !== '' ||
      hasDetailChanges);
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      blockerPromptedRef.current = false;
      return;
    }
    if (blockerPromptedRef.current) {
      return;
    }

    blockerPromptedRef.current = true;
    const shouldLeave = window.confirm(
      '저장되지 않은 수주 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?',
    );
    if (shouldLeave) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors(null);
  }, []);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<SalesOrderDetailRow>) => {
      setAmounts(
        sumSalesOrderAmounts([
          ...changes.insertedRows,
          ...changes.updatedRows,
        ]),
      );
      setHasDetailChanges(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
      clearValidationErrors();
    },
    [clearValidationErrors],
  );

  const openMaterialPicker = useCallback(
    (applyPatch: (changes: Partial<SalesOrderDetailRow>) => void) => {
      selectedMaterialRowIdRef.current = null;
      materialApplyPatchRef.current = applyPatch;
      setPickerOpen(true);
    },
    [],
  );

  const closeMaterialPicker = useCallback(() => {
    selectedMaterialRowIdRef.current = null;
    materialApplyPatchRef.current = null;
    setPickerOpen(false);
  }, []);

  const openSelectedMaterialPicker = useCallback(() => {
    const [selectedRow] = gridRef.current?.getSelectedRows() ?? [];
    if (!selectedRow) {
      return;
    }

    selectedMaterialRowIdRef.current = selectedRow.rowId;
    setPickerOpen(true);
  }, []);

  const selectMaterial = useCallback((option: MasterPickerOption) => {
    const selectedRowId = selectedMaterialRowIdRef.current;
    if (selectedRowId !== null) {
      gridRef.current?.setCellValue(selectedRowId, 'materialCode', option);
    } else {
      materialApplyPatchRef.current?.({
        materialId: option.id,
        materialCode: option.code,
        materialName: option.name,
      });
    }
    closeMaterialPicker();
    clearValidationErrors();
  }, [clearValidationErrors, closeMaterialPicker]);

  const handleSave = useCallback(async () => {
    if (savingRef.current || savedOrder) {
      return;
    }

    const input = {
      orderDt: orderDate,
      customerId: customer?.id ?? null,
      quotNo: quotationNumber,
      deliveryDt: deliveryDate,
      deliveryPlace,
      deliveryMethod,
      remark,
      details: gridRef.current?.getActiveRows() ?? [],
    };
    const errors = validateSalesOrderInput(input);
    const validationMessages = [
      errors.orderDt,
      errors.customerId,
      errors.details,
      ...Object.values(errors.detailRows),
    ].filter((message): message is string => Boolean(message));

    setValidationErrors(validationMessages.length > 0 ? errors : null);
    setError('');
    if (validationMessages.length > 0) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      const saved = await createSalesOrder(
        buildSalesOrderCreatePayload(input),
      );
      setSavedOrder(saved);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : '수주 저장 중 오류가 발생했습니다.',
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    customer,
    deliveryDate,
    deliveryMethod,
    deliveryPlace,
    orderDate,
    quotationNumber,
    remark,
    savedOrder,
  ]);

  const actions = useMemo<PermissionActionGroupDefinition[]>(
    () => [
      {
        key: 'write',
        actions: [
          {
            label: '상세 행 추가',
            icon: AddIcon,
            disabled: isSaving || savedOrder !== null,
            onClick: () => gridRef.current?.addRow(),
          },
          {
            label: '선택 행 삭제',
            icon: DeleteOutlineIcon,
            disabled:
              selectedRowIds.length === 0 || isSaving || savedOrder !== null,
            onClick: () => gridRef.current?.deleteSelectedRows(),
          },
          {
            label: '저장',
            icon: SaveIcon,
            disabled: isSaving || savedOrder !== null,
            onClick: handleSave,
          },
        ],
      },
    ],
    [
      handleSave,
      isSaving,
      savedOrder,
      selectedRowIds.length,
    ],
  );

  const validationMessages = validationErrors
    ? [
        validationErrors.customerId,
        validationErrors.details,
        ...Object.values(validationErrors.detailRows),
      ].filter((message): message is string => Boolean(message))
    : [];
  const isEditable = !isSaving && savedOrder === null;

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
        aria-busy={isSaving}
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
        {validationMessages.length > 0 && (
          <Alert severity="error">
            <Box component="ul" sx={{ my: 0, pl: 2 }}>
              {validationMessages.map((message, index) => (
                <li key={`${index}-${message}`}>{message}</li>
              ))}
            </Box>
          </Alert>
        )}
        {savedOrder && (
          <Alert severity="success">
            수주가 저장되었습니다. 수주번호: {savedOrder.orderNo}
          </Alert>
        )}
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
              columnGap: 2,
              rowGap: 1,
              '& > .MuiFormControl-root': { m: 0 },
              '& > .MuiStack-root': { mt: 0 },
            }}
          >
            <TextField
              label="수주번호"
              size="small"
              value="저장 시 자동 채번"
              slotProps={{ input: { readOnly: true } }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                },
              }}
            />
            <TextField
              label="수주일자"
              type="date"
              size="small"
              value={orderDate}
              onChange={(event) => {
                setOrderDate(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
              error={Boolean(validationErrors?.orderDt)}
              helperText={validationErrors?.orderDt}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <CustomerPicker
              value={customer}
              search={searchOrderCustomers}
              onChange={(value) => {
                setCustomer(value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
            />
            <TextField
              label="견적번호"
              size="small"
              value={quotationNumber}
              onChange={(event) => {
                setQuotationNumber(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
            />
            <TextField
              label="납기일자"
              type="date"
              size="small"
              value={deliveryDate}
              onChange={(event) => {
                setDeliveryDate(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="납품장소"
              size="small"
              value={deliveryPlace}
              onChange={(event) => {
                setDeliveryPlace(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
            />
            <TextField
              label="배송방법"
              size="small"
              value={deliveryMethod}
              onChange={(event) => {
                setDeliveryMethod(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
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
              onChange={(event) => {
                setRemark(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 1,
              p: { xs: 1.5, sm: 2 },
              pb: 1,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                수주 상세
              </Typography>
              <Typography variant="caption" color="text.secondary">
                행을 선택한 뒤 품목 선택을 눌러 도움창을 여세요.
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<SearchOutlinedIcon fontSize="small" />}
              disabled={
                selectedRowIds.length !== 1 ||
                isSaving ||
                savedOrder !== null
              }
              onClick={openSelectedMaterialPicker}
            >
              품목 선택
            </Button>
          </Box>
          <Box sx={{ flex: 1, minHeight: 260, minWidth: 0, px: 1 }}>
            <SalesOrderDetailGrid
              gridRef={gridRef}
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              onOpenMaterialPicker={openMaterialPicker}
              disabled={!isEditable}
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
        open={pickerOpen && isEditable}
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
