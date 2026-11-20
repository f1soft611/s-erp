import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import SaveIcon from '@mui/icons-material/Save';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { MasterPickerDialog } from '../../../../shared/components/master-picker/MasterPickerDialog';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import { F1Grid, type F1GridChanges, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { PurchaseConfirmPicker } from './components/PurchaseConfirmPicker';
import { PurchaseRequestSourcePicker } from './components/PurchaseRequestSourcePicker';
import {
  calculateAmount,
  createPurchaseRequestConfirmColumns,
  supplierPatch,
  type PurchaseRequestConfirmRow,
} from './data/purchaseRequestConfirmColumns';
import {
  buildConfirmPayload,
  buildOrderClosePayload,
  cancelPurchaseConfirm,
  createPurchaseConfirm,
  currencyMixMessage,
  DEFAULT_CURRENCY,
  DEFAULT_TAX_TYPE,
  distinctCurrencies,
  fetchDefaultUnitPrice,
  fetchCurrencyOptions,
  fetchOrderTypeOptions,
  fetchRequestDetails,
  fetchTaxTypeOptions,
  fetchWarehouseOptions,
  getPurchaseConfirm,
  savePurchaseConfirmOrderClose,
  searchSuppliers,
  toConfirmRows,
  validateConfirmInput,
} from './services/purchaseRequestConfirm.service';
import type {
  ConfirmSelectOption,
  PurchaseConfirmItem,
  PurchaseConfirmListItem,
  PurchaseRequestConfirmCandidate,
} from './types/purchaseRequestConfirm.types';
import { usePageMessages } from '../../../../shared/hooks/usePageMessages';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField } from '../../../../shared/components/FormDateField';
import { normalizeFormDate } from '../../../../shared/components/formDateUtils';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

type SupplierTarget = {
  row: PurchaseRequestConfirmRow;
  applyPatch: (changes: Partial<PurchaseRequestConfirmRow>) => void;
};

function formatAmount(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function PurchaseRequestConfirmPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<PurchaseRequestConfirmRow>>(null);
  const busyRef = useRef(false);
  const gridValidationActiveRef = useRef(false);

  /** 열린 확정. null이면 신규 작성(또는 빈 화면) */
  const [loaded, setLoaded] = useState<PurchaseConfirmItem | null>(null);
  const [baselineRows, setBaselineRows] = useState<PurchaseRequestConfirmRow[]>([]);
  const [activeRows, setActiveRows] = useState<PurchaseRequestConfirmRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [confirmDt, setConfirmDt] = useState('');
  const [remark, setRemark] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState<ConfirmSelectOption[]>([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState<ConfirmSelectOption[]>([]);
  const [taxTypeOptions, setTaxTypeOptions] = useState<ConfirmSelectOption[]>([]);
  const [currencyOptions, setCurrencyOptions] = useState<ConfirmSelectOption[]>([]);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [confirmPickerOpen, setConfirmPickerOpen] = useState(false);
  const [supplierTarget, setSupplierTarget] = useState<SupplierTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    validationMessages, setValidationMessages, notice, setNotice, error, setError, clearMessages,
  } = usePageMessages();

  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const isDraft = loaded === null && baselineRows.length > 0;
  const isActiveConfirm = loaded?.useAt === 'Y';
  const isCanceled = loaded?.useAt === 'N';
  const confirmEditable = loaded === null && canUpdate && !busy;
  const closeEditable = isActiveConfirm && canUpdate && !busy;

  const orderCloseChanges = useMemo(
    () => (isActiveConfirm ? buildOrderClosePayload(activeRows, baselineRows).details.length : 0),
    [activeRows, baselineRows, isActiveConfirm],
  );
  const hasUnsavedChanges = isDraft || orderCloseChanges > 0;
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  const totalAmt = useMemo(() => activeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0), [activeRows]);
  const currencies = useMemo(() => distinctCurrencies(activeRows), [activeRows]);
  const requestCount = useMemo(() => new Set(activeRows.map((row) => row.purchaseRequestId)).size, [activeRows]);

  useEffect(() => {
    let active = true;
    fetchWarehouseOptions()
      .then((options) => { if (active) setWarehouseOptions(options); })
      .catch(() => { if (active) setError('입고창고 목록을 불러오지 못했습니다.'); });
    fetchOrderTypeOptions()
      .then((options) => { if (active) setOrderTypeOptions(options); })
      .catch(() => { if (active) setError('발주구분 공통코드를 불러오지 못했습니다.'); });
    fetchTaxTypeOptions()
      .then((options) => { if (active) setTaxTypeOptions(options); })
      .catch(() => { if (active) setError('부가세구분 공통코드를 불러오지 못했습니다.'); });
    fetchCurrencyOptions()
      .then((options) => { if (active) setCurrencyOptions(options); })
      .catch(() => { if (active) setError('통화 공통코드를 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [setError]);

  const resetGrid = useCallback((rows: PurchaseRequestConfirmRow[]) => {
    setBaselineRows(rows);
    setActiveRows(rows);
    setSelectedRowIds([]);
    setValidationMessages([]);
    gridValidationActiveRef.current = false;
    setGridKey((key) => key + 1);
  }, [setValidationMessages]);

  const applyLoaded = useCallback((item: PurchaseConfirmItem) => {
    setLoaded(item);
    setConfirmDt(item.confirmDt);
    setRemark(item.remark ?? '');
    resetGrid(toConfirmRows(item.details, false));
  }, [resetGrid]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: true,
    // 저장된 확정을 연 뒤에 늦게 도착한 서버 날짜가 확정일을 덮어쓰지 않게 비어 있을 때만 채운다.
    onDate: (date) => setConfirmDt((current) => current || date),
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setConfirmDt('');
    void reloadServerDate();
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

  const confirmDiscard = useCallback(async (description: string) => (
    !hasUnsavedChanges || confirm({ description })
  ), [confirm, hasUnsavedChanges]);

  const openSourcePicker = useCallback(async () => {
    if (busyRef.current) return;
    if (!(await confirmDiscard('저장하지 않은 내용이 있습니다. 요청을 새로 불러오면 지금 화면의 내용이 사라집니다. 계속하시겠습니까?'))) return;
    setSourceOpen(true);
  }, [confirmDiscard]);

  /** 요청 불러오기는 누적하지 않는다. 그리드를 비우고 이번에 고른 품목 행만 신규 확정으로 표시한다. */
  const loadRequests = useCallback((candidates: PurchaseRequestConfirmCandidate[]) => {
    clearMessages();
    setSourceOpen(false);
    void runBusy(async () => {
      const details = await fetchRequestDetails(candidates.map((candidate) => candidate.purchaseRequestDetailId));
      setLoaded(null);
      setConfirmDt('');
      setRemark('');
      resetGrid(toConfirmRows(details, true));
      await reloadServerDate();
    });
  }, [clearMessages, reloadServerDate, resetGrid, runBusy]);

  /** 체크한 품목 행만 뺀다. 입력한 값은 남은 행에 그대로 유지한다. */
  const removeSelectedRows = useCallback(() => {
    clearMessages();
    const current = gridRef.current?.getRows() ?? activeRows;
    const selected = new Set(selectedRowIds.map(String));
    if (selected.size === 0) return;
    resetGrid(current.filter((row) => !selected.has(row.rowId)));
  }, [activeRows, clearMessages, resetGrid, selectedRowIds]);

  const openConfirmPicker = useCallback(async () => {
    if (busyRef.current) return;
    if (!(await confirmDiscard('저장하지 않은 내용이 있습니다. 다른 확정을 불러오면 입력 내용이 사라집니다. 계속하시겠습니까?'))) return;
    setConfirmPickerOpen(true);
  }, [confirmDiscard]);

  const selectConfirm = useCallback((item: PurchaseConfirmListItem) => {
    setConfirmPickerOpen(false);
    void runBusy(async () => {
      applyLoaded(await getPurchaseConfirm(item.purchaseConfirmId));
    });
  }, [applyLoaded, runBusy]);

  const handleNew = useCallback(async () => {
    if (busyRef.current) return;
    if (!(await confirmDiscard('저장하지 않은 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?'))) return;
    resetToNew();
    clearMessages();
  }, [clearMessages, confirmDiscard, resetToNew]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseRequestConfirmRow>) => {
    const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
    setActiveRows(baselineRows.map((row) => updated.get(row.rowId) ?? row));
    // 실제로 값을 고쳤을 때만 이전 메시지를 모두 비운다(그리드 재구성 직후의 빈 변경 콜백은 성공 안내를 지우지 않는다).
    if (updated.size > 0) clearMessages();
    else setValidationMessages([]);
    if (gridValidationActiveRef.current) {
      gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
    }
  }, [baselineRows, clearMessages, setValidationMessages]);

  const openSupplierPicker = useCallback((
    row: PurchaseRequestConfirmRow,
    applyPatch: (changes: Partial<PurchaseRequestConfirmRow>) => void,
  ) => {
    setSupplierTarget({ row, applyPatch });
  }, []);

  const selectSupplier = useCallback(async (option: MasterPickerOption) => {
    clearMessages();
    const target = supplierTarget;
    setSupplierTarget(null);
    if (!target) return;
    target.applyPatch(supplierPatch(option));
    try {
      const price = await fetchDefaultUnitPrice(target.row.materialId, option.id, confirmDt);
      const unitPrice = price ? Number(price.unitPrice) : null;
      const currencyCode = price?.currency || DEFAULT_CURRENCY;
      // 단가를 처음 참고하는 지점에서 단가·통화·부가세구분·부가세포함을 함께 설정한다(이후 단계는 이 값을 따른다).
      target.applyPatch({
        unitPrice,
        currencyCode,
        ...(price ? {
          taxType: price.taxType || DEFAULT_TAX_TYPE,
          vatIncludedAt: price.vatIncludedAt === 'Y' ? 'Y' as const : 'N' as const,
        } : {}),
        wonUnitPrice: price && currencyCode === DEFAULT_CURRENCY ? unitPrice : null,
        foreignUnitPrice: price?.foreignUnitPrice == null ? null : Number(price.foreignUnitPrice),
        foreignCurrency: price?.foreignCurrency ?? '',
        // 발주구분은 단가 행에 값이 있을 때만 덮어쓴다(없으면 사용자가 고른 값을 유지).
        ...(price?.orderType ? { orderType: price.orderType } : {}),
        amount: calculateAmount(target.row.confirmQty, unitPrice),
      });
    } catch (priceError) {
      setError(priceError instanceof Error ? priceError.message : '기본 단가를 불러오지 못했습니다.');
    }
  }, [clearMessages, confirmDt, setError, supplierTarget]);

  const handleConfirm = useCallback(async () => {
    if (!confirmEditable) return;
    const rows = gridRef.current?.getRows() ?? activeRows;
    const dateCheck = normalizeFormDate(confirmDt);
    if (dateCheck.date && dateCheck.date !== confirmDt) setConfirmDt(dateCheck.date);
    const messages = dateCheck.invalid
      ? ['올바른 확정일을 입력해 주세요.']
      : validateConfirmInput(dateCheck.date, rows);
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    clearMessages();
    setValidationMessages(messages);
    if (messages.length > 0 || !isGridValid) return;
    const rowCurrencies = distinctCurrencies(rows);
    if (rowCurrencies.length > 1) {
      // 경고만 보여 주고 저장하지 않는다(확인·닫기 모두 확정하지 않음).
      await confirm({ title: '통화 확인', description: currencyMixMessage(rowCurrencies), confirmLabel: '확인', cancelLabel: '닫기' });
      return;
    }
    void runBusy(async () => {
      const saved = await createPurchaseConfirm(buildConfirmPayload(dateCheck.date, remark, rows));
      applyLoaded(saved);
      setNotice(`구매요청을 확정했습니다. 확정번호: ${saved.confirmNo}`);
    });
  }, [activeRows, applyLoaded, clearMessages, confirm, confirmDt, confirmEditable, remark, runBusy, setNotice, setValidationMessages]);

  const handleSaveOrderClose = useCallback(() => {
    if (!loaded || !closeEditable) return;
    const rows = gridRef.current?.getRows() ?? activeRows;
    const payload = buildOrderClosePayload(rows, baselineRows);
    if (payload.details.length === 0) return;
    void runBusy(async () => {
      applyLoaded(await savePurchaseConfirmOrderClose(loaded.purchaseConfirmId, payload));
      setNotice('발주대기 마감을 저장했습니다.');
    });
  }, [activeRows, applyLoaded, baselineRows, closeEditable, loaded, runBusy, setNotice]);

  const handleCancelConfirm = useCallback(async () => {
    if (!loaded || !closeEditable) return;
    if (!(await confirm({
      description: `확정번호 ${loaded.confirmNo}를 취소하시겠습니까? 이 확정의 품목 ${activeRows.length}행이 미확정으로 돌아가고 확정 입력값과 발주대기 마감이 지워집니다.`,
    }))) {
      return;
    }
    void runBusy(async () => {
      applyLoaded(await cancelPurchaseConfirm(loaded.purchaseConfirmId));
      setNotice('구매요청 확정을 취소했습니다. 이 확정의 품목은 다시 확정할 수 있습니다.');
    });
  }, [activeRows, applyLoaded, closeEditable, confirm, loaded, runBusy, setNotice]);

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'load',
      actions: [
        { label: '신규', icon: NoteAddOutlinedIcon, visible: true, disabled: busy, onClick: () => void handleNew() },
        { label: '요청 불러오기', icon: SearchOutlinedIcon, visible: canUpdate, disabled: busy, onClick: () => void openSourcePicker() },
        { label: '확정 불러오기', icon: FactCheckOutlinedIcon, visible: true, disabled: busy, onClick: () => void openConfirmPicker() },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '확정',
          icon: TaskAltRoundedIcon,
          saving: busy && loaded === null,
          visible: canUpdate && loaded === null,
          disabled: !confirmEditable || baselineRows.length === 0,
          onClick: () => void handleConfirm(),
        },
        {
          label: '저장',
          icon: SaveIcon,
          saving: busy && isActiveConfirm,
          visible: canUpdate && isActiveConfirm,
          disabled: !closeEditable || orderCloseChanges === 0,
          onClick: handleSaveOrderClose,
        },
        {
          label: '확정 취소',
          icon: UndoRoundedIcon,
          visible: canUpdate && isActiveConfirm,
          disabled: !closeEditable,
          onClick: () => void handleCancelConfirm(),
        },
      ],
    },
  ], [baselineRows.length, busy, canUpdate, closeEditable, confirmEditable, handleCancelConfirm, handleConfirm, handleNew,
    handleSaveOrderClose, isActiveConfirm, loaded, openConfirmPicker, openSourcePicker, orderCloseChanges]);

  const columns = useMemo(() => createPurchaseRequestConfirmColumns({
    confirmEditable,
    closeEditable,
    warehouseOptions,
    orderTypeOptions,
    taxTypeOptions,
    currencyOptions,
    onOpenSupplierPicker: openSupplierPicker,
  }), [closeEditable, confirmEditable, currencyOptions, openSupplierPicker, orderTypeOptions, taxTypeOptions, warehouseOptions]);

  const readOnlyField = { input: { readOnly: true }, inputLabel: { shrink: true } };
  const statusLabel = loaded ? (isCanceled ? '확정 취소' : '확정') : isDraft ? '신규 작성' : '';
  const currencyLabel = currencies.length > 1 ? `혼합 (${currencies.join(', ')})` : (loaded?.currencyCode ?? currencies[0] ?? '');
  const hasRows = baselineRows.length > 0;

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      <Box
        role="region"
        aria-label="구매요청 확정 내용"
        aria-busy={busy}
        sx={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 2,
          minHeight: 0,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          px: { xs: 1, sm: 2 },
          pt: 1,
          pb: 2,
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
        {!loaded && !hasRows ? (
          <Alert severity="info">요청 불러오기로 확정할 구매요청 품목을 고르거나, 확정 불러오기로 기존 확정을 여세요.</Alert>
        ) : null}
        {isDraft && currencies.length > 1 ? (
          <Alert severity="warning">{currencyMixMessage(currencies)}</Alert>
        ) : null}
        {isActiveConfirm ? (
          <Alert severity="info">확정된 건입니다. 발주대기 마감을 변경하거나 확정번호 전체를 취소할 수 있습니다.</Alert>
        ) : null}
        {isCanceled ? (
          <Alert severity="info">확정 취소된 건입니다. 이 확정의 품목은 미확정으로 돌아갔습니다.</Alert>
        ) : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            구매요청확정 기본정보
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
            }}
          >
            <TextField
              label="확정번호"
              size="small"
              value={loaded?.confirmNo ?? (hasRows ? '확정 시 자동 채번' : '')}
              slotProps={readOnlyField}
            />
            <FormDateField
              label="확정일"
              value={confirmDt}
              disabled={!confirmEditable}
              onChange={(value) => { markDateTouched(); setConfirmDt(value); clearMessages(); }}
            />
            <TextField label="확정자" size="small" value={loaded?.confirmerName ?? ''} slotProps={readOnlyField} />
            <TextField label="상태" size="small" value={statusLabel} slotProps={readOnlyField} />
            <TextField
              label="요청 건수 / 품목 수"
              size="small"
              value={hasRows ? `${requestCount} / ${activeRows.length}` : ''}
              slotProps={readOnlyField}
            />
            <TextField label="통화" size="small" value={currencyLabel} slotProps={readOnlyField} />
            <TextField
              label="합계금액"
              size="small"
              value={hasRows || loaded ? formatAmount(loaded && !hasRows ? Number(loaded.totalAmt ?? 0) : totalAmt) : ''}
              slotProps={{ ...readOnlyField, htmlInput: { style: { textAlign: 'right' } } }}
            />
            <TextField
              label="확정 비고"
              size="small"
              value={remark}
              onChange={(event) => { setRemark(event.target.value); clearMessages(); }}
              disabled={!confirmEditable}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 500 } }}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>구매요청 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                {confirmEditable && hasRows
                  ? '모든 행에 확정수량·확정납기일·입고창고·발주구분·구매처를 입력하세요. 같은 통화 품목끼리만 확정할 수 있습니다.'
                  : closeEditable
                    ? '발주하지 않을 품목은 발주대기 마감을 체크하고 저장하세요.'
                    : '구매요청 품목 내역입니다.'}
              </Typography>
            </Box>
            {confirmEditable && hasRows ? (
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
              ariaLabel="구매요청 확정 상세 목록"
              storageKey="materials-purchase-request-confirm-detail-grid-v2"
              rows={baselineRows}
              columns={columns}
              rowKey="rowId"
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              showCheckbox={confirmEditable && hasRows}
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
      <PurchaseRequestSourcePicker
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onSelect={loadRequests}
      />
      <PurchaseConfirmPicker
        open={confirmPickerOpen}
        onClose={() => setConfirmPickerOpen(false)}
        onSelect={selectConfirm}
      />
      <MasterPickerDialog
        open={supplierTarget !== null}
        label="구매처"
        search={searchSuppliers}
        onClose={() => setSupplierTarget(null)}
        onChange={(option) => void selectSupplier(option)}
      />
      <ConfirmRouteLeaveGuard when={hasUnsavedChanges} />
      {dialog}
    </Box>
  );
}

function ConfirmRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장하지 않은 확정 입력 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
