import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { F1Grid, type F1GridChanges, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { MaterialInspectionArrivalPicker } from './components/MaterialInspectionArrivalPicker';
import {
  calculateInspectQty,
  createMaterialInspectionColumns,
  type MaterialInspectionRow,
} from './data/materialInspectionColumns';
import {
  buildInspectionPayload,
  candidateToRow,
  cancelMaterialInspection,
  countRemovedRows,
  createMaterialInspection,
  detailToRow,
  getMaterialInspection,
  searchInspectionCandidates,
  updateMaterialInspection,
  validateInspectionInput,
} from './services/materialInspection.service';
import type { MaterialInspectionCandidate, MaterialInspectionItem } from './types/materialInspection.types';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField, normalizeFormDate } from '../../../../shared/components/FormDateField';

export type MaterialInspectionPageMode = 'create' | 'edit' | 'view';

export type MaterialInspectionEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canCancel: boolean;
  cancelDisabled: boolean;
  saving: boolean;
  save: () => void;
  cancelInspection: () => void;
};

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'는 저장된 검사 수정, 'create'는 검사 대기 가입고를 불러와 신규 등록 */
  mode?: MaterialInspectionPageMode;
  /** 지정 시 마운트 후 해당 검사를 불러온다 */
  materialInspectionId?: number;
  /** 현황 화면의 다이얼로그 안에서 쓸 때 페이지 헤더·불러오기 버튼·라우트 이탈 가드를 숨긴다 */
  embedded?: boolean;
  onSaved?: (item: MaterialInspectionItem) => void;
  onCanceled?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: MaterialInspectionEmbeddedActionState | null) => void;
};

function formatQty(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function MaterialInspectionCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  materialInspectionId,
  embedded = false,
  onSaved,
  onCanceled,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<MaterialInspectionRow>>(null);
  const busyRef = useRef(false);
  const gridValidationActiveRef = useRef(false);

  const [baselineRows, setBaselineRows] = useState<MaterialInspectionRow[]>([]);
  const [activeRows, setActiveRows] = useState<MaterialInspectionRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [inspectionDt, setInspectionDt] = useState('');
  const [remark, setRemark] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  /** 열린 저장 검사. null이면 신규 등록 */
  const [loaded, setLoaded] = useState<MaterialInspectionItem | null>(null);
  const [isLoading, setIsLoading] = useState(materialInspectionId != null);
  const [dirty, setDirty] = useState(false);
  /** 조회 조건과 무관한 전체 검사 대기 건수. 신규 등록 화면의 안내에 쓴다(null이면 아직 모름). */
  const [waitingTotal, setWaitingTotal] = useState<number | null>(null);

  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const isReadOnly = mode === 'view' || loaded?.useAt === 'N';
  const editable = canUpdate && !busy && !isLoading && !isReadOnly;
  const hasRows = baselineRows.length > 0;
  const hasUnsavedChanges = loaded ? dirty : hasRows;
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  const totals = useMemo(() => activeRows.reduce(
    (sum, row) => ({
      inspectQty: sum.inspectQty + calculateInspectQty(row.passQty, row.failQty),
      passQty: sum.passQty + (Number(row.passQty) || 0),
      failQty: sum.failQty + (Number(row.failQty) || 0),
    }),
    { inspectQty: 0, passQty: 0, failQty: 0 },
  ), [activeRows]);

  const refreshWaitingTotal = useCallback(() => {
    searchInspectionCandidates({})
      .then((result) => setWaitingTotal(result.total))
      .catch(() => setWaitingTotal(null));
  }, []);

  useEffect(() => {
    if (materialInspectionId != null || mode !== 'create') return;
    refreshWaitingTotal();
  }, [materialInspectionId, mode, refreshWaitingTotal]);

  const resetGrid = useCallback((rows: MaterialInspectionRow[]) => {
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

  /** 저장된 검사를 화면 상태로 옮긴다(조회·수정·저장 후 다시 채우기). */
  const applyLoaded = useCallback((item: MaterialInspectionItem) => {
    setLoaded(item);
    setInspectionDt(item.inspectionDt);
    setRemark(item.remark ?? '');
    setDirty(false);
    resetGrid((item.details ?? []).map(detailToRow));
  }, [resetGrid]);

  useEffect(() => {
    if (materialInspectionId == null) return undefined;
    let active = true;
    setIsLoading(true);
    getMaterialInspection(materialInspectionId)
      .then((item) => { if (active) applyLoaded(item); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : '검사를 불러오지 못했습니다.');
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [applyLoaded, materialInspectionId]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: materialInspectionId == null,
    onDate: setInspectionDt,
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setDirty(false);
    setInspectionDt('');
    void reloadServerDate();
    setRemark('');
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

  /** 검사 대기 가입고 행을 담는다. 이미 담긴 행은 건너뛰고, 합격량은 검사 대기량(전량 합격)을 기본값으로 쓴다. */
  const loadCandidates = useCallback((candidates: MaterialInspectionCandidate[]) => {
    setPickerOpen(false);
    const existing = currentRows();
    const existingIds = new Set(existing.map((row) => row.materialArrivalDetailId));
    const added = candidates
      .filter((candidate) => !existingIds.has(candidate.materialArrivalDetailId))
      .map(candidateToRow);
    resetGrid([...existing, ...added]);
    setNotice('');
    setError('');
  }, [currentRows, resetGrid]);

  /** 합격분이 입고된 행(있으면 입고번호). 검사에서 빼거나 합격량을 줄이거나 검사를 취소할 수 없다. */
  const receivedNos = useMemo(
    () => [...new Set(activeRows.filter((row) => row.receivedQty > 0).map((row) => row.receiptNo || '입고'))],
    [activeRows],
  );
  const hasReceived = receivedNos.length > 0;

  /** 체크한 품목 행만 뺀다. 입력한 값은 남은 행에 그대로 유지하고, 합격분이 입고된 행은 뺄 수 없다. */
  const removeSelectedRows = useCallback(() => {
    const selected = new Set(selectedRowIds.map(String));
    if (selected.size === 0) return;
    const rows = currentRows();
    const lockedRows = rows.filter((row) => selected.has(row.rowId) && row.receivedQty > 0);
    if (lockedRows.length > 0) {
      const receipts = [...new Set(lockedRows.map((row) => row.receiptNo).filter(Boolean))].join(', ');
      setError(`입고된 합격분이 있는 품목 ${lockedRows.length}건은 검사에서 뺄 수 없습니다.${receipts ? ` 입고 ${receipts}에서 처리해 주세요.` : ''}`);
    }
    const removable = new Set(rows.filter((row) => selected.has(row.rowId) && !(row.receivedQty > 0)).map((row) => row.rowId));
    if (removable.size === 0) return;
    setDirty(true);
    resetGrid(rows.filter((row) => !removable.has(row.rowId)));
  }, [currentRows, resetGrid, selectedRowIds]);

  const handleChangesChange = useCallback((changes: F1GridChanges<MaterialInspectionRow>) => {
    const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
    if (updated.size > 0) setDirty(true);
    setActiveRows(baselineRows.map((row) => updated.get(row.rowId) ?? row));
    setValidationMessages([]);
    if (gridValidationActiveRef.current) {
      gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
    }
  }, [baselineRows]);

  const handleSave = useCallback(async () => {
    if (!editable) return;
    const rows = currentRows();
    const dateCheck = normalizeFormDate(inspectionDt);
    if (dateCheck.date && dateCheck.date !== inspectionDt) setInspectionDt(dateCheck.date);
    const messages = dateCheck.invalid
      ? ['올바른 검사일을 입력해 주세요.']
      : loaded && rows.length === 0
        ? ['모든 행을 뺄 수 없습니다. 검사 취소를 사용해 주세요.']
        : validateInspectionInput({ inspectionDt: dateCheck.date }, rows);
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    setValidationMessages(messages);
    if (messages.length > 0 || !isGridValid) return;
    if (loaded) {
      const removed = countRemovedRows(loaded.details ?? [], rows);
      if (removed > 0 && !(await confirm({
        description: `빠지는 행 ${removed}건의 검사 기록은 이력으로 남지 않고 삭제되며, 해당 가입고 행은 다시 수정·삭제할 수 있고 검사 대기량이 복구됩니다. 저장하시겠습니까?`,
      }))) return;
    }
    const payload = buildInspectionPayload(
      { inspectionDt: dateCheck.date, remark, inspectorId: loaded?.inspectorId ?? null },
      rows,
    );
    void runBusy(async () => {
      if (loaded) {
        const saved = await updateMaterialInspection(loaded.materialInspectionId, payload);
        applyLoaded(saved);
        setNotice(`검사를 수정했습니다. 검사번호: ${saved.inspectionNo}`);
        onSaved?.(saved);
        return;
      }
      const saved = await createMaterialInspection(payload);
      resetToNew();
      refreshWaitingTotal();
      setNotice(`검사를 등록했습니다. 검사번호: ${saved.inspectionNo}`);
      onSaved?.(saved);
    });
  }, [applyLoaded, confirm, currentRows, editable, inspectionDt, loaded, onSaved, refreshWaitingTotal, remark,
    resetToNew, runBusy]);

  /** 검사 전체를 취소한다. 취소하면 가입고 행의 잠금과 검사 대기량이 복구된다. */
  const handleCancelInspection = useCallback(async () => {
    if (!loaded || !editable) return;
    if (!(await confirm({
      description: `검사번호 ${loaded.inspectionNo}를 취소하시겠습니까? 취소하면 해당 가입고 행의 수정·삭제가 다시 가능해지고 검사 대기량이 복구됩니다.`,
    }))) return;
    void runBusy(async () => {
      await cancelMaterialInspection(loaded.materialInspectionId);
      setDirty(false);
      setNotice(`검사를 취소했습니다. 검사번호: ${loaded.inspectionNo}`);
      onCanceled?.();
    });
  }, [confirm, editable, loaded, onCanceled, runBusy]);

  const isEditing = loaded !== null;
  const saveDisabled = !editable || (isEditing ? !dirty : !hasRows);
  const cancelDisabled = !editable || !isEditing || hasReceived;

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
    {
      key: 'load',
      actions: [
        { label: '신규', icon: NoteAddOutlinedIcon, visible: !isEditing, disabled: busy, onClick: () => void handleNew() },
        {
          label: '가입고 불러오기', icon: FactCheckOutlinedIcon, visible: canUpdate && !isEditing,
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
      cancelInspection: () => void handleCancelInspection(),
    });
  }, [busy, canUpdate, cancelDisabled, embedded, handleCancelInspection, handleSave, isEditing, isReadOnly,
    onEmbeddedActionsChange, saveDisabled]);

  useEffect(() => () => {
    onEmbeddedActionsChange?.(null);
  }, [onEmbeddedActionsChange]);

  const columns = useMemo(() => createMaterialInspectionColumns({ editable }), [editable]);
  const excludeIds = useMemo(() => activeRows.map((row) => row.materialArrivalDetailId), [activeRows]);

  const readOnlyField = { input: { readOnly: true }, inputLabel: { shrink: true } };
  const qtyField = { ...readOnlyField, htmlInput: { style: { textAlign: 'right' } } };

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
        aria-label="자재수입검사 등록 내용"
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
          <Alert severity="info">
            {waitingTotal === null
              ? '가입고 불러오기로 검사할 품목을 담으세요. 여러 가입고 품목을 담으면 하나의 검사번호로 묶입니다.'
              : waitingTotal > 0
                ? `검사 대기 ${waitingTotal}건이 있습니다. 가입고 불러오기로 검사할 품목을 담으세요. 여러 가입고 품목을 담으면 하나의 검사번호로 묶입니다.`
                : '검사 대기 중인 가입고 품목이 없습니다.'}
          </Alert>
        ) : null}
        {isEditing && loaded?.useAt !== 'N' ? (
          <Alert severity="info">
            검사량은 검사 대기량(가입고량에서 다른 검사를 뺀 수량)을 넘을 수 없습니다. 검사 취소 또는 행 빼기를 하면 해당 가입고 행의 수정·삭제가 다시 가능해집니다.
          </Alert>
        ) : null}
        {isEditing && loaded?.useAt !== 'N' && hasReceived ? (
          <Alert severity="warning">
            {`합격분이 입고된 품목이 있습니다(${receivedNos.map((no) => (no === '입고' ? no : `입고 ${no}`)).join(', ')}). 해당 품목은 검사에서 뺄 수 없고 합격량을 입고된 수량보다 줄일 수 없으며 검사 취소도 할 수 없습니다. 먼저 입고를 취소해 주세요. 불합격량·비고는 수정할 수 있습니다.`}
          </Alert>
        ) : null}
        {loaded?.useAt === 'N' ? (
          <Alert severity="info">취소된 검사입니다. 조회만 할 수 있습니다.</Alert>
        ) : null}
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>검사 기본정보</Typography>
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
            <TextField label="검사번호" size="small" value={loaded?.inspectionNo ?? ''} slotProps={readOnlyField} />
            <FormDateField
              label="검사일"
              value={inspectionDt}
              disabled={!editable}
              onChange={(value) => { markDateTouched(); setInspectionDt(value); setDirty(true); setValidationMessages([]); }}
            />
            <TextField
              label="검사자"
              size="small"
              value={loaded ? (loaded.inspectorName ?? '') : '로그인 사용자'}
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
              label="검사량 합계"
              size="small"
              value={hasRows ? formatQty(totals.inspectQty) : ''}
              slotProps={qtyField}
            />
            <TextField
              label="합격량 합계"
              size="small"
              value={hasRows ? formatQty(totals.passQty) : ''}
              slotProps={qtyField}
            />
            <TextField
              label="불합격량 합계"
              size="small"
              value={hasRows ? formatQty(totals.failQty) : ''}
              slotProps={qtyField}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>검사 상세</Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditing
                  ? (editable
                    ? '합격량·불합격량·비고를 고치거나 잘못 담긴 행을 체크해 뺀 뒤 저장하세요. 모든 행을 빼려면 검사 취소를 쓰세요.'
                    : '검사 품목 내역입니다.')
                  : (hasRows
                    ? '합격량은 검사 대기량(전량 합격)으로 채워져 있습니다. 불합격이 있으면 수량을 고쳐 입력하세요.'
                    : '검사할 품목이 없습니다.')}
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
              ariaLabel="검사 상세 목록"
              storageKey={materialInspectionId == null
                ? 'quality-material-inspection-create-grid-v1'
                : 'quality-material-inspection-detail-grid-v1'}
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
      <MaterialInspectionArrivalPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={loadCandidates}
        excludeIds={excludeIds}
      />
      {embedded ? null : <InspectionRouteLeaveGuard when={hasUnsavedChanges} />}
      {dialog}
    </Box>
  );
}

function InspectionRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장하지 않은 검사 입력 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
