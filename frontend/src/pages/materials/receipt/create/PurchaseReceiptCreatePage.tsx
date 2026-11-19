import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import SaveIcon from '@mui/icons-material/Save';
import {
  Alert, Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Paper, Select, Switch, TextField, Typography,
} from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { F1Grid, type F1GridChanges, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { fetchWarehouseOptions } from '../../request/confirm/services/purchaseRequestConfirm.service';
import { isTaxable, sumOrderAmounts } from '../../order/create/data/purchaseOrderAmounts';
import { DEFAULT_CURRENCY, fetchTaxTypeOptions } from '../../order/create/services/purchaseOrder.service';
import type { PurchaseOrderSelectOption, PurchaseOrderTaxType } from '../../order/create/types/purchaseOrder.types';
import { PurchaseReceiptInspectionPicker } from './components/PurchaseReceiptInspectionPicker';
import {
  createPurchaseReceiptColumns,
  recalculateRow,
  type PurchaseReceiptRow,
} from './data/purchaseReceiptColumns';
import {
  buildReceiptPayload,
  candidateToRow,
  cancelPurchaseReceipt,
  countRemovedNoInspectionRows,
  countRowsOverRemaining,
  createPurchaseReceipt,
  detailToRow,
  distinctReceiptCandidateCurrencies,
  getPurchaseReceipt,
  isLinkedNoInspection,
  searchReceiptCandidates,
  updatePurchaseReceipt,
  validateReceiptInput,
} from './services/purchaseReceipt.service';
import type { PurchaseReceiptCandidate, PurchaseReceiptItem } from './types/purchaseReceipt.types';
import { usePageMessages } from '../../../../shared/hooks/usePageMessages';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField } from '../../../../shared/components/FormDateField';
import { normalizeFormDate } from '../../../../shared/components/formDateUtils';

export type PurchaseReceiptPageMode = 'create' | 'edit' | 'view';

export type PurchaseReceiptEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canCancel: boolean;
  cancelDisabled: boolean;
  saving: boolean;
  save: () => void;
  cancelReceipt: () => void;
};

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'는 저장된 입고 수정, 'create'는 수입검사 합격분을 불러와 신규 입고 등록 */
  mode?: PurchaseReceiptPageMode;
  /** 지정 시 마운트 후 해당 입고를 불러온다 */
  purchaseReceiptId?: number;
  /** 현황 화면의 다이얼로그 안에서 쓸 때 페이지 헤더·불러오기 버튼·라우트 이탈 가드를 숨긴다 */
  embedded?: boolean;
  onSaved?: (item: PurchaseReceiptItem) => void;
  onCanceled?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: PurchaseReceiptEmbeddedActionState | null) => void;
};

type Supplier = { id: number; code: string; name: string };

const DEFAULT_TAX_OPTIONS: PurchaseOrderSelectOption[] = [
  { value: 'TAXABLE', label: '과세' },
  { value: 'ZERO_RATED', label: '영세' },
  { value: 'EXEMPT', label: '면세' },
];

const NO_INSPECTION_CANCEL_NOTICE =
  '무검사 품목은 가입고와 함께 취소됩니다. 다시 입고하려면 가입고등록에서 새로 등록해야 합니다.';

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function PurchaseReceiptCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  purchaseReceiptId,
  embedded = false,
  onSaved,
  onCanceled,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<PurchaseReceiptRow>>(null);
  const busyRef = useRef(false);
  const gridValidationActiveRef = useRef(false);

  const [baselineRows, setBaselineRows] = useState<PurchaseReceiptRow[]>([]);
  const [activeRows, setActiveRows] = useState<PurchaseReceiptRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [receiptDt, setReceiptDt] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
  const [taxType, setTaxType] = useState<PurchaseOrderTaxType>('TAXABLE');
  const [vatIncluded, setVatIncluded] = useState(false);
  const [remark, setRemark] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState<PurchaseOrderSelectOption[]>([]);
  const [taxTypeOptions, setTaxTypeOptions] = useState<PurchaseOrderSelectOption[]>(DEFAULT_TAX_OPTIONS);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const {
    validationMessages, setValidationMessages, notice, setNotice, error, setError, clearMessages,
  } = usePageMessages();
  /** 열린 저장 입고. null이면 신규 등록(수입검사 합격분 불러오기) */
  const [loaded, setLoaded] = useState<PurchaseReceiptItem | null>(null);
  /** 조회 조건과 무관한 입고 가능 수입검사 합격분 건수. 신규 등록 화면의 안내에 쓴다(null이면 아직 모름). */
  const [waitingTotal, setWaitingTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(purchaseReceiptId != null);
  const [dirty, setDirty] = useState(false);

  const canUpdate = Boolean(selectedMenuPermissions?.update);
  // 매입마감된 행이 있는 입고는 마감을 해제하기 전에는 수정·취소할 수 없다(서버도 막는다).
  const closedMonths = Array.from(new Set(
    (loaded?.details ?? []).map((detail) => detail.closingMonth).filter((month): month is string => Boolean(month)),
  )).sort();
  const closedRowCount = (loaded?.details ?? []).filter((detail) => detail.closingMonth).length;
  const isReadOnly = mode === 'view' || loaded?.useAt === 'N' || closedRowCount > 0;
  const editable = canUpdate && !busy && !isLoading && !isReadOnly;
  const hasRows = baselineRows.length > 0;
  const hasUnsavedChanges = loaded ? dirty : hasRows;
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const totals = useMemo(() => sumOrderAmounts(activeRows), [activeRows]);
  const linkedNoInspectionCount = useMemo(
    () => (loaded?.details ?? []).filter(isLinkedNoInspection).length,
    [loaded],
  );

  const refreshWaitingTotal = useCallback(() => {
    searchReceiptCandidates({})
      .then((result) => setWaitingTotal(result.total))
      .catch(() => setWaitingTotal(null));
  }, []);

  useEffect(() => {
    if (purchaseReceiptId != null || mode !== 'create') return;
    refreshWaitingTotal();
  }, [purchaseReceiptId, mode, refreshWaitingTotal]);

  useEffect(() => {
    let active = true;
    fetchWarehouseOptions()
      .then((options) => { if (active) setWarehouseOptions(options); })
      .catch(() => { if (active) setError('입고창고 목록을 불러오지 못했습니다.'); });
    fetchTaxTypeOptions()
      .then((options) => { if (active && options.length > 0) setTaxTypeOptions(options); })
      .catch(() => { /* 공통코드가 없으면 기본 3종을 쓴다 */ });
    return () => { active = false; };
  }, [setError]);

  const resetGrid = useCallback((rows: PurchaseReceiptRow[]) => {
    setBaselineRows(rows);
    setActiveRows(rows);
    setSelectedRowIds([]);
    setValidationMessages([]);
    gridValidationActiveRef.current = false;
    setGridKey((key) => key + 1);
  }, [setValidationMessages]);

  /** 그리드에 입력 중인 값을 포함한 현재 행. */
  const currentRows = useCallback(
    () => gridRef.current?.getRows() ?? activeRows,
    [activeRows],
  );

  /** 저장된 입고를 화면 상태로 옮긴다(조회·수정·저장 후 다시 채우기). */
  const applyLoaded = useCallback((item: PurchaseReceiptItem) => {
    const supplierId = item.supplierId ?? null;
    setLoaded(item);
    setReceiptDt(item.receiptDt);
    setSupplier(supplierId === null ? null : { id: supplierId, code: item.supplierCode ?? '', name: item.supplierName ?? '' });
    setCurrencyCode(item.currencyCode || DEFAULT_CURRENCY);
    setTaxType(item.taxType ?? 'TAXABLE');
    setVatIncluded(item.vatIncludedAt === 'Y');
    setRemark(item.remark ?? '');
    setDirty(false);
    resetGrid((item.details ?? []).map(detailToRow));
  }, [resetGrid]);

  const [loadedRequestId, setLoadedRequestId] = useState<typeof purchaseReceiptId | undefined>(undefined);
  if (loadedRequestId !== purchaseReceiptId) {
    setLoadedRequestId(purchaseReceiptId);
    if (purchaseReceiptId != null) setIsLoading(true);
  }

  useEffect(() => {
    if (purchaseReceiptId == null) return undefined;
    let active = true;
    getPurchaseReceipt(purchaseReceiptId)
      .then((item) => { if (active) applyLoaded(item); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '입고를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyLoaded, purchaseReceiptId, setError]);

  const runBusy = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    clearMessages();
    try {
      await work();
    } catch (workError) {
      setError(workError instanceof Error ? workError.message : '처리 중 오류가 발생했습니다.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [clearMessages, setError]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: purchaseReceiptId == null,
    onDate: setReceiptDt,
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setDirty(false);
    setReceiptDt('');
    void reloadServerDate();
    setSupplier(null);
    setCurrencyCode(DEFAULT_CURRENCY);
    setTaxType('TAXABLE');
    setVatIncluded(false);
    setRemark('');
    resetGrid([]);
  }, [resetGrid, reloadServerDate]);

  const handleNew = useCallback(async () => {
    if (busyRef.current) return;
    if (hasUnsavedChanges && !(await confirm({
      description: '저장하지 않은 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
    }))) {
      return;
    }
    resetToNew();
    clearMessages();
  }, [clearMessages, confirm, hasUnsavedChanges, resetToNew]);

  /**
   * 수입검사 합격분을 담는다. 같은 구매처·같은 통화만 한 입고에 누적하고, 이미 담긴 행은 건너뛴다.
   * 첫 행의 가입고 부가세 설정을 기본값으로 쓰며 입고수량은 입고 가능량이다.
   */
  const loadCandidates = useCallback((candidates: PurchaseReceiptCandidate[]) => {
    clearMessages();
    setPickerOpen(false);
    const first = candidates[0];
    if (!first) return;
    if (supplier && hasRows && first.supplierId !== supplier.id) {
      setError(`현재 입고의 구매처(${supplier.name})와 다른 구매처 품목은 담을 수 없습니다.`);
      return;
    }
    const nextCurrency = distinctReceiptCandidateCurrencies(candidates)[0] ?? DEFAULT_CURRENCY;
    if (hasRows && nextCurrency !== currencyCode) {
      setError(`통화가 다른 수입검사 품목은 한 입고에 담을 수 없습니다(${currencyCode} / ${nextCurrency}).`);
      return;
    }
    const nextSupplier: Supplier = supplier && hasRows
      ? supplier
      : { id: first.supplierId, code: first.supplierCode ?? '', name: first.supplierName ?? '' };
    const nextTax: PurchaseOrderTaxType = hasRows ? taxType : (first.taxType ?? 'TAXABLE');
    const nextIncluded = hasRows ? vatIncluded : (isTaxable(nextTax) && first.vatIncludedAt === 'Y');
    const existing = currentRows();
    const existingIds = new Set(existing.map((row) => row.qualityInspectionDetailId));
    const added = candidates
      .filter((candidate) => !existingIds.has(candidate.qualityInspectionDetailId))
      .map((candidate) => candidateToRow(candidate, nextTax, nextIncluded));
    setSupplier(nextSupplier);
    setCurrencyCode(nextCurrency);
    setTaxType(nextTax);
    setVatIncluded(nextIncluded);
    resetGrid([...existing, ...added]);
    clearMessages();
  }, [clearMessages, currencyCode, currentRows, hasRows, resetGrid, setError, supplier, taxType, vatIncluded]);

  /** 체크한 품목 행만 뺀다. 입력한 값은 남은 행에 그대로 유지한다. */
  const removeSelectedRows = useCallback(() => {
    clearMessages();
    const selected = new Set(selectedRowIds.map(String));
    if (selected.size === 0) return;
    setDirty(true);
    resetGrid(currentRows().filter((row) => !selected.has(row.rowId)));
  }, [clearMessages, currentRows, resetGrid, selectedRowIds]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseReceiptRow>) => {
    const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
    if (updated.size > 0) setDirty(true);
    setActiveRows(baselineRows.map((row) => updated.get(row.rowId) ?? row));
    // 실제로 값을 고쳤을 때만 이전 메시지를 모두 비운다(그리드 재구성 직후의 빈 변경 콜백은 성공 안내를 지우지 않는다).
    if (updated.size > 0) clearMessages();
    else setValidationMessages([]);
    if (gridValidationActiveRef.current) {
      gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
    }
  }, [baselineRows, clearMessages, setValidationMessages]);

  const changeTaxType = useCallback((next: PurchaseOrderTaxType) => {
    clearMessages();
    const nextIncluded = isTaxable(next) ? vatIncluded : false;
    setDirty(true);
    setTaxType(next);
    setVatIncluded(nextIncluded);
    resetGrid(currentRows().map((row) => recalculateRow(row, next, nextIncluded)));
  }, [clearMessages, currentRows, resetGrid, vatIncluded]);

  const changeVatIncluded = useCallback((next: boolean) => {
    clearMessages();
    setDirty(true);
    setVatIncluded(next);
    resetGrid(currentRows().map((row) => recalculateRow(row, taxType, next)));
  }, [clearMessages, currentRows, resetGrid, taxType]);

  const handleSave = useCallback(async () => {
    if (!editable) return;
    const rows = currentRows();
    const dateCheck = normalizeFormDate(receiptDt);
    if (dateCheck.date && dateCheck.date !== receiptDt) setReceiptDt(dateCheck.date);
    const messages = dateCheck.invalid
      ? ['올바른 입고일을 입력해 주세요.']
      : validateReceiptInput({ receiptDt: dateCheck.date, taxType }, rows, loaded === null);
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    clearMessages();
    setValidationMessages(messages);
    if (messages.length > 0 || !isGridValid) return;
    if (!loaded) {
      const createPayload = buildReceiptPayload({ receiptDt: dateCheck.date, taxType, vatIncluded, remark }, rows);
      void runBusy(async () => {
        const created = await createPurchaseReceipt(createPayload);
        resetToNew();
        refreshWaitingTotal();
        setNotice(`입고를 등록했습니다. 입고번호: ${created.receiptNo}`);
        onSaved?.(created);
      });
      return;
    }
    const removedNoInspection = countRemovedNoInspectionRows(loaded.details ?? [], rows);
    if (removedNoInspection > 0 && !(await confirm({
      description: `빠지는 무검사 품목 ${removedNoInspection}건은 가입고에서도 함께 삭제됩니다. 다시 입고하려면 가입고등록에서 새로 등록해야 합니다. 저장하시겠습니까?`,
    }))) return;
    const overCount = countRowsOverRemaining(rows);
    if (overCount > 0 && !(await confirm({
      description: `발주 잔량을 초과한 품목이 ${overCount}건 있습니다. 그대로 수정하시겠습니까?`,
    }))) return;
    const payload = buildReceiptPayload({ receiptDt: dateCheck.date, taxType, vatIncluded, remark }, rows);
    void runBusy(async () => {
      const saved = await updatePurchaseReceipt(loaded.purchaseReceiptId, payload);
      applyLoaded(saved);
      setNotice(`입고를 수정했습니다. 입고번호: ${saved.receiptNo}`);
      onSaved?.(saved);
    });
  }, [applyLoaded, clearMessages, confirm, currentRows, editable, loaded, onSaved, receiptDt, refreshWaitingTotal, remark, resetToNew, runBusy, setNotice, setValidationMessages, taxType, vatIncluded]);

  /** 입고 전체를 취소한다. 무검사 품목은 가입고도 함께 정리되므로 확인창에서 먼저 알린다. */
  const handleCancelReceipt = useCallback(async () => {
    if (!loaded || !editable) return;
    const noInspectionNotice = (loaded.details ?? []).some(isLinkedNoInspection) ? ` ${NO_INSPECTION_CANCEL_NOTICE}` : '';
    if (!(await confirm({
      description: `입고번호 ${loaded.receiptNo}를 취소하시겠습니까?${noInspectionNotice}`,
    }))) return;
    void runBusy(async () => {
      await cancelPurchaseReceipt(loaded.purchaseReceiptId);
      setDirty(false);
      setNotice(`입고를 취소했습니다. 입고번호: ${loaded.receiptNo}`);
      onCanceled?.();
    });
  }, [confirm, editable, loaded, onCanceled, runBusy, setNotice]);

  const isEditing = loaded !== null;
  const saveDisabled = !editable || (isEditing ? !dirty : !hasRows);
  const cancelDisabled = !editable || !isEditing;

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'load',
      actions: [
        { label: '신규', icon: NoteAddOutlinedIcon, visible: !isEditing, disabled: busy, onClick: () => void handleNew() },
        {
          label: '수입검사 불러오기', icon: FactCheckOutlinedIcon, visible: canUpdate && !isEditing,
          disabled: busy, onClick: () => setPickerOpen(true),
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          saving: busy,
          visible: canUpdate && !isReadOnly,
          disabled: saveDisabled,
          onClick: () => void handleSave(),
        },
      ],
    },
  ], [busy, canUpdate, handleNew, handleSave, isEditing, isReadOnly, saveDisabled]);

  useEffect(() => {
    if (!embedded || !onEmbeddedActionsChange) return;
    onEmbeddedActionsChange({
      canSave: canUpdate && !isReadOnly,
      saveDisabled,
      canCancel: canUpdate && !isReadOnly && isEditing,
      cancelDisabled,
      saving: busy,
      save: () => void handleSave(),
      cancelReceipt: () => void handleCancelReceipt(),
    });
  }, [busy, canUpdate, cancelDisabled, embedded, handleCancelReceipt, handleSave, isEditing, isReadOnly,
    onEmbeddedActionsChange, saveDisabled]);

  useEffect(() => () => {
    onEmbeddedActionsChange?.(null);
  }, [onEmbeddedActionsChange]);

  const columns = useMemo(() => createPurchaseReceiptColumns({
    editable,
    taxType,
    vatIncluded,
    warehouseOptions,
  }), [editable, taxType, vatIncluded, warehouseOptions]);

  const readOnlyField = { input: { readOnly: true }, inputLabel: { shrink: true } };
  const taxable = isTaxable(taxType);

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      {embedded ? null : (
        <PageHeader
          breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
          description={content.description}
          actionGroups={actions}
        />
      )}
      <Box
        role="region"
        aria-label="입고 등록 내용"
        aria-busy={busy || isLoading}
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
              {validationMessages.map((message) => <li key={message}>{message}</li>)}
            </Box>
          </Alert>
        )}
        {notice && <Alert severity="success">{notice}</Alert>}
        <PageMessageArea message={error} onClose={() => setError('')} severity="error" compact />
        {!isEditing ? (
          <Alert severity="info">
            {waitingTotal === null ? '' : (waitingTotal > 0
              ? `입고 가능한 수입검사 합격분 ${waitingTotal}건이 있습니다. 수입검사 불러오기로 입고할 품목을 담으세요. `
              : '입고 가능한 수입검사 합격분이 없습니다. ')}
            무검사 품목은 가입고를 저장하면 입고가 자동으로 등록됩니다. 등록된 입고는 입고현황에서 조회·수정합니다.
          </Alert>
        ) : null}
        {isEditing && loaded?.useAt !== 'N' && closedRowCount === 0 && linkedNoInspectionCount > 0 ? (
          <Alert severity="info">
            무검사 품목({linkedNoInspectionCount}건)의 수량·단가·창고·제조일·소비기한 수정은 가입고에도 함께 반영됩니다.
          </Alert>
        ) : null}
        {loaded?.useAt === 'N' ? (
          <Alert severity="info">취소된 입고입니다. 조회만 할 수 있습니다.</Alert>
        ) : null}
        {loaded && loaded.useAt !== 'N' && closedRowCount > 0 ? (
          <Alert severity="warning">
            {`매입마감된 입고입니다(마감 ${closedRowCount}건, 마감월 ${closedMonths.map((month) => `${month.slice(0, 4)}-${month.slice(4)}`).join(', ')}). 수정·취소하려면 매입마감처리에서 마감을 해제하세요.`}
          </Alert>
        ) : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>입고 기본정보</Typography>
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
            }}
          >
            <TextField label="입고번호" size="small" value={loaded?.receiptNo ?? ''} slotProps={readOnlyField} />
            <FormDateField
              label="입고일"
              value={receiptDt}
              disabled={!editable}
              onChange={(value) => { markDateTouched(); setReceiptDt(value); setDirty(true); clearMessages(); }}
            />
            <TextField
              label="구매처"
              size="small"
              value={supplier ? `${supplier.name} (${supplier.code})` : ''}
              slotProps={readOnlyField}
            />
            <TextField label="담당자" size="small" value={loaded ? (loaded.receiverName ?? '') : '로그인 사용자'} slotProps={readOnlyField} />
            <FormControl size="small" required disabled={!editable}>
              <InputLabel shrink id="receipt-tax-label">부가세구분</InputLabel>
              <Select
                labelId="receipt-tax-label"
                label="부가세구분"
                notched
                value={taxType}
                onChange={(event) => changeTaxType(event.target.value as PurchaseOrderTaxType)}
              >
                {taxTypeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              sx={{ m: 0, minHeight: 40 }}
              control={(
                <Switch
                  checked={taxable && vatIncluded}
                  disabled={!editable || !taxable}
                  onChange={(event) => changeVatIncluded(event.target.checked)}
                  slotProps={{ input: { 'aria-label': '부가세 포함' } }}
                />
              )}
              label={taxable ? (vatIncluded ? '부가세 포함' : '부가세 미포함') : '부가세 없음(미포함 고정)'}
            />
            <TextField label="통화" size="small" value={currencyCode} slotProps={readOnlyField} />
            <TextField
              label="비고"
              size="small"
              value={remark}
              onChange={(event) => { setRemark(event.target.value); setDirty(true); clearMessages(); }}
              disabled={!editable}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 500 } }}
            />
            <TextField
              label="공급가액"
              size="small"
              value={hasRows ? formatAmount(totals.supplyAmt) : ''}
              slotProps={{ ...readOnlyField, htmlInput: { style: { textAlign: 'right' } } }}
            />
            <TextField
              label="부가세액"
              size="small"
              value={hasRows ? formatAmount(totals.vatAmt) : ''}
              slotProps={{ ...readOnlyField, htmlInput: { style: { textAlign: 'right' } } }}
            />
            <TextField
              label="합계액"
              size="small"
              value={hasRows ? formatAmount(totals.totalAmt) : ''}
              slotProps={{ ...readOnlyField, htmlInput: { style: { textAlign: 'right' } } }}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>입고 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditing
                  ? (editable
                    ? '값을 고치거나 잘못 담긴 행을 체크해 뺀 뒤 저장하세요. 수량이 발주 잔량을 넘으면 저장 전에 확인을 묻습니다. 모든 행을 빼려면 입고 취소를 쓰세요.'
                    : '입고 품목 내역입니다.')
                  : (hasRows
                    ? '입고수량은 입고 가능량(합격량 − 기입고)을 넘을 수 없습니다. 단가·창고·제조일·소비기한은 가입고 값으로 채워져 있으며 고칠 수 있습니다.'
                    : '입고할 품목이 없습니다.')}
              </Typography>
            </Box>
            {editable && hasRows ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={<PlaylistRemoveIcon fontSize="small" />}
                disabled={selectedRowIds.length === 0}
                onClick={removeSelectedRows}
              >
                선택 행 빼기
              </Button>
            ) : null}
          </Box>
          <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1, pb: 1 }}>
            <F1Grid
              key={gridKey}
              ref={gridRef}
              ariaLabel="입고 상세 목록"
              storageKey={purchaseReceiptId == null ? 'materials-purchase-receipt-create-grid-v1' : 'materials-purchase-receipt-detail-grid-v1'}
              rows={baselineRows}
              columns={columns}
              rowKey="rowId"
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              showCheckbox={editable && hasRows}
              multiSelect
              height="100%"
              minHeight={260}
              allowAddRowInContextMenu={false}
              allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
              canExportExcel={false}
            />
          </Box>
        </Paper>
      </Box>
      <PurchaseReceiptInspectionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={loadCandidates}
        excludeIds={activeRows.map((row) => row.qualityInspectionDetailId).filter((id): id is number => id !== null)}
      />
      {embedded ? null : <ReceiptRouteLeaveGuard when={hasUnsavedChanges} />}
      {dialog}
    </Box>
  );
}

function ReceiptRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장하지 않은 입고 입력 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
