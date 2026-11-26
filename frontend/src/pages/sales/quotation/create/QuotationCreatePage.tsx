import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isApiNetworkError } from '../../../../shared/services/apiErrors';
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
import { resetGridDecimalPolicyCache } from '../../../../shared/services/gridDecimalPolicy.service';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { useInitialLoadState } from '../../../../shared/hooks/useInitialLoadState';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { DateEditor } from '../../../../shared/components/f1-grid/editing/DateEditor';
import { normalizeDateInput } from '../../../../shared/components/f1-grid/editing/dateInput';
import {
  CustomerPicker,
  MaterialPickerDialog,
} from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { getSystemDate } from '../../../../shared/services/systemDateService';
import { usePolicyDecimalStatus } from '../../../../shared/components/f1-grid/core/gridDecimalPolicyContext';
import { SalesDecimalPolicyError } from '../../shared/SalesDecimalPolicyError';
import { formatSalesOrderAmount, type SalesAmountRule } from '../../order/create/data/salesOrderAmounts';
import { getDecimalColumnContract, resolveDecimalColumn } from '../../../../shared/services/decimalColumnContract';
import { searchQuotationCustomers, searchQuotationMaterials } from './services/quotationMaster.service';
import {
  buildQuotationPayload,
  createQuotation,
  deleteQuotation,
  getQuotation,
  toQuotationForm,
  updateQuotation,
  validateQuotationInput,
} from './services/quotation.service';
import { QuotationDetailGrid } from './components/QuotationDetailGrid';
import { QuotationCodeSelect } from './components/QuotationCodeSelect';
import {
  fetchQuotationCommonCodes,
  QUOTATION_CODE_GROUPS,
  type QuotationCodeGroup,
  type QuotationCommonCodes,
} from './services/quotationCommonCode.service';
import type {
  QuotationItem,
  QuotationValidationErrors,
} from './types/quotation.types';
import {
  resolveActiveQuotationRows,
  calculateQuotationTotals,
  type OpenMaterialPicker,
  type QuotationDetailRow,
} from './data/quotationDetail';

export type QuotationPageMode = 'create' | 'edit' | 'view';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  mode?: QuotationPageMode;
  quotationId?: number;
  embedded?: boolean;
  onSaved?: (quotation: QuotationItem) => void;
  onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: QuotationEmbeddedActionState | null) => void;
};

export type QuotationEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canDelete: boolean;
  deleteDisabled: boolean;
  saving: boolean;
  save: () => void;
  remove: () => void;
};

type HeaderSnapshot = {
  quotationDt: string;
  submitDt: string;
  customerId: number | null;
  customerReference: string;
  incoterms: string;
  paymentTerm: string;
  validTerm: string;
  currencyCode: string;
  remark: string;
};

const EMPTY_AMOUNTS = { supplyAmt: 0, vatAmt: 0, totalAmt: 0 };
const EMPTY_CONTENT: PageContent = { title: '견적서작성', description: '', cards: [], items: [] };

type MaterialPickerApply = (option: MasterPickerOption) => void;

function emptyHeader(quotationDt = ''): HeaderSnapshot {
  return {
    quotationDt,
    submitDt: '',
    customerId: null,
    customerReference: '',
    incoterms: '',
    paymentTerm: '',
    validTerm: '',
    currencyCode: '',
    remark: '',
  };
}

function headerFromForm(
  customer: MasterPickerOption | null,
  values: Omit<HeaderSnapshot, 'customerId'>,
): HeaderSnapshot {
  return { ...values, customerId: customer?.id ?? null };
}

function quotationMaterialSnapshot(option: MasterPickerOption): Partial<QuotationDetailRow> {
  return {
    materialId: option.id,
    materialCode: option.code,
    materialName: option.name,
    materialSpec: option.details?.find((detail) => detail.label === '품목규격')?.value ?? '',
    unit: option.details?.find((detail) => detail.label === '단위')?.value ?? '',
  };
}

export function QuotationCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  quotationId,
  embedded = false,
  onSaved,
  onDeleted,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const policyState = usePolicyDecimalStatus();
  const policy = policyState.rule;
  const amountRule = policy && ('places' in policy ? policy : policy.currency);
  const summaryRules = useMemo(() => {
    if (!policy) return undefined;
    const contract = getDecimalColumnContract('sales.quotation');
    return {
      supply: resolveDecimalColumn(contract.supplyAmt, policy),
      vat: resolveDecimalColumn(contract.vatAmt, policy),
      total: resolveDecimalColumn(contract.totalAmt, policy),
    };
  }, [policy]);
  const amountRuleRef = useRef(amountRule);
  const policyRef = useRef(policy);
  useEffect(() => { amountRuleRef.current = amountRule; policyRef.current = policy; }, [amountRule, policy]);
  const gridRef = useRef<F1GridRef<QuotationDetailRow>>(null);
  const savingRef = useRef(false);
  const initialDate = '';
  const [businessDate, setBusinessDate] = useState(initialDate);
  const [dateError, setDateError] = useState('');
  const [dateRetry, setDateRetry] = useState(0);
  const [commonCodes, setCommonCodes] = useState<QuotationCommonCodes>({
    INCOTERMS: [], PAYMENT_TERM: [], CURRENCY: [], ITEM_UNIT: [],
  });
  const [codesLoading, setCodesLoading] = useState(true);
  const [codesError, setCodesError] = useState('');
  const [codesRetry, setCodesRetry] = useState(0);
  const [loadRetry, setLoadRetry] = useState(0);
  const { start: startCodes, succeed: succeedCodes, fail: failCodes, ...codesInitialLoad } = useInitialLoadState({ networkOnly: true });
  const { start: startLoad, succeed: succeedLoad, fail: failLoad, ...quotationInitialLoad } = useInitialLoadState({ networkOnly: true });
  const [baseline, setBaseline] = useState<HeaderSnapshot>(() => emptyHeader());
  const [customer, setCustomer] = useState<MasterPickerOption | null>(null);
  const [quotationDt, setQuotationDt] = useState('');
  const [submitDt, setSubmitDt] = useState('');
  const [quotationDateError, setQuotationDateError] = useState('');
  const [submitDateError, setSubmitDateError] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [incoterms, setIncoterms] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [validTerm, setValidTerm] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [remark, setRemark] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [materialPickerApply, setMaterialPickerApply] = useState<MaterialPickerApply | null>(null);
  const [loadedQuotation, setLoadedQuotation] = useState<QuotationItem | null>(null);
  const [gridRows, setGridRows] = useState<QuotationDetailRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [amounts, setAmounts] = useState<ReturnType<typeof calculateQuotationTotals> | null>(EMPTY_AMOUNTS);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(quotationId != null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasDetailChanges, setHasDetailChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<QuotationValidationErrors | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const gridValidationActiveRef = useRef(false);

  const isReadOnly = mode === 'view';
  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const hasPermissionForMode = loadedQuotation ? canUpdate && Boolean(loadedQuotation.writer) : canCreate;
  const isEditable = !isReadOnly && !isLoadingQuotation && !isSaving && !isLocked
    && (policyState.status === 'ready' || policyState.status === 'unmanaged')
    && (loadedQuotation !== null || Boolean(businessDate)) && hasPermissionForMode;
  const isDeletable = !isReadOnly && loadedQuotation !== null && !isSaving && !isLocked
    && canDelete && Boolean(loadedQuotation.writer);
  const currentHeader = headerFromForm(customer, {
    quotationDt, submitDt, customerReference, incoterms, paymentTerm, validTerm, currencyCode, remark,
  });
  const hasHeaderChanges = Object.keys(currentHeader).some(
    (key) => currentHeader[key as keyof HeaderSnapshot] !== baseline[key as keyof HeaderSnapshot],
  );
  const hasUnsavedChanges = !isLocked && (hasHeaderChanges || hasDetailChanges);
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    let active = true;
    startCodes();
    void fetchQuotationCommonCodes()
      .then((codes) => { if (active) { setCommonCodes(codes); succeedCodes(); } })
      .catch((loadError: unknown) => {
        if (!active) return;
        failCodes(loadError);
        if (!isApiNetworkError(loadError)) setCodesError(
          loadError instanceof Error ? loadError.message : '견적 공통코드를 불러오지 못했습니다.',
        );
      })
      .finally(() => { if (active) setCodesLoading(false); });
    return () => { active = false; };
  }, [codesRetry, startCodes, succeedCodes, failCodes]);
  const codesDisabled = !isEditable || codesLoading || Boolean(codesError);
  const missingCodes = (Object.keys(QUOTATION_CODE_GROUPS) as QuotationCodeGroup[])
    .filter((code) => commonCodes[code].length === 0)
    .map((code) => QUOTATION_CODE_GROUPS[code]);

  useEffect(() => {
    let active = true;
    setDateError('');
    void getSystemDate()
      .then((date) => {
        if (!active) return;
        setBusinessDate(date);
        if (!quotationId) {
          setQuotationDt(date);
          setBaseline(emptyHeader(date));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setDateError(
          loadError instanceof Error ? loadError.message : '업무일자를 불러오지 못했습니다.',
        );
      });
    return () => { active = false; };
  }, [dateRetry, quotationId]);

  const applyLoadedQuotation = useCallback((quotation: QuotationItem) => {
    const form = toQuotationForm(quotation);
    setLoadedQuotation(quotation);
    setIsLocked(false);
    setCustomer(form.customer);
    setQuotationDt(form.header.quotationDt);
    setSubmitDt(form.header.submitDt ?? '');
    setQuotationDateError('');
    setSubmitDateError('');
    setCustomerReference(form.header.customerReference ?? '');
    setIncoterms(form.header.incoterms ?? '');
    setPaymentTerm(form.header.paymentTerm ?? '');
    setValidTerm(form.header.validTerm ?? '');
    setCurrencyCode(form.header.currencyCode ?? '');
    setRemark(form.header.remark ?? '');
    setBaseline(headerFromForm(form.customer, {
      quotationDt: form.header.quotationDt,
      submitDt: form.header.submitDt ?? '',
      customerReference: form.header.customerReference ?? '',
      incoterms: form.header.incoterms ?? '',
      paymentTerm: form.header.paymentTerm ?? '',
      validTerm: form.header.validTerm ?? '',
      currencyCode: form.header.currencyCode ?? '',
      remark: form.header.remark ?? '',
    }));
    setGridRows(form.rows);
    setGridKey((key) => key + 1);
    setAmounts(calculateQuotationTotals(form.rows, amountRuleRef.current, policyRef.current));
    setHasDetailChanges(false);
    setSelectedRowIds([]);
    setValidationErrors(null);
    gridValidationActiveRef.current = false;
  }, []);

  const resetToNewQuotation = useCallback(() => {
    setLoadedQuotation(null);
    setIsLocked(false);
    const date = businessDate;
    setCustomer(null);
    setQuotationDt(date);
    setSubmitDt('');
    setQuotationDateError('');
    setSubmitDateError('');
    setCustomerReference('');
    setIncoterms('');
    setPaymentTerm('');
    setValidTerm('');
    setCurrencyCode('');
    setRemark('');
    setBaseline(emptyHeader(date));
    setGridRows([]);
    setGridKey((key) => key + 1);
    setAmounts(EMPTY_AMOUNTS);
    setHasDetailChanges(false);
    setSelectedRowIds([]);
    setValidationErrors(null);
    setNotice('');
    setError('');
  }, [businessDate]);

  useEffect(() => {
    if (quotationId == null) return;
    let active = true;
    setIsLoadingQuotation(true);
    setError('');
    startLoad();
    getQuotation(quotationId)
      .then((quotation) => { if (active) { applyLoadedQuotation(quotation); succeedLoad(); } })
      .catch((loadError: unknown) => {
        if (!active) return;
        failLoad(loadError);
        setIsLocked(true);
        if (!isApiNetworkError(loadError)) setError(loadError instanceof Error ? loadError.message : '견적을 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setIsLoadingQuotation(false); });
    return () => { active = false; };
  }, [applyLoadedQuotation, quotationId, loadRetry, startLoad, succeedLoad, failLoad]);

  const clearValidationErrors = useCallback(() => setValidationErrors(null), []);

  const handleChangesChange = useCallback(
    (changes: F1GridChanges<QuotationDetailRow>) => {
      const activeRows = resolveActiveQuotationRows(gridRows, changes);
      try {
        setAmounts(calculateQuotationTotals(activeRows, amountRule, policy));
        setError('');
      } catch {
        setAmounts(null);
        setError('견적 합계를 계산할 수 없습니다. 입력 금액을 확인해 주세요.');
      }
      setHasDetailChanges(
        changes.insertedRows.length > 0 || changes.updatedRows.length > 0 || changes.deletedRows.length > 0,
      );
      clearValidationErrors();
      if (gridValidationActiveRef.current) {
        gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
      }
    },
    [amountRule, clearValidationErrors, gridRows, policy],
  );

  useEffect(() => {
    if (!amountRule || !policy) return;
    try {
      setAmounts(calculateQuotationTotals(gridRef.current?.getActiveRows() ?? gridRows, amountRule, policy));
    } catch {
      setAmounts(null);
    }
  }, [amountRule, gridRows, policy]);

  const openMaterialPicker: OpenMaterialPicker = useCallback((applyPatch) => {
    setMaterialPickerApply(
      () => (option: MasterPickerOption) => applyPatch(quotationMaterialSnapshot(option)),
    );
    setPickerOpen(true);
  }, []);

  const selectMaterial = useCallback((option: MasterPickerOption) => {
    materialPickerApply?.(option);
    setPickerOpen(false);
    setMaterialPickerApply(null);
    clearValidationErrors();
  }, [clearValidationErrors, materialPickerApply]);

  const openSelectedMaterialPicker = useCallback(() => {
    const [selectedRow] = gridRef.current?.getSelectedRows() ?? [];
    if (!selectedRow) return;
    const rowId = selectedRow.rowId;
    setMaterialPickerApply(() => (option: MasterPickerOption) => {
      gridRef.current?.setCellValue(rowId, 'materialCode', option);
    });
    setPickerOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (savingRef.current || !isEditable || (loadedQuotation && !hasUnsavedChanges)) return;
    const normalizedQuotationDt = normalizeDateInput(quotationDt);
    const normalizedSubmitDt = submitDt.trim() ? normalizeDateInput(submitDt) : '';
    const nextQuotationDateError = normalizedQuotationDt
      ? ''
      : quotationDt.trim()
        ? '올바른 견적작성일을 입력해 주세요.'
        : '견적작성일을 입력해 주세요.';
    const nextSubmitDateError = submitDt.trim() && !normalizedSubmitDt
      ? '올바른 견적제출일을 입력해 주세요.'
      : '';
    setQuotationDateError(nextQuotationDateError);
    setSubmitDateError(nextSubmitDateError);
    if (nextQuotationDateError || nextSubmitDateError) return;

    const input = {
      quotationDt: normalizedQuotationDt,
      submitDt: normalizedSubmitDt,
      customerId: customer?.id ?? null,
      customerReference,
      incoterms,
      paymentTerm,
      validTerm,
      currencyCode,
      remark,
      details: gridRef.current?.getActiveRows() ?? [],
    };
    const errors = validateQuotationInput(input, policy);
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    const validationMessages = [
      errors.quotationDt, errors.customerId, errors.details, ...errors.detailMessages,
    ].filter((message): message is string => Boolean(message));
    setValidationErrors(validationMessages.length ? errors : null);
    setError('');
    if (validationMessages.length || !isGridValid) return;
    savingRef.current = true;
    setIsSaving(true);
    setNotice('');
    try {
      const payload = buildQuotationPayload(input, policy);
      const saved = loadedQuotation
        ? await updateQuotation(loadedQuotation.quotationId, payload)
        : await createQuotation(payload);
      try {
        const reloaded = await getQuotation(saved.quotationId);
        applyLoadedQuotation(reloaded);
        setNotice(`견적이 ${loadedQuotation ? '수정' : '저장'}되었습니다. 견적번호: ${reloaded.quotationNo}`);
        onSaved?.(reloaded);
      } catch {
        setIsLocked(true);
        setError(`견적은 저장되었지만 다시 불러오지 못했습니다. 견적번호: ${saved.quotationNo}`);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '견적 저장 중 오류가 발생했습니다.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [
    applyLoadedQuotation, currencyCode, customer, customerReference, hasUnsavedChanges,
    incoterms, isEditable, loadedQuotation, onSaved, paymentTerm, policy, quotationDt, remark,
    submitDt, validTerm,
  ]);

  const handleDelete = useCallback(() => {
    if (!loadedQuotation || !isDeletable || savingRef.current) return;
    setDeleteConfirmOpen(true);
  }, [isDeletable, loadedQuotation]);

  const confirmDelete = useCallback(async () => {
    setDeleteConfirmOpen(false);
    if (!loadedQuotation || !isDeletable || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteQuotation(loadedQuotation.quotationId);
      setNotice(`견적이 삭제되었습니다. 견적번호: ${loadedQuotation.quotationNo}`);
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '견적 삭제 중 오류가 발생했습니다.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [isDeletable, loadedQuotation, onDeleted]);

  const handleNew = useCallback(async () => {
    if (savingRef.current) return;
    if (hasUnsavedChanges && !(await confirm({
      description: '저장되지 않은 견적 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
    }))) return;
    resetToNewQuotation();
  }, [confirm, hasUnsavedChanges, resetToNewQuotation]);

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'write',
      actions: [
        {
          label: '신규',
          icon: NoteAddOutlinedIcon,
          visible: canCreate && !embedded && !isReadOnly,
          disabled: isSaving,
          onClick: handleNew,
        },
        {
          label: '저장',
          icon: SaveIcon,
          saving: isSaving,
          visible: (canCreate || canUpdate) && !isReadOnly,
          disabled: !isEditable || (loadedQuotation !== null && !hasUnsavedChanges),
          onClick: handleSave,
        },
      ],
    },
    {
      key: 'delete',
      actions: [{
        label: '삭제',
        icon: DeleteForeverOutlinedIcon,
        visible: canDelete && !isReadOnly,
        disabled: !isDeletable,
        onClick: handleDelete,
      }],
    },
  ], [
    canCreate, canDelete, canUpdate, embedded, handleDelete, handleNew, handleSave,
    hasUnsavedChanges, isDeletable, isEditable, isReadOnly, isSaving, loadedQuotation,
  ]);

  const canSaveEmbedded = (loadedQuotation ? canUpdate : canCreate) && !isReadOnly;
  const saveDisabled = isSaving || !isEditable || (loadedQuotation !== null && !hasUnsavedChanges);
  const canDeleteEmbedded = canDelete && !isReadOnly;
  const deleteDisabled = isSaving || !isDeletable;
  useEffect(() => {
    if (!embedded || !onEmbeddedActionsChange) return;
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
    canDeleteEmbedded, canSaveEmbedded, deleteDisabled, embedded, handleDelete,
    handleSave, isSaving, onEmbeddedActionsChange, saveDisabled,
  ]);

  useEffect(() => () => { onEmbeddedActionsChange?.(null); }, [onEmbeddedActionsChange]);

  const validationMessages = validationErrors
    ? [validationErrors.details, ...validationErrors.detailMessages]
      .filter((message): message is string => Boolean(message))
    : [];
  const showDateLoader = !businessDate && !dateError && !quotationId;
  const pageContent = content ?? EMPTY_CONTENT;

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      {!embedded ? (
        <PageHeader
          breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
          description={pageContent.description}
          actionGroups={actions}
        />
      ) : null}
      <PageLoadBoundary {...codesInitialLoad} label="견적등록 공통코드" onRetry={() => setCodesRetry((value) => value + 1)}>
      <PageLoadBoundary {...quotationInitialLoad} error={quotationInitialLoad.error ?? (policyState.network ? 'network' : null)} label="견적등록"
        onRetry={() => { if (policyState.network) resetGridDecimalPolicyCache(); setLoadRetry((value) => value + 1); }}>
      <Box
        role="region"
        aria-label="견적 입력 내용"
        aria-busy={isSaving || isLoadingQuotation || showDateLoader}
        sx={{
          display: 'flex', flex: 1, flexDirection: 'column', gap: 2, minHeight: 0,
          minWidth: 0, overflowX: 'hidden', overflowY: 'auto',
          px: embedded ? 0 : 2, pt: embedded ? 0 : 2, pb: embedded ? 0 : 2,
        }}
      >
        {dateError ? (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setDateRetry((value) => value + 1)}>다시 시도</Button>}>
            {dateError}
          </Alert>
        ) : null}
        {codesError || (!codesLoading && missingCodes.length > 0) ? (
          <Alert severity={codesError ? 'error' : 'warning'}
            action={<Button color="inherit" size="small" aria-label="공통코드 재시도"
              onClick={() => {
                setCodesLoading(true);
                setCodesError('');
                setCodesRetry((retry) => retry + 1);
              }}>재시도</Button>}>
            {codesError || `선택 가능한 공통코드가 없습니다: ${missingCodes.join(', ')}. 공통코드 등록 및 사용 여부를 확인해 주세요.`}
          </Alert>
        ) : null}
        {validationMessages.length ? (
          <Alert severity="error">
            <Box component="ul" sx={{ my: 0, pl: 2 }}>{validationMessages.map((message) => <li key={message}>{message}</li>)}</Box>
          </Alert>
        ) : null}
        {notice ? <Alert severity="success">{notice}</Alert> : null}
        <SalesDecimalPolicyError status={policyState.status} network={policyState.network} />
        {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
        <Paper variant="outlined" sx={{ p: 2, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>견적 기본정보</Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
            columnGap: 2, rowGap: 1,
            '& > .MuiFormControl-root': { m: 0 },
            '& > .MuiStack-root': { mt: 0, minWidth: 0, alignItems: 'flex-start' },
          }}>
            <TextField
              label="견적번호" size="small"
              value={loadedQuotation?.quotationNo ?? '저장 시 자동 채번'}
              slotProps={{ input: { readOnly: true } }}
              sx={{ '& .MuiInputBase-root': { backgroundColor: 'action.disabledBackground' } }}
            />
            <Box component="fieldset" disabled={!isEditable}
              sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
              <DateEditor
                label="견적작성일" variant="outlined" autoFocus={false} required
                disabled={!isEditable}
                value={quotationDt} error={Boolean(quotationDateError)}
                helperText={quotationDateError}
                onChange={(value) => {
                  setQuotationDt(value);
                  setQuotationDateError('');
                  clearValidationErrors();
                }}
                onBlur={() => {
                  const normalized = normalizeDateInput(quotationDt);
                  if (normalized) setQuotationDt(normalized);
                  setQuotationDateError(normalized
                    ? ''
                    : quotationDt.trim()
                      ? '올바른 견적작성일을 입력해 주세요.'
                      : '견적작성일을 입력해 주세요.');
                }}
              />
            </Box>
            <CustomerPicker
              value={customer} search={searchQuotationCustomers} triggerMode="icon"
              onChange={(value) => { setCustomer(value); clearValidationErrors(); }}
              disabled={!isEditable} required error={Boolean(validationErrors?.customerId)}
              helperText={validationErrors?.customerId}
            />
            <Box component="fieldset" disabled={!isEditable}
              sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
              <DateEditor
                label="견적제출일" variant="outlined" autoFocus={false}
                disabled={!isEditable}
                value={submitDt} error={Boolean(submitDateError)}
                helperText={submitDateError}
                onChange={(value) => {
                  setSubmitDt(value);
                  setSubmitDateError('');
                }}
                onBlur={() => {
                  const normalized = submitDt.trim() ? normalizeDateInput(submitDt) : '';
                  if (normalized) setSubmitDt(normalized);
                  setSubmitDateError(submitDt.trim() && !normalized
                    ? '올바른 견적제출일을 입력해 주세요.'
                    : '');
                }}
              />
            </Box>
            <TextField label="참조" size="small" value={customerReference}
              onChange={(event) => setCustomerReference(event.target.value)} disabled={!isEditable} />
            <QuotationCodeSelect label="Incoterms" value={incoterms}
              options={commonCodes.INCOTERMS} onChange={setIncoterms} disabled={codesDisabled} />
            <QuotationCodeSelect label="결제조건" value={paymentTerm}
              options={commonCodes.PAYMENT_TERM} onChange={setPaymentTerm} disabled={codesDisabled} />
            <TextField label="견적유효기간" size="small" value={validTerm}
              onChange={(event) => setValidTerm(event.target.value)} disabled={!isEditable} />
            <QuotationCodeSelect label="화폐단위" value={currencyCode}
              options={commonCodes.CURRENCY} onChange={setCurrencyCode} disabled={codesDisabled} />
            <TextField label="비고" size="small" multiline minRows={2} value={remark}
              onChange={(event) => setRemark(event.target.value)} disabled={!isEditable}
              sx={{ gridColumn: { xs: 'auto', sm: '1 / -1' } }} />
          </Box>
        </Paper>
        <Paper variant="outlined" sx={{
          display: 'flex', flex: '1 0 auto', flexDirection: 'column', minHeight: 320,
          minWidth: 0, overflow: 'hidden', borderRadius: 1,
        }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 1, p: 2, pb: 1,
          }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>견적 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                품목을 선택하거나 품목명을 직접 입력할 수 있습니다.
              </Typography>
            </Box>
            {!isReadOnly ? (
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon fontSize="small" />}
                  disabled={!isEditable} onClick={() => gridRef.current?.addRow()}>상세 행 추가</Button>
                <Button size="small" variant="outlined" startIcon={<SearchOutlinedIcon fontSize="small" />}
                  disabled={selectedRowIds.length !== 1 || !isEditable}
                  onClick={openSelectedMaterialPicker}>품목 선택</Button>
              </Box>
            ) : null}
          </Box>
          <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 2 }}>
            <QuotationDetailGrid
              key={gridKey} gridRef={gridRef} rows={gridRows}
              onChangesChange={handleChangesChange} onSelectionChange={setSelectedRowIds}
              onOpenMaterialPicker={openMaterialPicker}
              unitOptions={codesLoading || codesError ? [] : commonCodes.ITEM_UNIT}
              disabled={!isEditable}
              onCalculationError={(cause) => setError(cause.message)}
            />
          </Box>
          <Box aria-label="견적 금액 합계" sx={{
            display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1, p: 2,
          }}>
            <AmountSummary label="공급가액" amount={amounts?.supplyAmt} rule={summaryRules?.supply ?? amountRule} />
            <AmountSummary label="부가세 (10%)" amount={amounts?.vatAmt} rule={summaryRules?.vat ?? amountRule} />
            <AmountSummary label="총액" amount={amounts?.totalAmt} rule={summaryRules?.total ?? amountRule} />
          </Box>
        </Paper>
      </Box>
      <MaterialPickerDialog
        open={pickerOpen && isEditable}
        search={searchQuotationMaterials}
        onClose={() => { setPickerOpen(false); setMaterialPickerApply(null); }}
        onChange={selectMaterial}
      />
      </PageLoadBoundary>
      </PageLoadBoundary>
      {embedded ? null : <QuotationRouteLeaveGuard when={hasUnsavedChanges} />}
      <UnsavedChangesConfirmDialog
        open={deleteConfirmOpen}
        title="견적 삭제"
        dialogTitleId="quotation-delete-dialog-title"
        description={`견적번호 ${loadedQuotation?.quotationNo ?? ''}를 삭제하시겠습니까? 삭제한 견적은 목록에서 제외됩니다.`}
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

function QuotationRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장되지 않은 견적 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
      cancelLabel="계속 작성"
      continueLabel="변경사항 버리고 이동"
      onCancel={() => { if (blocker.state === 'blocked') blocker.reset(); }}
      onContinue={() => { if (blocker.state === 'blocked') blocker.proceed(); }}
    />
  );
}

function AmountSummary({ label, amount, rule }: { label: string; amount?: number | string; rule?: SalesAmountRule }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
      border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1,
    }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {amount == null ? '-' : formatSalesOrderAmount(amount, rule)}
      </Typography>
    </Box>
  );
}
