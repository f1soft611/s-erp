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
import { PurchaseArrivalOrderPicker } from './components/PurchaseArrivalOrderPicker';
import {
  createPurchaseArrivalColumns,
  recalculateRow,
  type PurchaseArrivalRow,
} from './data/purchaseArrivalColumns';
import {
  buildArrivalPayload,
  candidateToRow,
  cancelPurchaseArrival,
  createPurchaseArrival,
  detailToRow,
  distinctCandidateCurrencies,
  getPurchaseArrival,
  updatePurchaseArrival,
  countRowsOverRemaining,
  validateArrivalInput,
} from './services/purchaseArrival.service';
import type { PurchaseArrivalCandidate, PurchaseArrivalItem } from './types/purchaseArrival.types';
import { usePageMessages } from '../../../../shared/hooks/usePageMessages';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField } from '../../../../shared/components/FormDateField';
import { normalizeFormDate } from '../../../../shared/components/formDateUtils';

export type PurchaseArrivalPageMode = 'create' | 'edit' | 'view';

export type PurchaseArrivalEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canCancel: boolean;
  cancelDisabled: boolean;
  saving: boolean;
  save: () => void;
  cancelArrival: () => void;
};

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'는 저장된 가입고 수정, 'create'는 신규 등록 */
  mode?: PurchaseArrivalPageMode;
  /** 지정 시 마운트 후 해당 가입고를 불러온다 */
  purchaseArrivalId?: number;
  /** 현황 화면의 다이얼로그 안에서 쓸 때 페이지 헤더·신규 버튼·라우트 이탈 가드를 숨긴다 */
  embedded?: boolean;
  onSaved?: (item: PurchaseArrivalItem) => void;
  onCanceled?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: PurchaseArrivalEmbeddedActionState | null) => void;
};

type Supplier = { id: number; code: string; name: string };

const DEFAULT_TAX_OPTIONS: PurchaseOrderSelectOption[] = [
  { value: 'TAXABLE', label: '과세' },
  { value: 'ZERO_RATED', label: '영세' },
  { value: 'EXEMPT', label: '면세' },
];

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function PurchaseArrivalCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  purchaseArrivalId,
  embedded = false,
  onSaved,
  onCanceled,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<PurchaseArrivalRow>>(null);
  const busyRef = useRef(false);
  const gridValidationActiveRef = useRef(false);

  const [baselineRows, setBaselineRows] = useState<PurchaseArrivalRow[]>([]);
  const [activeRows, setActiveRows] = useState<PurchaseArrivalRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [arrivalDt, setArrivalDt] = useState('');
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
  /** 열린 저장 가입고. null이면 신규 등록 */
  const [loaded, setLoaded] = useState<PurchaseArrivalItem | null>(null);
  const [isLoading, setIsLoading] = useState(purchaseArrivalId != null);
  const [dirty, setDirty] = useState(false);

  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const isReadOnly = mode === 'view' || loaded?.useAt === 'N';
  const editable = canUpdate && !busy && !isLoading && !isReadOnly;
  const hasRows = baselineRows.length > 0;
  const hasUnsavedChanges = loaded ? dirty : hasRows;
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const totals = useMemo(() => sumOrderAmounts(activeRows), [activeRows]);
  /** 입고가 생긴 행의 입고번호. 있으면 그 행과 헤더(가입고일·부가세)·가입고 취소는 가입고에서 바꿀 수 없다. */
  const receiptNos = useMemo(
    () => [...new Set(activeRows.map((row) => row.receiptNo).filter((no) => no !== ''))],
    [activeRows],
  );
  /** 수입검사가 등록된 행의 검사번호. 입고와 같이 그 행과 헤더·가입고 취소를 가입고에서 바꿀 수 없다. */
  const inspectionNos = useMemo(
    () => [...new Set(activeRows.map((row) => row.inspectionNo).filter((no) => Boolean(no)))],
    [activeRows],
  );
  const headerLocked = receiptNos.length > 0 || inspectionNos.length > 0;

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

  const resetGrid = useCallback((rows: PurchaseArrivalRow[]) => {
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

  /** 저장된 가입고를 화면 상태로 옮긴다(조회·수정·저장 후 다시 채우기). */
  const applyLoaded = useCallback((item: PurchaseArrivalItem) => {
    const supplierId = item.supplierId ?? null;
    setLoaded(item);
    setArrivalDt(item.arrivalDt);
    setSupplier(supplierId === null ? null : { id: supplierId, code: item.supplierCode ?? '', name: item.supplierName ?? '' });
    setCurrencyCode(item.currencyCode || DEFAULT_CURRENCY);
    setTaxType(item.taxType ?? 'TAXABLE');
    setVatIncluded(item.vatIncludedAt === 'Y');
    setRemark(item.remark ?? '');
    setDirty(false);
    resetGrid((item.details ?? []).map(detailToRow));
  }, [resetGrid]);

  const [loadedRequestId, setLoadedRequestId] = useState<typeof purchaseArrivalId | undefined>(undefined);
  if (loadedRequestId !== purchaseArrivalId) {
    setLoadedRequestId(purchaseArrivalId);
    if (purchaseArrivalId != null) setIsLoading(true);
  }

  useEffect(() => {
    if (purchaseArrivalId == null) return undefined;
    let active = true;
    getPurchaseArrival(purchaseArrivalId)
      .then((item) => { if (active) applyLoaded(item); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '가입고를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyLoaded, purchaseArrivalId, setError]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: purchaseArrivalId == null,
    onDate: setArrivalDt,
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setDirty(false);
    setArrivalDt('');
    void reloadServerDate();
    setSupplier(null);
    setCurrencyCode(DEFAULT_CURRENCY);
    setTaxType('TAXABLE');
    setVatIncluded(false);
    setRemark('');
    resetGrid([]);
  }, [resetGrid, reloadServerDate]);

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

  /** 발주 품목을 담는다. 같은 구매처·같은 통화만 한 가입고에 누적한다. 첫 품목의 발주 부가세 설정을 기본값으로 쓴다. */
  const loadOrderRows = useCallback((candidates: PurchaseArrivalCandidate[]) => {
    clearMessages();
    setPickerOpen(false);
    const first = candidates[0];
    if (!first || first.supplierId === null) {
      setError('구매처가 지정되지 않은 발주 품목은 가입고할 수 없습니다.');
      return;
    }
    if (supplier && hasRows && first.supplierId !== supplier.id) {
      setError(`현재 가입고의 구매처(${supplier.name})와 다른 구매처 품목은 담을 수 없습니다.`);
      return;
    }
    const nextCurrency = distinctCandidateCurrencies(candidates)[0] ?? DEFAULT_CURRENCY;
    if (hasRows && nextCurrency !== currencyCode) {
      setError(`통화가 다른 발주 품목은 한 가입고에 담을 수 없습니다(${currencyCode} / ${nextCurrency}).`);
      return;
    }
    const nextSupplier: Supplier = supplier && hasRows
      ? supplier
      : { id: first.supplierId, code: first.supplierCode ?? '', name: first.supplierName ?? '' };
    const nextTax: PurchaseOrderTaxType = hasRows ? taxType : (first.taxType ?? 'TAXABLE');
    const nextIncluded = hasRows ? vatIncluded : (isTaxable(nextTax) && first.vatIncludedAt === 'Y');
    const existing = currentRows();
    const existingIds = new Set(existing.map((row) => row.purchaseOrderDetailId));
    const added = candidates
      .filter((candidate) => !existingIds.has(candidate.purchaseOrderDetailId))
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
    const rows = currentRows();
    const isLockedRow = (row: PurchaseArrivalRow) => Boolean(row.receiptNo || row.inspectionNo);
    const lockedRows = rows.filter((row) => selected.has(row.rowId) && isLockedRow(row));
    if (lockedRows.length > 0) {
      setError(lockedRows.some((row) => row.receiptNo)
        ? `입고가 등록된 품목 ${lockedRows.length}건은 가입고에서 뺄 수 없습니다. 입고에서 처리해 주세요.`
        : `수입검사가 등록된 품목 ${lockedRows.length}건은 가입고에서 뺄 수 없습니다. 수입검사에서 처리해 주세요.`);
    }
    const removable = new Set(rows.filter((row) => selected.has(row.rowId) && !isLockedRow(row)).map((row) => row.rowId));
    if (removable.size === 0) return;
    setDirty(true);
    resetGrid(rows.filter((row) => !removable.has(row.rowId)));
  }, [clearMessages, currentRows, resetGrid, selectedRowIds, setError]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseArrivalRow>) => {
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
    const dateCheck = normalizeFormDate(arrivalDt);
    if (dateCheck.date && dateCheck.date !== arrivalDt) setArrivalDt(dateCheck.date);
    const messages = dateCheck.invalid
      ? ['올바른 가입고일을 입력해 주세요.']
      : loaded && rows.length === 0
        ? ['모든 행을 뺄 수 없습니다. 가입고 취소를 사용해 주세요.']
        : validateArrivalInput({ arrivalDt: dateCheck.date, supplierId: supplier?.id ?? null, taxType }, rows);
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    clearMessages();
    setValidationMessages(messages);
    if (messages.length > 0 || !isGridValid || !supplier) return;
    const overCount = countRowsOverRemaining(rows);
    if (overCount > 0 && !(await confirm({
      description: `발주 잔량을 초과한 품목이 ${overCount}건 있습니다. 그대로 ${loaded ? '수정' : '등록'}하시겠습니까?`,
    }))) return;
    const payload = buildArrivalPayload({ arrivalDt: dateCheck.date, supplierId: supplier.id, taxType, vatIncluded, remark }, rows);
    void runBusy(async () => {
      if (loaded) {
        const saved = await updatePurchaseArrival(loaded.purchaseArrivalId, payload);
        applyLoaded(saved);
        setNotice(`가입고를 수정했습니다. 가입고번호: ${saved.arrivalNo}`);
        onSaved?.(saved);
        return;
      }
      const saved = await createPurchaseArrival(payload);
      resetToNew();
      const autoReceipt = saved.autoReceiptNo
        ? ` 무검사 품목 ${saved.autoReceiptCount ?? 0}건은 입고 ${saved.autoReceiptNo}에 자동 등록되었습니다.`
        : '';
      setNotice(`가입고를 등록했습니다. 가입고번호: ${saved.arrivalNo}${autoReceipt}`);
      onSaved?.(saved);
    });
  }, [applyLoaded, arrivalDt, clearMessages, confirm, currentRows, editable, loaded, onSaved, remark, resetToNew, runBusy, setNotice, setValidationMessages, supplier, taxType, vatIncluded]);

  /** 가입고 전체를 취소한다. 취소하면 발주 잔량이 복원되어 다시 가입고할 수 있다. */
  const handleCancelArrival = useCallback(async () => {
    if (!loaded || !editable) return;
    if (!(await confirm({
      description: `가입고번호 ${loaded.arrivalNo}를 취소하시겠습니까? 이 가입고에 담은 수량만큼 발주 잔량이 되살아나 다시 가입고할 수 있습니다.`,
    }))) return;
    void runBusy(async () => {
      await cancelPurchaseArrival(loaded.purchaseArrivalId);
      setDirty(false);
      setNotice(`가입고를 취소했습니다. 가입고번호: ${loaded.arrivalNo}`);
      onCanceled?.();
    });
  }, [confirm, editable, loaded, onCanceled, runBusy, setNotice]);

  const isEditing = loaded !== null;
  const saveDisabled = !editable || (isEditing ? !dirty : !hasRows);
  const cancelDisabled = !editable || !isEditing || headerLocked;

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'load',
      actions: [
        { label: '신규', icon: NoteAddOutlinedIcon, visible: !isEditing, disabled: busy, onClick: () => void handleNew() },
        {
          label: '발주 불러오기', icon: FactCheckOutlinedIcon, visible: canUpdate && !isEditing,
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
      cancelArrival: () => void handleCancelArrival(),
    });
  }, [busy, canUpdate, cancelDisabled, embedded, handleCancelArrival, handleSave, isEditing, isReadOnly,
    onEmbeddedActionsChange, saveDisabled]);

  useEffect(() => () => {
    onEmbeddedActionsChange?.(null);
  }, [onEmbeddedActionsChange]);

  const columns = useMemo(() => createPurchaseArrivalColumns({
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
        aria-label="가입고 등록 내용"
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
        {!isEditing && !hasRows ? (
          <Alert severity="info">발주 불러오기로 가입고할 발주 품목을 담으세요. 한 가입고에는 같은 구매처의 품목만 담을 수 있습니다.</Alert>
        ) : null}
        {loaded?.useAt === 'N' ? (
          <Alert severity="info">취소된 가입고입니다. 조회만 할 수 있습니다.</Alert>
        ) : null}
        {isEditing && loaded?.useAt !== 'N' && headerLocked ? (
          <Alert severity="info">
            {[
              receiptNos.length > 0 ? `입고가 등록된 품목이 있습니다(입고 ${receiptNos.join(', ')}).` : '',
              inspectionNos.length > 0 ? `수입검사가 등록된 품목이 있습니다(수입검사 ${inspectionNos.join(', ')}).` : '',
              `해당 품목의 수정·삭제와 가입고일·부가세 변경, 가입고 취소는 ${receiptNos.length > 0 ? '입고' : ''}${receiptNos.length > 0 && inspectionNos.length > 0 ? '·' : ''}${inspectionNos.length > 0 ? '수입검사' : ''}에서 처리해 주세요.`,
              `${inspectionNos.length === 0 ? '입고' : receiptNos.length === 0 ? '검사' : '입고·검사'}가 없는 품목과 비고는 여기서 수정할 수 있습니다.`,
            ].filter(Boolean).join(' ')}
          </Alert>
        ) : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>가입고 기본정보</Typography>
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
            <TextField
              label="가입고번호"
              size="small"
              value={loaded?.arrivalNo ?? (hasRows ? '저장 시 자동 채번' : '')}
              slotProps={readOnlyField}
            />
            <FormDateField
              label="가입고일"
              value={arrivalDt}
              disabled={!editable || headerLocked}
              onChange={(value) => { markDateTouched(); setArrivalDt(value); setDirty(true); clearMessages(); }}
            />
            <TextField
              label="구매처"
              size="small"
              value={supplier ? `${supplier.name} (${supplier.code})` : ''}
              slotProps={readOnlyField}
              placeholder="발주 불러오기로 결정"
            />
            <TextField
              label="담당자"
              size="small"
              value={loaded?.receiverName ?? (hasRows ? '저장 시 로그인 사용자' : '')}
              slotProps={readOnlyField}
            />
            <FormControl size="small" required disabled={!editable || headerLocked}>
              <InputLabel shrink id="arrival-tax-label">부가세구분</InputLabel>
              <Select
                labelId="arrival-tax-label"
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
                  disabled={!editable || !taxable || headerLocked}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>가입고 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditing
                  ? (editable
                    ? '값을 고치거나 잘못 담긴 행을 체크해 뺀 뒤 저장하세요. 모든 행을 빼려면 가입고 취소를 쓰세요.'
                    : '가입고 품목 내역입니다.')
                  : hasRows
                    ? '수량이 발주 잔량을 넘으면 저장 전에 확인을 묻고, 단가는 필수입니다(0 가능). 발주단가와 입고창고가 기본값입니다.'
                    : '가입고할 품목이 없습니다.'}
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
              ariaLabel="가입고 상세 목록"
              storageKey={purchaseArrivalId == null ? 'materials-purchase-arrival-create-grid-v1' : 'materials-purchase-arrival-detail-grid-v1'}
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
      <PurchaseArrivalOrderPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={loadOrderRows}
      />
      {embedded ? null : <ArrivalRouteLeaveGuard when={hasUnsavedChanges} />}
      {dialog}
    </Box>
  );
}

function ArrivalRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장하지 않은 가입고 입력 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
