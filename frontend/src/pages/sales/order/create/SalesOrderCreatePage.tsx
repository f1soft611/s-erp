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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { DateEditor } from '../../../../shared/components/f1-grid/editing/DateEditor';
import { normalizeDateInput } from '../../../../shared/components/f1-grid/editing/dateInput';
import {
  MaterialPickerDialog,
  CustomerPicker,
} from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import { MasterPicker } from '../../../../shared/components/master-picker/MasterPicker';
import { searchSalesDestinations } from '../../master/destination/services/salesDestination.service';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { getSystemDate } from '../../../../shared/services/systemDateService';
import { sumSalesOrderAmounts } from './data/salesOrderAmounts';
import { getSalesOrderCodeLabel } from '../services/salesOrderCommonCode.service';
import { useSalesOrderCommonCodes } from '../hooks/useSalesOrderCommonCodes';
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
  searchOrderQuotations,
  type SalesOrderQuotationOption,
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

type HeaderSnapshot = SalesOrderHeaderValues & {
  customerId: number | null;
  salesDestinationId: number | null;
  billingCustomerId: number | null;
};

const EDITABLE_ORDER_STATUS = '수주등록';
const EMPTY_AMOUNTS = { supplyAmount: 0, vatAmount: 0, totalAmount: 0 };

function createEmptyHeader(orderDt = ''): SalesOrderHeaderValues {
  return {
    orderDt,
    quotNo: '',
    deliveryDt: '',
    deliveryPlace: '',
    deliveryMethod: '',
    remark: '',
  };
}

function createEmptySnapshot(): HeaderSnapshot {
  return { ...createEmptyHeader(), customerId: null, salesDestinationId: null, billingCustomerId: null };
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
  const { confirm, dialog } = useCommonConfirmDialog();
  const {
    codes: commonCodes,
    loading: commonCodesLoading,
    error: commonCodesError,
    retry: retryCommonCodes,
  } = useSalesOrderCommonCodes();
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
  const [destination, setDestination] = useState<MasterPickerOption | null>(null);
  const [billingCustomer, setBillingCustomer] = useState<MasterPickerOption | null>(null);
  const [orderDate, setOrderDate] = useState(initialSnapshot.orderDt);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [selectedQuotationCustomerId, setSelectedQuotationCustomerId] =
    useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [orderDateError, setOrderDateError] = useState('');
  const [deliveryDateError, setDeliveryDateError] = useState('');
  const [deliveryPlace, setDeliveryPlace] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [remark, setRemark] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quotationPickerOpen, setQuotationPickerOpen] = useState(false);
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
  const orderDateTouchedRef = useRef(false);
  const gridValidationActiveRef = useRef(false);
  const missingCommonCodes =
    !commonCodesLoading &&
    !commonCodesError &&
    (!commonCodes.orderStatusOptions.length ||
      !commonCodes.progressStatusOptions.length ||
      !commonCodes.deliveryMethodOptions.length);

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
    (destination?.id ?? null) !== baseline.salesDestinationId ||
    (billingCustomer?.id ?? null) !== baseline.billingCustomerId ||
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
      nextDestination: MasterPickerOption | null = null,
      nextBillingCustomer: MasterPickerOption | null = null,
    ) => {
      setCustomer(nextCustomer);
      setDestination(nextDestination);
      setBillingCustomer(nextBillingCustomer);
      setOrderDate(header.orderDt);
      orderDateTouchedRef.current = true;
      setQuotationNumber(header.quotNo);
      setSelectedQuotationCustomerId(null);
      setDeliveryDate(header.deliveryDt);
      setOrderDateError('');
      setDeliveryDateError('');
      setDeliveryPlace(header.deliveryPlace);
      setDeliveryMethod(header.deliveryMethod);
      setRemark(header.remark);
      setBaseline({ ...header, customerId: nextCustomer?.id ?? null,
        salesDestinationId: nextDestination?.id ?? null,
        billingCustomerId: nextBillingCustomer?.id ?? null });
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
      setQuotationPickerOpen(false);
    },
    [],
  );

  const applyLoadedOrder = useCallback(
    (order: SalesOrderItem) => {
      const form = toSalesOrderForm(order);
      setLoadedOrder(order);
      setIsLocked(false);
      applyForm(form.customer, form.header, form.rows, form.destination, form.billingCustomer);
    },
    [applyForm],
  );

  const resetToNewOrder = useCallback(async () => {
    setLoadedOrder(null);
    setIsLocked(false);
    setError('');
    setIsLoadingOrder(true);
    orderDateTouchedRef.current = false;
    try {
      applyForm(null, createEmptyHeader(await getSystemDate()), []);
    } catch (cause) {
      applyForm(null, createEmptyHeader(), []);
      setError(cause instanceof Error
        ? `서버 기준일을 불러오지 못했습니다. ${cause.message}`
        : '서버 기준일을 불러오지 못했습니다.');
    } finally {
      setIsLoadingOrder(false);
    }
  }, [applyForm]);

  useEffect(() => {
    if (salesOrderId != null || mode !== 'create') return;
    let active = true;
    void getSystemDate()
      .then((date) => {
        if (!active || orderDateTouchedRef.current) return;
        setOrderDate(date);
        orderDateTouchedRef.current = true;
        setBaseline((current) => ({ ...current, orderDt: date }));
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error
          ? `서버 기준일을 불러오지 못했습니다. ${cause.message}`
          : '서버 기준일을 불러오지 못했습니다.');
      });
    return () => { active = false; };
  }, [mode, salesOrderId]);

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
      setError('');
      if (gridValidationActiveRef.current) {
        gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
      }
    },
    [clearValidationErrors, gridRows],
  );

  const handleCalculationError = useCallback((cause: Error) => {
    setError(cause.message);
  }, []);

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

    const normalizedOrderDate = normalizeDateInput(orderDate);
    const normalizedDeliveryDate = deliveryDate.trim() ? normalizeDateInput(deliveryDate) : '';
    const nextOrderDateError = normalizedOrderDate ? ''
      : orderDate.trim() ? '올바른 수주일자를 입력해 주세요.' : '수주일자를 입력해 주세요.';
    const nextDeliveryDateError = normalizedDeliveryDate
      ? ''
      : deliveryDate.trim()
        ? '올바른 납기일자를 입력해 주세요.'
        : '납기일자를 입력해 주세요.';
    setOrderDateError(nextOrderDateError);
    setDeliveryDateError(nextDeliveryDateError);

    const input = {
      orderDt: normalizedOrderDate,
      customerId: customer?.id ?? null,
      salesDestinationId: destination?.id ?? null,
      billingCustomerId: billingCustomer?.id ?? null,
      quotNo: quotationNumber,
      deliveryDt: normalizedDeliveryDate,
      deliveryPlace,
      deliveryMethod,
      remark,
      details: gridRef.current?.getActiveRows() ?? [],
    };
    const errors = validateSalesOrderInput(input);
    if (nextOrderDateError) errors.orderDt = nextOrderDateError;
    errors.deliveryDt = nextDeliveryDateError;
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    const validationMessages = [
      errors.orderDt,
      errors.deliveryDt,
      errors.customerId,
      errors.salesDestinationId,
      errors.billingCustomerId,
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
    destination,
    billingCustomer,
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
      await resetToNewOrder();
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

  const handleNew = useCallback(async () => {
    if (savingRef.current) {
      return;
    }
    if (
      hasUnsavedChanges &&
      !(await confirm({
        description:
          '저장되지 않은 수주 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
      }))
    ) {
      return;
    }
    await resetToNewOrder();
    setNotice('');
  }, [confirm, hasUnsavedChanges, resetToNewOrder]);

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
          px: embedded ? 0 : { xs: 1, sm: 2 },
          pt: embedded ? 0 : 1,
          pb: embedded ? 0 : 2,
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
        {commonCodesError || missingCommonCodes ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={retryCommonCodes}>
                공통코드 다시 불러오기
              </Button>
            }
          >
            {commonCodesError ||
              '수주 공통코드가 등록되지 않았습니다. 공통코드를 등록한 뒤 다시 불러와 주세요.'}
          </Alert>
        ) : null}
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Paper
          variant="outlined"
          sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}
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
              '& > .MuiFormControl-root .MuiInputBase-root.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
              },
              ...(!isEditable && {
                '& > .MuiStack-root .MuiInputBase-root': {
                  backgroundColor: 'action.disabledBackground',
                },
              }),
            }}
          >
            <TextField
              label="수주번호"
              size="small"
              value={loadedOrder?.orderNo ?? '저장 시 자동 채번'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.disabledBackground' } }}
            />
            <DateEditor
              label="수주일자"
              variant="outlined"
              autoFocus={false}
              required
              value={orderDate}
              onChange={(value) => {
                orderDateTouchedRef.current = true;
                setOrderDate(value);
                setError('');
                setOrderDateError('');
                clearValidationErrors();
              }}
              onBlur={() => {
                const normalized = normalizeDateInput(orderDate);
                if (normalized) setOrderDate(normalized);
                setOrderDateError(normalized ? ''
                  : orderDate.trim() ? '올바른 수주일자를 입력해 주세요.' : '수주일자를 입력해 주세요.');
              }}
              disabled={!isEditable}
              error={Boolean(orderDateError || validationErrors?.orderDt)}
              helperText={orderDateError || validationErrors?.orderDt}
            />
            <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 2,
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
              '& > .MuiStack-root': { mt: 0 },
              ...(!isEditable && { '& .MuiInputBase-root': { backgroundColor: 'action.disabledBackground' } }),
            }}>
              <CustomerPicker
                value={customer}
                search={searchOrderCustomers}
                triggerMode="icon"
                onChange={(value) => {
                  if (value.id !== customer?.id) setDestination(null);
                  setCustomer(value);
                  if (selectedQuotationCustomerId !== null && value.id !== selectedQuotationCustomerId) {
                    setQuotationNumber('');
                    setSelectedQuotationCustomerId(null);
                  }
                  clearValidationErrors();
                }}
                disabled={!isEditable}
                required
                error={Boolean(validationErrors?.customerId)}
                helperText={validationErrors?.customerId}
              />
              <MasterPicker label="납품처" value={destination}
                search={(keyword) => customer ? searchSalesDestinations(customer.id, keyword) : Promise.resolve([])}
                triggerMode="icon" onChange={(value) => { setDestination(value); clearValidationErrors(); }}
                disabled={!isEditable || !customer} required
                error={Boolean(validationErrors?.salesDestinationId)}
                helperText={validationErrors?.salesDestinationId} />
              <MasterPicker label="매출처" value={billingCustomer} search={searchOrderCustomers}
                triggerMode="icon" onChange={(value) => { setBillingCustomer(value); clearValidationErrors(); }}
                disabled={!isEditable} required
                error={Boolean(validationErrors?.billingCustomerId)}
                helperText={validationErrors?.billingCustomerId} />
            </Box>
            <TextField
              label="견적번호"
              size="small"
              value={quotationNumber}
              onChange={(event) => {
                setQuotationNumber(event.target.value);
                setSelectedQuotationCustomerId(null);
                clearValidationErrors();
              }}
              disabled={!isEditable}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="견적 선택">
                        <span>
                          <IconButton
                            aria-label="견적 선택"
                            disabled={!isEditable}
                            edge="end"
                            onClick={() => setQuotationPickerOpen(true)}
                            size="small"
                          >
                            <SearchOutlinedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <DateEditor
              label="납기일자"
              variant="outlined"
              autoFocus={false}
              required
              value={deliveryDate}
              onChange={(value) => {
                setDeliveryDate(value);
                setDeliveryDateError('');
                clearValidationErrors();
              }}
              onBlur={() => {
                const normalized = deliveryDate.trim() ? normalizeDateInput(deliveryDate) : '';
                if (normalized) setDeliveryDate(normalized);
                setDeliveryDateError(deliveryDate.trim() && !normalized
                  ? '올바른 납기일자를 입력해 주세요.' : '');
              }}
              disabled={!isEditable}
              error={Boolean(deliveryDateError)}
              helperText={deliveryDateError}
            />
            <TextField
              label="배송방법"
              size="small"
              select
              value={deliveryMethod}
              onChange={(event) => {
                setDeliveryMethod(event.target.value);
                clearValidationErrors();
              }}
              disabled={!isEditable || commonCodesLoading || Boolean(commonCodesError) || !commonCodes.deliveryMethodOptions.length}
            >
              {deliveryMethod &&
              !commonCodes.deliveryMethodOptions.some(({ value }) => value === deliveryMethod) ? (
                <MenuItem value={deliveryMethod}>{deliveryMethod}</MenuItem>
              ) : null}
              {commonCodes.deliveryMethodOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="수주상태"
              size="small"
              value={getSalesOrderCodeLabel(
                commonCodes.orderStatusOptions,
                loadedOrder?.status ?? EDITABLE_ORDER_STATUS,
              )}
              slotProps={{ input: { readOnly: true } }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.disabledBackground' } }}
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
            flex: '1 0 auto',
            flexDirection: 'column',
            minHeight: 320,
            minWidth: 0,
            overflow: 'hidden',
            borderRadius: 1,
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
              sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
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
          <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1 }}>
            <SalesOrderDetailGrid
              key={gridKey}
              gridRef={gridRef}
              rows={gridRows}
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              onOpenMaterialPicker={openMaterialPicker}
              deliveryDate={normalizeDateInput(deliveryDate) || deliveryDate}
              progressStatusOptions={commonCodes.progressStatusOptions}
              onCalculationError={handleCalculationError}
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
      <MasterPickerDialog
        label="견적"
        open={quotationPickerOpen && isEditable}
        search={(keyword) =>
          searchOrderQuotations(customer?.id ?? null, keyword)
        }
        onClose={() => setQuotationPickerOpen(false)}
        onChange={(option) => {
          const quotation = option as SalesOrderQuotationOption;
          setQuotationNumber(option.code);
          setSelectedQuotationCustomerId(quotation.customerId);
          setQuotationPickerOpen(false);
          clearValidationErrors();
        }}
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
      {dialog}
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
