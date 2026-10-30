import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
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
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import {
  MaterialPickerDialog,
  CustomerPicker,
} from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { sumSalesOrderAmounts } from './data/salesOrderAmounts';
import {
  SalesOrderDetailGrid,
} from './components/SalesOrderDetailGrid';
import {
  resolveActiveSalesOrderRows,
  type SalesOrderDetailRow,
} from './data/salesOrderDetail';
import {
  searchOrderCustomers,
  searchOrderMaterials,
} from './services/salesOrderMaster.service';
import {
  buildSalesOrderCreatePayload,
  createSalesOrder,
  deleteSalesOrder,
  getSalesOrder,
  toSalesOrderForm,
  updateSalesOrder,
  validateSalesOrderInput,
} from './services/salesOrder.service';
import type {
  SalesOrderHeaderValues,
  SalesOrderItem,
  SalesOrderValidationErrors,
} from './types/salesOrder.types';

export type SalesOrderPageMode = 'create' | 'edit' | 'view';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'/'create'는 권한·상태에 따라 편집 */
  mode?: SalesOrderPageMode;
  /** 지정 시 마운트 후 해당 수주를 불러와 상·하단을 세팅 */
  salesOrderId?: number;
  /** 다이얼로그 등 다른 화면 안에서 재사용할 때 페이지 헤더·신규 버튼·라우트 이탈 가드를 숨김 */
  embedded?: boolean;
  onSaved?: (order: SalesOrderItem) => void;
  onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** embedded 모드에서 저장·삭제 버튼을 상위(모달 하단 등)에 배치할 수 있도록 액션 상태를 전달 */
  onEmbeddedActionsChange?: (state: SalesOrderEmbeddedActionState | null) => void;
};

export type SalesOrderEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canDelete: boolean;
  deleteDisabled: boolean;
  saving: boolean;
  save: () => void;
  remove: () => void;
};

type HeaderSnapshot = SalesOrderHeaderValues & { customerId: number | null };

const EDITABLE_ORDER_STATUS = '수주등록';
const EMPTY_AMOUNTS = { supplyAmount: 0, vatAmount: 0, totalAmount: 0 };

function getLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyHeader(): SalesOrderHeaderValues {
  return {
    orderDt: getLocalDateInputValue(new Date()),
    quotNo: '',
    deliveryDt: '',
    deliveryPlace: '',
    deliveryMethod: '',
    remark: '',
  };
}

function createEmptySnapshot(): HeaderSnapshot {
  return { ...createEmptyHeader(), customerId: null };
}

export function SalesOrderCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  salesOrderId,
  embedded = false,
  onSaved,
  onDeleted,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const isReadOnly = mode === 'view';
  const gridRef = useRef<F1GridRef<SalesOrderDetailRow>>(null);
  const savingRef = useRef(false);
  const selectedMaterialRowIdRef = useRef<string | null>(null);
  const materialApplyPatchRef = useRef<
    ((changes: Partial<SalesOrderDetailRow>) => void) | null
  >(null);
  const [initialSnapshot] = useState<HeaderSnapshot>(createEmptySnapshot);
  const [baseline, setBaseline] = useState<HeaderSnapshot>(initialSnapshot);
  const [customer, setCustomer] = useState<MasterPickerOption | null>(null);
  const [orderDate, setOrderDate] = useState(initialSnapshot.orderDt);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [remark, setRemark] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [amounts, setAmounts] = useState(EMPTY_AMOUNTS);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedOrder, setLoadedOrder] = useState<SalesOrderItem | null>(null);
  const [gridRows, setGridRows] = useState<SalesOrderDetailRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [hasDetailChanges, setHasDetailChanges] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<SalesOrderValidationErrors | null>(null);
  const [error, setError] = useState('');
  const [isLoadingOrder, setIsLoadingOrder] = useState(salesOrderId != null);
  const gridValidationActiveRef = useRef(false);

  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const canWrite = canCreate || canUpdate;
  const isOrderEditableState =
    loadedOrder === null ||
    (loadedOrder.status === EDITABLE_ORDER_STATUS &&
      loadedOrder.details.every(
        (detail) => Number(detail.shippedQty ?? 0) <= 0,
      ));
  const hasPermissionForMode = loadedOrder ? canUpdate : canCreate;
  const isEditable =
    !isReadOnly &&
    !isLoadingOrder &&
    !isSaving &&
    !isLocked &&
    isOrderEditableState &&
    hasPermissionForMode;
  const isDeletable =
    !isReadOnly &&
    loadedOrder !== null &&
    !isSaving &&
    !isLocked &&
    isOrderEditableState;

  const hasHeaderChanges =
    (customer?.id ?? null) !== baseline.customerId ||
    orderDate !== baseline.orderDt ||
    quotationNumber.trim() !== baseline.quotNo.trim() ||
    deliveryDate !== baseline.deliveryDt ||
    deliveryPlace.trim() !== baseline.deliveryPlace.trim() ||
    deliveryMethod.trim() !== baseline.deliveryMethod.trim() ||
    remark.trim() !== baseline.remark.trim();
  const hasUnsavedChanges =
    !isLocked && (hasHeaderChanges || hasDetailChanges);
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors(null);
  }, []);

  const applyForm = useCallback(
    (
      nextCustomer: MasterPickerOption | null,
      header: SalesOrderHeaderValues,
      rows: SalesOrderDetailRow[],
    ) => {
      setCustomer(nextCustomer);
      setOrderDate(header.orderDt);
      setQuotationNumber(header.quotNo);
      setDeliveryDate(header.deliveryDt);
      setDeliveryPlace(header.deliveryPlace);
      setDeliveryMethod(header.deliveryMethod);
      setRemark(header.remark);
      setBaseline({ ...header, customerId: nextCustomer?.id ?? null });
      setGridRows(rows);
      setGridKey((key) => key + 1);
      setAmounts(rows.length > 0 ? sumSalesOrderAmounts(rows) : EMPTY_AMOUNTS);
      setHasDetailChanges(false);
      setSelectedRowIds([]);
      setValidationErrors(null);
      gridValidationActiveRef.current = false;
      selectedMaterialRowIdRef.current = null;
      materialApplyPatchRef.current = null;
      setPickerOpen(false);
    },
    [],
  );

  const applyLoadedOrder = useCallback(
    (order: SalesOrderItem) => {
      const form = toSalesOrderForm(order);
      setLoadedOrder(order);
      setIsLocked(false);
      applyForm(form.customer, form.header, form.rows);
    },
    [applyForm],
  );

  const resetToNewOrder = useCallback(() => {
    setLoadedOrder(null);
    setIsLocked(false);
    setError('');
    applyForm(null, createEmptyHeader(), []);
  }, [applyForm]);

  useEffect(() => {
    if (salesOrderId == null) return;
    let active = true;
    setIsLoadingOrder(true);
    getSalesOrder(salesOrderId)
      .then((order) => {
        if (active) applyLoadedOrder(order);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setIsLocked(true);
        setError(
          loadError instanceof Error
            ? loadError.message
            : '수주를 불러오지 못했습니다.',
        );
      })
      .finally(() => {
        if (active) setIsLoadingOrder(false);
      });
    return () => {
      active = false;
    };
  }, [applyLoadedOrder, salesOrderId]);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<SalesOrderDetailRow>) => {
      setAmounts(
        sumSalesOrderAmounts(resolveActiveSalesOrderRows(gridRows, changes)),
      );
      setHasDetailChanges(
        changes.insertedRows.length > 0 ||
          changes.updatedRows.length > 0 ||
          changes.deletedRows.length > 0,
      );
      clearValidationErrors();
      if (gridValidationActiveRef.current) {
        gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
      }
    },
    [clearValidationErrors, gridRows],
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
    if (savingRef.current || !isEditable) {
      return;
    }
    if (loadedOrder && !hasUnsavedChanges) {
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
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    const validationMessages = [
      errors.orderDt,
      errors.customerId,
      errors.details,
      ...errors.detailMessages,
    ].filter((message): message is string => Boolean(message));

    setValidationErrors(validationMessages.length > 0 ? errors : null);
    setError('');
    if (validationMessages.length > 0 || !isGridValid) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setNotice('');
    const payload = buildSalesOrderCreatePayload(input);
    try {
      if (loadedOrder) {
        const updated = await updateSalesOrder(
          loadedOrder.salesOrderId,
          payload,
        );
        applyLoadedOrder(updated);
        setNotice(`수주가 수정되었습니다. 수주번호: ${updated.orderNo}`);
        onSaved?.(updated);
        return;
      }

      const saved = await createSalesOrder(payload);
      try {
        const reloaded = await getSalesOrder(saved.salesOrderId);
        applyLoadedOrder(reloaded);
        setNotice(`수주가 저장되었습니다. 수주번호: ${reloaded.orderNo}`);
        onSaved?.(reloaded);
      } catch {
        setIsLocked(true);
        setError(
          `수주는 저장되었지만 다시 불러오지 못했습니다. 수주번호: ${saved.orderNo}`,
        );
      }
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
    applyLoadedOrder,
    customer,
    deliveryDate,
    deliveryMethod,
    deliveryPlace,
    hasUnsavedChanges,
    isEditable,
    loadedOrder,
    onSaved,
    orderDate,
    quotationNumber,
    remark,
  ]);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDelete = useCallback(() => {
    if (savingRef.current || !loadedOrder || !isDeletable) {
      return;
    }
    setDeleteConfirmOpen(true);
  }, [isDeletable, loadedOrder]);

  const confirmDelete = useCallback(async () => {
    setDeleteConfirmOpen(false);
    if (savingRef.current || !loadedOrder || !isDeletable) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setNotice('');
    setError('');
    try {
      await deleteSalesOrder(loadedOrder.salesOrderId);
      resetToNewOrder();
      setNotice(`수주가 삭제되었습니다. 수주번호: ${loadedOrder.orderNo}`);
      onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : '수주 삭제 중 오류가 발생했습니다.',
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [isDeletable, loadedOrder, onDeleted, resetToNewOrder]);

  const handleNew = useCallback(() => {
    if (savingRef.current) {
      return;
    }
    if (
      hasUnsavedChanges &&
      !window.confirm(
        '저장되지 않은 수주 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
      )
    ) {
      return;
    }
    resetToNewOrder();
    setNotice('');
  }, [hasUnsavedChanges, resetToNewOrder]);

  const actions = useMemo<PermissionActionGroupDefinition[]>(
    () => [
      {
        key: 'write',
        actions: [
          {
            label: '신규',
            icon: NoteAddOutlinedIcon,
            visible: canWrite && !embedded && !isReadOnly,
            disabled: isSaving,
            onClick: handleNew,
          },
          {
            label: '저장',
            icon: SaveIcon,
            saving: isSaving,
            visible: canWrite && !isReadOnly,
            disabled:
              !isEditable || (loadedOrder !== null && !hasUnsavedChanges),
            onClick: handleSave,
          },
        ],
      },
      {
        key: 'delete',
        actions: [
          {
            label: '삭제',
            icon: DeleteForeverOutlinedIcon,
            visible: canDelete && !isReadOnly,
            disabled: !isDeletable,
            onClick: handleDelete,
          },
        ],
      },
    ],
    [
      canDelete,
      canWrite,
      embedded,
      handleDelete,
      handleNew,
      handleSave,
      hasUnsavedChanges,
      isDeletable,
      isEditable,
      isReadOnly,
      isSaving,
      loadedOrder,
    ],
  );

  const canSaveEmbedded = canWrite && !isReadOnly;
  const saveDisabled = isSaving || !isEditable || (loadedOrder !== null && !hasUnsavedChanges);
  const canDeleteEmbedded = canDelete && !isReadOnly;
  const deleteDisabled = isSaving || !isDeletable;

  useEffect(() => {
    if (!embedded || !onEmbeddedActionsChange) {
      return;
    }
    onEmbeddedActionsChange({
      canSave: canSaveEmbedded,
      saveDisabled,
      canDelete: canDeleteEmbedded,
      deleteDisabled,
      saving: isSaving,
      save: () => void handleSave(),
      remove: handleDelete,
    });
  }, [
    canDeleteEmbedded,
    canSaveEmbedded,
    deleteDisabled,
    embedded,
    handleDelete,
    handleSave,
    isSaving,
    onEmbeddedActionsChange,
    saveDisabled,
  ]);

  useEffect(
    () => () => {
      onEmbeddedActionsChange?.(null);
    },
    [onEmbeddedActionsChange],
  );

  const validationMessages = validationErrors
    ? [
        validationErrors.details,
        ...validationErrors.detailMessages,
      ].filter((message): message is string => Boolean(message))
    : [];

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
      {embedded ? null : (
        <PageHeader
          breadcrumbItems={
            breadcrumbItems.length
              ? breadcrumbItems
              : [selectedModule.name, currentMenuName]
          }
          description={content.description}
          actionGroups={actions}
        />
      )}
      <Box
        role="region"
        aria-label="수주 입력 내용"
        aria-busy={isSaving || isLoadingOrder}
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          p: embedded ? 0 : { xs: 1.5, sm: 2, lg: 3 },
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
        {notice && <Alert severity="success">{notice}</Alert>}
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
              value={loadedOrder?.orderNo ?? '저장 시 자동 채번'}
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
              required
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
              triggerMode="icon"
              onChange={(value) => {
                setCustomer(value);
                clearValidationErrors();
              }}
              disabled={!isEditable}
              required
              error={Boolean(validationErrors?.customerId)}
              helperText={validationErrors?.customerId}
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
              value={loadedOrder?.status ?? EDITABLE_ORDER_STATUS}
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
                {isReadOnly
                  ? '수주 품목 내역입니다.'
                  : '행을 추가해 품목을 선택하세요. 마우스 오른쪽 버튼으로 행 복사·삭제를 할 수 있습니다.'}
              </Typography>
            </Box>
            {isReadOnly ? null : (
            <Box
              data-testid="sales-order-detail-toolbar"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {canWrite ? (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon fontSize="small" />}
                  disabled={!isEditable}
                  onClick={() => gridRef.current?.addRow()}
                >
                  상세 행 추가
                </Button>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<SearchOutlinedIcon fontSize="small" />}
                disabled={selectedRowIds.length !== 1 || !isEditable}
                onClick={openSelectedMaterialPicker}
              >
                품목 선택
              </Button>
            </Box>
            )}
          </Box>
          <Box sx={{ flex: 1, minHeight: 260, minWidth: 0, px: 1 }}>
            <SalesOrderDetailGrid
              key={gridKey}
              gridRef={gridRef}
              rows={gridRows}
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
      {embedded ? null : (
        <SalesOrderRouteLeaveGuard when={hasUnsavedChanges} />
      )}
      <UnsavedChangesConfirmDialog
        open={deleteConfirmOpen}
        title="수주 삭제"
        dialogTitleId="sales-order-delete-dialog-title"
        description={`수주번호 ${loadedOrder?.orderNo ?? ''} 을(를) 삭제하시겠습니까? 삭제한 수주는 되돌릴 수 없습니다.`}
        continueLabel="삭제"
        cancelLabel="취소"
        confirmButtonColor="error"
        onCancel={() => setDeleteConfirmOpen(false)}
        onContinue={() => void confirmDelete()}
      />
    </Box>
  );
}

function SalesOrderRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장되지 않은 수주 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
      cancelLabel="계속 작성"
      continueLabel="변경사항 버리고 이동"
      onCancel={() => {
        if (blocker.state === 'blocked') blocker.reset();
      }}
      onContinue={() => {
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
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
