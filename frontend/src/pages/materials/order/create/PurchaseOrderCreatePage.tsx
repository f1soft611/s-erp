import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';
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
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import { MaterialPickerDialog } from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import { F1Grid, type F1GridChanges, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import {
  fetchDefaultUnitPrice,
  fetchOrderTypeOptions,
  fetchWarehouseOptions,
  searchSuppliers,
} from '../../request/confirm/services/purchaseRequestConfirm.service';
import type { PurchaseMaterialOption } from '../../request/create/data/purchaseRequestDetail';
import { fetchPurchaseUseTypeOptions, searchPurchaseMaterials } from '../../request/create/services/purchaseRequest.service';
import { PurchaseOrderConfirmPicker } from './components/PurchaseOrderConfirmPicker';
import { calculateOrderAmounts, isTaxable, sumOrderAmounts } from './data/purchaseOrderAmounts';
import {
  buildDiffNote,
  createPurchaseOrderColumns,
  recalculateRow,
  type PurchaseOrderRow,
} from './data/purchaseOrderColumns';
import {
  buildOrderPayload,
  buildReceiptClosePayload,
  cancelPurchaseOrder,
  candidateToRow,
  createPurchaseOrder,
  DEFAULT_CURRENCY,
  detailToRow,
  distinctCandidateCurrencies,
  emptyRowDefaults,
  fetchMaterialDefault,
  fetchTaxTypeOptions,
  getPurchaseOrder,
  savePurchaseOrderReceiptClose,
  updatePurchaseOrder,
  validateOrderInput,
} from './services/purchaseOrder.service';
import type {
  PurchaseOrderCandidate,
  PurchaseOrderItem,
  PurchaseOrderSelectOption,
  PurchaseOrderSourceType,
  PurchaseOrderTaxType,
} from './types/purchaseOrder.types';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField, normalizeFormDate } from '../../../../shared/components/FormDateField';

export type PurchaseOrderPageMode = 'create' | 'edit' | 'view' | 'close';

export type PurchaseOrderEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canCancel: boolean;
  cancelDisabled: boolean;
  saving: boolean;
  save: () => void;
  cancelOrder: () => void;
};

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'는 저장된 발주 수정, 'close'는 입고대기마감만 처리, 'create'는 신규 등록 */
  mode?: PurchaseOrderPageMode;
  /** 지정 시 마운트 후 해당 발주를 불러온다 */
  purchaseOrderId?: number;
  /** 현황 화면의 다이얼로그 안에서 쓸 때 페이지 헤더·신규 버튼·라우트 이탈 가드를 숨긴다 */
  embedded?: boolean;
  onSaved?: (item: PurchaseOrderItem) => void;
  onCanceled?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: PurchaseOrderEmbeddedActionState | null) => void;
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

export function PurchaseOrderCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  purchaseOrderId,
  embedded = false,
  onSaved,
  onCanceled,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<PurchaseOrderRow>>(null);
  const busyRef = useRef(false);
  const gridValidationActiveRef = useRef(false);

  const [baselineRows, setBaselineRows] = useState<PurchaseOrderRow[]>([]);
  const [activeRows, setActiveRows] = useState<PurchaseOrderRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [orderDt, setOrderDt] = useState('');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);
  const [warehouseId, setWarehouseId] = useState('');
  const [taxType, setTaxType] = useState<PurchaseOrderTaxType>('TAXABLE');
  const [vatIncluded, setVatIncluded] = useState(false);
  const [remark, setRemark] = useState('');
  const [orderType, setOrderType] = useState('');
  const [useType, setUseType] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState<PurchaseOrderSelectOption[]>([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState<PurchaseOrderSelectOption[]>([]);
  const [useTypeOptions, setUseTypeOptions] = useState<PurchaseOrderSelectOption[]>([]);
  const [taxTypeOptions, setTaxTypeOptions] = useState<PurchaseOrderSelectOption[]>(DEFAULT_TAX_OPTIONS);
  const [confirmPickerOpen, setConfirmPickerOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');
  /** 열린 저장 발주. null이면 신규 등록 */
  const [loaded, setLoaded] = useState<PurchaseOrderItem | null>(null);
  const [isLoading, setIsLoading] = useState(purchaseOrderId != null);
  const [dirty, setDirty] = useState(false);

  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const isCloseMode = mode === 'close';
  const isReadOnly = mode === 'view' || isCloseMode || loaded?.useAt === 'N';
  const editable = canUpdate && !busy && !isLoading && !isReadOnly;
  /** 입고대기마감 모드에서는 마감 체크박스만 편집할 수 있다. */
  const closeEditable = isCloseMode && canUpdate && !busy && !isLoading && loaded?.useAt !== 'N';
  const hasRows = baselineRows.length > 0;
  const sourceType: PurchaseOrderSourceType | null = loaded
    ? loaded.sourceType
    : hasRows
      ? (baselineRows[0].purchaseRequestDetailId === null ? 'DIRECT' : 'CONFIRM')
      : null;
  const closeChangeCount = isCloseMode ? buildReceiptClosePayload(activeRows, baselineRows).details.length : 0;
  const hasUnsavedChanges = loaded ? (isCloseMode ? closeChangeCount > 0 : dirty) : hasRows;
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const totals = useMemo(() => sumOrderAmounts(activeRows), [activeRows]);
  const diffCount = useMemo(() => activeRows.filter((row) => row.diffNote).length, [activeRows]);

  useEffect(() => {
    let active = true;
    fetchWarehouseOptions()
      .then((options) => { if (active) setWarehouseOptions(options); })
      .catch(() => { if (active) setError('입고창고 목록을 불러오지 못했습니다.'); });
    fetchOrderTypeOptions()
      .then((options) => { if (active) setOrderTypeOptions(options); })
      .catch(() => { if (active) setError('발주구분 공통코드를 불러오지 못했습니다.'); });
    fetchPurchaseUseTypeOptions()
      .then((options) => { if (active) setUseTypeOptions(options); })
      .catch(() => { if (active) setError('사용용도 공통코드를 불러오지 못했습니다.'); });
    fetchTaxTypeOptions()
      .then((options) => { if (active && options.length > 0) setTaxTypeOptions(options); })
      .catch(() => { /* 공통코드가 없으면 기본 3종을 쓴다 */ });
    return () => { active = false; };
  }, []);

  const resetGrid = useCallback((rows: PurchaseOrderRow[]) => {
    setBaselineRows(rows);
    setActiveRows(rows);
    setSelectedRowIds([]);
    setValidationMessages([]);
    gridValidationActiveRef.current = false;
    setGridKey((key) => key + 1);
  }, []);

  /** 그리드에 입력 중인 값을 포함한 현재 행. */
  const currentRows = useCallback(
    () => gridRef.current?.getRows() ?? activeRows,
    [activeRows],
  );

  /** 저장된 발주를 화면 상태로 옮긴다(조회·수정·저장 후 다시 채우기). */
  const applyLoaded = useCallback((item: PurchaseOrderItem) => {
    const supplierId = item.supplierId ?? null;
    setLoaded(item);
    setOrderDt(item.orderDt);
    setSupplier(supplierId === null ? null : { id: supplierId, code: item.supplierCode ?? '', name: item.supplierName ?? '' });
    setCurrencyCode(item.currencyCode || DEFAULT_CURRENCY);
    setTaxType(item.taxType ?? 'TAXABLE');
    setVatIncluded(item.vatIncludedAt === 'Y');
    setRemark(item.remark ?? '');
    setWarehouseId('');
    setDirty(false);
    resetGrid((item.details ?? []).map((detail) => detailToRow(detail, supplierId)));
  }, [resetGrid]);

  useEffect(() => {
    if (purchaseOrderId == null) return undefined;
    let active = true;
    setIsLoading(true);
    getPurchaseOrder(purchaseOrderId)
      .then((item) => { if (active) applyLoaded(item); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '발주를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyLoaded, purchaseOrderId]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: purchaseOrderId == null,
    onDate: setOrderDt,
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setDirty(false);
    setOrderDt('');
    void reloadServerDate();
    setSupplier(null);
    setCurrencyCode(DEFAULT_CURRENCY);
    setWarehouseId('');
    setTaxType('TAXABLE');
    setVatIncluded(false);
    setRemark('');
    setOrderType('');
    setUseType('');
    setWarning('');
    resetGrid([]);
  }, [resetGrid, reloadServerDate]);

  const runBusy = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await work();
    } catch (workError) {
      setError(workError instanceof Error ? workError.message : '처리 중 오류가 발생했습니다.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const handleNew = useCallback(async () => {
    if (busyRef.current) return;
    if (hasUnsavedChanges && !(await confirm({
      description: '저장하지 않은 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
    }))) {
      return;
    }
    resetToNew();
    setNotice('');
    setError('');
  }, [confirm, hasUnsavedChanges, resetToNew]);

  /** 확정 품목을 담는다. 같은 구매처·같은 통화만 한 발주서에 누적한다. */
  const loadConfirmRows = useCallback((candidates: PurchaseOrderCandidate[]) => {
    setConfirmPickerOpen(false);
    if (sourceType === 'DIRECT') {
      setError('직접 선택한 품목이 있는 발주서에는 확정 품목을 담을 수 없습니다. 신규로 시작해 주세요.');
      return;
    }
    const first = candidates[0];
    if (!first || first.supplierId === null) {
      setError('구매처가 지정되지 않은 확정 품목은 발주할 수 없습니다.');
      return;
    }
    if (supplier && hasRows && first.supplierId !== supplier.id) {
      setError(`현재 발주서의 구매처(${supplier.name})와 다른 구매처 품목은 담을 수 없습니다.`);
      return;
    }
    const nextCurrency = distinctCandidateCurrencies(candidates)[0] ?? DEFAULT_CURRENCY;
    if (hasRows && nextCurrency !== currencyCode) {
      setError(`통화가 다른 확정 품목은 한 발주서에 담을 수 없습니다(${currencyCode} / ${nextCurrency}).`);
      return;
    }
    const nextSupplier: Supplier = supplier && hasRows
      ? supplier
      : { id: first.supplierId, code: first.supplierCode ?? '', name: first.supplierName ?? '' };
    const existing = currentRows();
    const existingIds = new Set(existing.map((row) => row.purchaseRequestDetailId));
    const added = candidates
      .filter((candidate) => !existingIds.has(candidate.purchaseRequestDetailId))
      .map((candidate) => candidateToRow(candidate, taxType, vatIncluded, nextSupplier.id));
    setSupplier(nextSupplier);
    setCurrencyCode(nextCurrency);
    resetGrid([...existing, ...added]);
    setNotice('');
    setError('');
  }, [currencyCode, currentRows, hasRows, resetGrid, sourceType, supplier, taxType, vatIncluded]);

  /** 체크한 품목 행만 뺀다. 입력한 값은 남은 행에 그대로 유지한다. */
  const removeSelectedRows = useCallback(() => {
    const selected = new Set(selectedRowIds.map(String));
    if (selected.size === 0) return;
    setDirty(true);
    resetGrid(currentRows().filter((row) => !selected.has(row.rowId)));
  }, [currentRows, resetGrid, selectedRowIds]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseOrderRow>) => {
    const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
    if (updated.size > 0) setDirty(true);
    setActiveRows(baselineRows.map((row) => updated.get(row.rowId) ?? row));
    setValidationMessages([]);
    if (gridValidationActiveRef.current) {
      gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
    }
  }, [baselineRows]);

  const changeTaxType = useCallback((next: PurchaseOrderTaxType) => {
    const nextIncluded = isTaxable(next) ? vatIncluded : false;
    setDirty(true);
    setTaxType(next);
    setVatIncluded(nextIncluded);
    resetGrid(currentRows().map((row) => recalculateRow(row, next, nextIncluded, supplier?.id ?? null)));
  }, [currentRows, resetGrid, supplier, vatIncluded]);

  const changeVatIncluded = useCallback((next: boolean) => {
    setDirty(true);
    setVatIncluded(next);
    resetGrid(currentRows().map((row) => recalculateRow(row, taxType, next, supplier?.id ?? null)));
  }, [currentRows, resetGrid, supplier, taxType]);

  const changeWarehouse = useCallback((next: string) => {
    setWarehouseId(next);
    if (!next) return;
    const rows = currentRows();
    if (rows.some((row) => !row.warehouseId)) {
      resetGrid(rows.map((row) => (row.warehouseId ? row : { ...row, warehouseId: next })));
    }
  }, [currentRows, resetGrid]);

  const selectSupplier = useCallback((option: MasterPickerOption) => {
    setSupplierPickerOpen(false);
    const next: Supplier = { id: option.id, code: option.code, name: option.name };
    const rows = currentRows();
    setSupplier(next);
    if (rows.length === 0) return;
    // 구매처를 바꾸면 확정과 다름 표시를 다시 계산한다. 직접 발주 행은 새 구매처의 기본 단가를 다시 조회한다.
    void runBusy(async () => {
      const nextRows = await Promise.all(rows.map(async (row) => {
        if (row.purchaseRequestDetailId !== null) {
          return { ...row, diffNote: buildDiffNote(row, next.id) };
        }
        const price = await fetchDefaultUnitPrice(row.materialId, next.id, orderDt);
        const unitPrice = price ? Number(price.unitPrice) : null;
        return recalculateRow({ ...row, unitPrice }, taxType, vatIncluded, next.id);
      }));
      resetGrid(nextRows);
    });
  }, [currentRows, orderDt, resetGrid, runBusy, taxType, vatIncluded]);

  const openMaterialPicker = useCallback(() => {
    if (sourceType === 'CONFIRM') {
      setError('확정 품목이 있는 발주서에는 품목을 직접 추가할 수 없습니다. 신규로 시작해 주세요.');
      return;
    }
    if (!supplier) {
      setError('품목을 추가하기 전에 구매처를 먼저 선택해 주세요.');
      return;
    }
    setMaterialPickerOpen(true);
  }, [sourceType, supplier]);

  /** 직접 발주 품목 추가: 검사대상 기본값과 단가관리의 매입 단가를 채운다. */
  const addMaterial = useCallback((option: MasterPickerOption) => {
    setMaterialPickerOpen(false);
    if (!supplier) return;
    const material = option as PurchaseMaterialOption;
    void runBusy(async () => {
      const [defaults, price] = await Promise.all([
        fetchMaterialDefault(material.id),
        fetchDefaultUnitPrice(material.id, supplier.id, orderDt),
      ]);
      const unitPrice = price ? Number(price.unitPrice) : null;
      if (price?.currency && hasRows && price.currency !== currencyCode) {
        setError(`품목 단가의 통화(${price.currency})가 발주서 통화(${currencyCode})와 다릅니다. 단가를 직접 확인해 주세요.`);
      }
      const base: PurchaseOrderRow = {
        ...emptyRowDefaults(),
        rowId: `direct-${material.id}-${Date.now()}`,
        purchaseOrderDetailId: null,
        purchaseRequestDetailId: null,
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        materialSpec: material.spec ?? '',
        unit: material.unit ?? '',
        orderQty: 1,
        unitPrice,
        deliveryDt: orderDt,
        warehouseId,
        inspectAt: defaults.inspectAt === 'Y',
        receiptClosed: false,
        supplyAmt: 0,
        vatAmt: 0,
        totalAmt: 0,
        remark: '',
      };
      const amounts = calculateOrderAmounts(base.orderQty, base.unitPrice, taxType, vatIncluded);
      if (!hasRows && price?.currency) setCurrencyCode(price.currency);
      resetGrid([...currentRows(), { ...base, ...amounts }]);
    });
  }, [currencyCode, currentRows, hasRows, orderDt, resetGrid, runBusy, supplier, taxType, vatIncluded, warehouseId]);

  const handleSave = useCallback(async () => {
    if (closeEditable && loaded) {
      // 마감은 마감만 저장한다. 바뀐 행의 마감 값만 보내고 다른 값은 보내지 않는다.
      const closePayload = buildReceiptClosePayload(currentRows(), baselineRows);
      if (closePayload.details.length === 0) return;
      void runBusy(async () => {
        const saved = await savePurchaseOrderReceiptClose(loaded.purchaseOrderId, closePayload);
        applyLoaded(saved);
        setNotice(`입고대기마감을 저장했습니다. 발주번호: ${saved.orderNo}`);
        onSaved?.(saved);
      });
      return;
    }
    if (!editable || !sourceType) return;
    const rows = currentRows();
    const dateCheck = normalizeFormDate(orderDt);
    if (dateCheck.date && dateCheck.date !== orderDt) setOrderDt(dateCheck.date);
    const messages = dateCheck.invalid
      ? ['올바른 발주일을 입력해 주세요.']
      : loaded && rows.length === 0
        ? ['모든 행을 뺄 수 없습니다. 발주 취소를 사용해 주세요.']
        : validateOrderInput(
          { orderDt: dateCheck.date, supplierId: supplier?.id ?? null, taxType, sourceType, orderType: orderType || 'edit', useType: useType || 'edit' },
          rows,
        );
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    setValidationMessages(messages);
    if (messages.length > 0 || !isGridValid || !supplier) return;
    const payload = buildOrderPayload({
      sourceType, orderDt: dateCheck.date, supplierId: supplier.id, currencyCode, warehouseId, taxType, vatIncluded,
      remark, orderType, useType,
    }, rows);
    void runBusy(async () => {
      const over = (saved: PurchaseOrderItem) => {
        const lines = saved.overOrderedLineNos ?? [];
        setWarning(lines.length > 0 ? `확정수량을 넘겨 발주한 행이 있습니다(${lines.join(', ')}행). 확인해 주세요.` : '');
      };
      if (loaded) {
        const saved = await updatePurchaseOrder(loaded.purchaseOrderId, payload);
        applyLoaded(saved);
        setNotice(`발주를 수정했습니다. 발주번호: ${saved.orderNo}`);
        over(saved);
        onSaved?.(saved);
        return;
      }
      const saved = await createPurchaseOrder(payload);
      resetToNew();
      setNotice(`발주를 등록했습니다. 발주번호: ${saved.orderNo}`);
      over(saved);
      onSaved?.(saved);
    });
  }, [applyLoaded, baselineRows, closeEditable, currencyCode, currentRows, editable, loaded, onSaved, orderDt, orderType, remark, resetToNew,
    runBusy, sourceType, supplier, taxType, useType, vatIncluded, warehouseId]);

  /** 발주서 전체를 취소한다. 확정 불러오기 발주는 확정 잔량이 복원되고, 직접 발주는 자동 생성된 확정·구매요청도 정리된다. */
  const handleCancelOrder = useCallback(async () => {
    if (!loaded || !editable) return;
    const extra = loaded.sourceType === 'DIRECT'
      ? ' 직접 발주로 자동 생성된 구매요청과 확정도 함께 취소됩니다.'
      : ' 이 발주에 쓴 확정 품목의 잔량이 되살아나 다시 발주할 수 있습니다.';
    if (!(await confirm({ description: `발주번호 ${loaded.orderNo}를 취소하시겠습니까?${extra}` }))) return;
    void runBusy(async () => {
      await cancelPurchaseOrder(loaded.purchaseOrderId);
      setDirty(false);
      setNotice(`발주를 취소했습니다. 발주번호: ${loaded.orderNo}`);
      onCanceled?.();
    });
  }, [confirm, editable, loaded, onCanceled, runBusy]);

  const isEditing = loaded !== null;
  const saveDisabled = isCloseMode ? (!closeEditable || closeChangeCount === 0) : (!editable || (isEditing ? !dirty : !hasRows));
  const cancelDisabled = !editable || !isEditing;
  const canSaveAction = canUpdate && (isCloseMode ? loaded?.useAt !== 'N' : !isReadOnly);

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'load',
      actions: [
        { label: '신규', icon: NoteAddOutlinedIcon, visible: !isEditing, disabled: busy, onClick: () => void handleNew() },
        {
          label: '확정 불러오기', icon: FactCheckOutlinedIcon, visible: canUpdate && !isEditing,
          disabled: busy || sourceType === 'DIRECT', onClick: () => setConfirmPickerOpen(true),
        },
        {
          label: '품목 추가', icon: AddCircleOutlineIcon, visible: canUpdate && !isEditing,
          disabled: busy || sourceType === 'CONFIRM', onClick: openMaterialPicker,
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
  ], [busy, canUpdate, handleNew, handleSave, isEditing, isReadOnly, openMaterialPicker, saveDisabled, sourceType]);

  useEffect(() => {
    if (!embedded || !onEmbeddedActionsChange) return;
    onEmbeddedActionsChange({
      canSave: canSaveAction,
      saveDisabled,
      canCancel: canUpdate && !isReadOnly && isEditing,
      cancelDisabled,
      saving: busy,
      save: () => void handleSave(),
      cancelOrder: () => void handleCancelOrder(),
    });
  }, [busy, canSaveAction, canUpdate, cancelDisabled, embedded, handleCancelOrder, handleSave, isEditing, isReadOnly,
    onEmbeddedActionsChange, saveDisabled]);

  useEffect(() => () => {
    onEmbeddedActionsChange?.(null);
  }, [onEmbeddedActionsChange]);

  const columns = useMemo(() => createPurchaseOrderColumns({
    editable,
    showReceiptClose: purchaseOrderId != null,
    closeEditable,
    taxType,
    vatIncluded,
    supplierId: supplier?.id ?? null,
    warehouseOptions,
  }), [closeEditable, editable, purchaseOrderId, supplier, taxType, vatIncluded, warehouseOptions]);

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
        aria-label="발주 등록 내용"
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
        {warning && <Alert severity="warning" onClose={() => setWarning('')}>{warning}</Alert>}
        <PageMessageArea message={error} onClose={() => setError('')} severity="error" compact />
        {!isEditing && !hasRows ? (
          <Alert severity="info">
            확정 불러오기로 확정된 품목을 담거나, 구매처를 고른 뒤 품목 추가로 직접 발주할 품목을 고르세요.
          </Alert>
        ) : null}
        {loaded?.useAt === 'N' ? (
          <Alert severity="info">취소된 발주입니다. 조회만 할 수 있습니다.</Alert>
        ) : null}
        {diffCount > 0 ? (
          <Alert severity="warning">확정과 다른 행이 {diffCount}건 있습니다. 저장은 가능합니다.</Alert>
        ) : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>발주 기본정보</Typography>
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
              label="발주번호"
              size="small"
              value={loaded?.orderNo ?? (hasRows ? '저장 시 자동 채번' : '')}
              slotProps={readOnlyField}
            />
            <FormDateField
              label="발주일"
              value={orderDt}
              disabled={!editable}
              onChange={(value) => { markDateTouched(); setOrderDt(value); setDirty(true); setValidationMessages([]); }}
            />
            <TextField
              label="구매처"
              size="small"
              required
              value={supplier ? `${supplier.name} (${supplier.code})` : ''}
              disabled={!editable || isEditing}
              onClick={() => { if (editable && !isEditing) setSupplierPickerOpen(true); }}
              slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
              placeholder="클릭해서 구매처 선택"
            />
            {isEditing ? (
              <TextField
                label="상태"
                size="small"
                value={loaded?.useAt === 'N' ? '취소' : '정상'}
                slotProps={readOnlyField}
              />
            ) : (
              <FormControl size="small" disabled={!editable}>
                <InputLabel shrink id="order-warehouse-label">입고창고(기본)</InputLabel>
                <Select
                  labelId="order-warehouse-label"
                  label="입고창고(기본)"
                  notched
                  displayEmpty
                  value={warehouseId}
                  onChange={(event) => changeWarehouse(String(event.target.value))}
                >
                  <MenuItem value=""><em>선택 안 함</em></MenuItem>
                  {warehouseOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl size="small" required disabled={!editable}>
              <InputLabel shrink id="order-tax-label">부가세구분</InputLabel>
              <Select
                labelId="order-tax-label"
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
            {sourceType === 'DIRECT' && !isEditing ? (
              <>
                <FormControl size="small" required disabled={!editable}>
                  <InputLabel shrink id="order-type-label">발주구분</InputLabel>
                  <Select
                    labelId="order-type-label"
                    label="발주구분"
                    notched
                    displayEmpty
                    value={orderType}
                    onChange={(event) => { setOrderType(String(event.target.value)); setValidationMessages([]); }}
                  >
                    <MenuItem value=""><em>선택</em></MenuItem>
                    {orderTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" required disabled={!editable}>
                  <InputLabel shrink id="use-type-label">사용용도</InputLabel>
                  <Select
                    labelId="use-type-label"
                    label="사용용도"
                    notched
                    displayEmpty
                    value={useType}
                    onChange={(event) => { setUseType(String(event.target.value)); setValidationMessages([]); }}
                  >
                    <MenuItem value=""><em>선택</em></MenuItem>
                    {useTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : null}
            <TextField
              label="통화"
              size="small"
              value={currencyCode}
              slotProps={readOnlyField}
            />
            <TextField
              label="비고"
              size="small"
              value={remark}
              onChange={(event) => { setRemark(event.target.value); setDirty(true); }}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>발주 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditing
                  ? (isCloseMode
                  ? (closeEditable ? '입고를 더 받지 않을 행의 입고대기마감을 체크하고 저장하세요. 체크를 풀고 저장하면 마감이 취소됩니다. 다른 값은 바꿀 수 없습니다.' : '발주 품목 내역입니다.')
                  : editable
                    ? '값을 고치거나 잘못 담긴 행을 체크해 뺀 뒤 저장하세요. 모든 행을 빼려면 발주 취소를 쓰세요.'
                    : '발주 품목 내역입니다.')
                  : sourceType === 'CONFIRM'
                  ? '확정값이 기본값입니다. 수량·단가·납기일·창고는 고칠 수 있고, 확정과 다르면 경고만 표시됩니다.'
                  : sourceType === 'DIRECT'
                    ? '직접 고른 품목입니다. 저장하면 구매요청과 확정이 자동으로 함께 생성됩니다.'
                    : '발주할 품목이 없습니다.'}
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
              ariaLabel="발주 상세 목록"
              storageKey={purchaseOrderId == null ? 'materials-purchase-order-create-grid-v1' : 'materials-purchase-order-detail-grid-v1'}
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
      <PurchaseOrderConfirmPicker
        open={confirmPickerOpen}
        onClose={() => setConfirmPickerOpen(false)}
        onSelect={loadConfirmRows}
      />
      <MasterPickerDialog
        open={supplierPickerOpen}
        label="구매처"
        search={searchSuppliers}
        onClose={() => setSupplierPickerOpen(false)}
        onChange={selectSupplier}
      />
      <MaterialPickerDialog
        open={materialPickerOpen && editable}
        search={searchPurchaseMaterials}
        onClose={() => setMaterialPickerOpen(false)}
        onChange={addMaterial}
      />
      {embedded ? null : <OrderRouteLeaveGuard when={hasUnsavedChanges} />}
      {dialog}
    </Box>
  );
}

function OrderRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장하지 않은 발주 입력 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
