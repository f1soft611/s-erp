import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import { MaterialPickerDialog } from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { F1GridChanges, F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { fetchMyProfile } from '../../../dashboard/services/profileSettings.service';
import { PurchaseRequestDetailGrid } from './components/PurchaseRequestDetailGrid';
import {
  materialPatch,
  type PurchaseMaterialOption,
  type PurchaseRequestDetailRow,
} from './data/purchaseRequestDetail';
import {
  buildPurchaseRequestPayload,
  createPurchaseRequest,
  deletePurchaseRequest,
  fetchPurchaseUseTypeOptions,
  getPurchaseRequest,
  purchaseRequestStatusLabel,
  searchPurchaseMaterials,
  toPurchaseRequestRows,
  updatePurchaseRequest,
  validatePurchaseRequestInput,
} from './services/purchaseRequest.service';
import type { PurchaseRequestItem, PurchaseRequestUseTypeOption } from './types/purchaseRequest.types';
import { useServerDateDefault } from '../../../../shared/hooks/useServerDateDefault';
import { FormDateField, normalizeFormDate } from '../../../../shared/components/FormDateField';

export type PurchaseRequestPageMode = 'create' | 'edit' | 'view';

export type PurchaseRequestEmbeddedActionState = {
  canSave: boolean;
  saveDisabled: boolean;
  canDelete: boolean;
  deleteDisabled: boolean;
  saving: boolean;
  save: () => void;
  remove: () => void;
};

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 'view'는 읽기 전용, 'edit'/'create'는 권한·상태에 따라 편집 */
  mode?: PurchaseRequestPageMode;
  /** 지정 시 마운트 후 해당 구매요청을 불러온다 */
  purchaseRequestId?: number;
  /** 현황 화면의 다이얼로그 안에서 쓸 때 페이지 헤더·신규 버튼·라우트 이탈 가드를 숨긴다 */
  embedded?: boolean;
  onSaved?: (item: PurchaseRequestItem) => void;
  onDeleted?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onEmbeddedActionsChange?: (state: PurchaseRequestEmbeddedActionState | null) => void;
};

const EDITABLE_STATUS = 'REQUESTED';

export function PurchaseRequestCreatePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  mode = 'create',
  purchaseRequestId,
  embedded = false,
  onSaved,
  onDeleted,
  onDirtyChange,
  onEmbeddedActionsChange,
}: Props) {
  const { confirm, dialog } = useCommonConfirmDialog();
  const isReadOnly = mode === 'view';
  const gridRef = useRef<F1GridRef<PurchaseRequestDetailRow>>(null);
  const savingRef = useRef(false);
  const selectedMaterialRowIdRef = useRef<string | null>(null);
  const materialApplyPatchRef = useRef<((changes: Partial<PurchaseRequestDetailRow>) => void) | null>(null);
  const gridValidationActiveRef = useRef(false);

  const [baseline, setBaseline] = useState({ requestDt: '', remark: '' });
  const [requestDt, setRequestDt] = useState(baseline.requestDt);
  const [remark, setRemark] = useState('');
  const [loginUser, setLoginUser] = useState({ name: '', departmentName: '' });
  const [useTypeOptions, setUseTypeOptions] = useState<PurchaseRequestUseTypeOption[]>([]);
  const [loaded, setLoaded] = useState<PurchaseRequestItem | null>(null);
  const [gridRows, setGridRows] = useState<PurchaseRequestDetailRow[]>([]);
  const [gridKey, setGridKey] = useState(0);
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
  const [totalQty, setTotalQty] = useState(0);
  const [hasDetailChanges, setHasDetailChanges] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(purchaseRequestId != null);
  const [isLocked, setIsLocked] = useState(false);
  const [validationMessages, setValidationMessages] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const canWrite = canCreate || canUpdate;
  const isStatusEditable = loaded === null || loaded.status === EDITABLE_STATUS;
  const hasPermissionForMode = loaded ? canUpdate : canCreate;
  const isEditable = !isReadOnly && !isLoading && !isSaving && !isLocked && isStatusEditable && hasPermissionForMode;
  const isDeletable = !isReadOnly && loaded !== null && !isSaving && !isLocked && isStatusEditable;

  const hasHeaderChanges = requestDt !== baseline.requestDt || remark.trim() !== baseline.remark.trim();
  const hasUnsavedChanges = !isLocked && (hasHeaderChanges || hasDetailChanges);
  useUnsavedChangesBeforeUnload(hasUnsavedChanges);

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    let active = true;
    fetchPurchaseUseTypeOptions()
      .then((options) => {
        if (active) setUseTypeOptions(options);
      })
      .catch(() => {
        if (active) setError('사용용도 공통코드를 불러오지 못했습니다.');
      });
    fetchMyProfile()
      .then((profile) => {
        if (active) {
          setLoginUser({ name: profile.name?.trim() ?? '', departmentName: profile.departmentName?.trim() ?? '' });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const applyForm = useCallback((header: { requestDt: string; remark: string }, rows: PurchaseRequestDetailRow[]) => {
    setRequestDt(header.requestDt);
    setRemark(header.remark);
    setBaseline(header);
    setGridRows(rows);
    setGridKey((key) => key + 1);
    setTotalQty(rows.reduce((sum, row) => sum + Number(row.requestQty || 0), 0));
    setHasDetailChanges(false);
    setSelectedRowIds([]);
    setValidationMessages([]);
    gridValidationActiveRef.current = false;
    selectedMaterialRowIdRef.current = null;
    materialApplyPatchRef.current = null;
    setPickerOpen(false);
  }, []);

  const applyLoaded = useCallback((item: PurchaseRequestItem) => {
    setLoaded(item);
    setIsLocked(false);
    applyForm({ requestDt: item.requestDt, remark: item.remark ?? '' }, toPurchaseRequestRows(item));
  }, [applyForm]);

  const { markTouched: markDateTouched, reload: reloadServerDate } = useServerDateDefault({
    enabled: purchaseRequestId == null,
    // 서버 날짜는 사용자의 변경이 아니므로 baseline도 함께 갱신해 변경사항으로 잡지 않는다.
    onDate: (date) => {
      setRequestDt(date);
      setBaseline((current) => ({ ...current, requestDt: date }));
    },
    onError: setError,
  });

  const resetToNew = useCallback(() => {
    setLoaded(null);
    setIsLocked(false);
    setError('');
    applyForm({ requestDt: '', remark: '' }, []);
    void reloadServerDate();
  }, [applyForm, reloadServerDate]);

  useEffect(() => {
    if (purchaseRequestId == null) return;
    let active = true;
    setIsLoading(true);
    getPurchaseRequest(purchaseRequestId)
      .then((item) => {
        if (active) applyLoaded(item);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setIsLocked(true);
        setError(loadError instanceof Error ? loadError.message : '구매요청을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyLoaded, purchaseRequestId]);

  const handleChangesChange = useCallback((changes: F1GridChanges<PurchaseRequestDetailRow>) => {
    const deleted = new Set(changes.deletedRows.map((row) => row.rowId));
    const updated = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
    const active = [
      ...gridRows.filter((row) => !deleted.has(row.rowId)).map((row) => updated.get(row.rowId) ?? row),
      ...changes.insertedRows.filter((row) => !deleted.has(row.rowId)),
    ];
    setTotalQty(active.reduce((sum, row) => sum + Number(row.requestQty || 0), 0));
    setHasDetailChanges(
      changes.insertedRows.length > 0 || changes.updatedRows.length > 0 || changes.deletedRows.length > 0,
    );
    setValidationMessages([]);
    if (gridValidationActiveRef.current) {
      gridValidationActiveRef.current = !(gridRef.current?.validate() ?? true);
    }
  }, [gridRows]);

  const openMaterialPicker = useCallback((applyPatch: (changes: Partial<PurchaseRequestDetailRow>) => void) => {
    selectedMaterialRowIdRef.current = null;
    materialApplyPatchRef.current = applyPatch;
    setPickerOpen(true);
  }, []);

  const closeMaterialPicker = useCallback(() => {
    selectedMaterialRowIdRef.current = null;
    materialApplyPatchRef.current = null;
    setPickerOpen(false);
  }, []);

  const openSelectedMaterialPicker = useCallback(() => {
    const [selectedRow] = gridRef.current?.getSelectedRows() ?? [];
    if (!selectedRow) return;
    selectedMaterialRowIdRef.current = selectedRow.rowId;
    setPickerOpen(true);
  }, []);

  const selectMaterial = useCallback((option: MasterPickerOption) => {
    const selectedRowId = selectedMaterialRowIdRef.current;
    if (selectedRowId !== null) {
      gridRef.current?.setCellValue(selectedRowId, 'materialCode', option);
    } else {
      materialApplyPatchRef.current?.(materialPatch(option as PurchaseMaterialOption));
    }
    closeMaterialPicker();
    setValidationMessages([]);
  }, [closeMaterialPicker]);

  const handleSave = useCallback(async () => {
    if (savingRef.current || !isEditable) return;
    if (loaded && !hasUnsavedChanges) return;

    const details = gridRef.current?.getActiveRows() ?? [];
    const dateCheck = normalizeFormDate(requestDt);
    if (dateCheck.date && dateCheck.date !== requestDt) setRequestDt(dateCheck.date);
    const input = { requestDt: dateCheck.date, remark, details };
    const { messages: inputMessages } = validatePurchaseRequestInput(input);
    const messages = dateCheck.invalid ? ['올바른 요청일을 입력해 주세요.'] : inputMessages;
    const isGridValid = gridRef.current?.validate() ?? true;
    gridValidationActiveRef.current = !isGridValid;
    setValidationMessages(messages);
    setError('');
    if (messages.length > 0 || !isGridValid) return;

    savingRef.current = true;
    setIsSaving(true);
    setNotice('');
    try {
      const payload = buildPurchaseRequestPayload(input);
      const saved = loaded
        ? await updatePurchaseRequest(loaded.purchaseRequestId, payload)
        : await createPurchaseRequest(payload);
      applyLoaded(saved);
      setNotice(`구매요청이 ${loaded ? '수정' : '저장'}되었습니다. 구매요청번호: ${saved.requestNo}`);
      onSaved?.(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '구매요청 저장 중 오류가 발생했습니다.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [applyLoaded, hasUnsavedChanges, isEditable, loaded, onSaved, remark, requestDt]);

  const handleDelete = useCallback(() => {
    if (savingRef.current || !loaded || !isDeletable) return;
    setDeleteConfirmOpen(true);
  }, [isDeletable, loaded]);

  const confirmDelete = useCallback(async () => {
    setDeleteConfirmOpen(false);
    if (savingRef.current || !loaded || !isDeletable) return;
    savingRef.current = true;
    setIsSaving(true);
    setNotice('');
    setError('');
    try {
      await deletePurchaseRequest(loaded.purchaseRequestId);
      resetToNew();
      setNotice(`구매요청이 삭제되었습니다. 구매요청번호: ${loaded.requestNo}`);
      onDeleted?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '구매요청 삭제 중 오류가 발생했습니다.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [isDeletable, loaded, onDeleted, resetToNew]);

  const handleNew = useCallback(async () => {
    if (savingRef.current) return;
    if (
      hasUnsavedChanges &&
      !(await confirm({
        description: '저장되지 않은 구매요청 내용이 있습니다. 신규로 초기화하면 입력 내용이 사라집니다. 계속하시겠습니까?',
      }))
    ) {
      return;
    }
    resetToNew();
    setNotice('');
  }, [confirm, hasUnsavedChanges, resetToNew]);

  const saveDisabled = isSaving || !isEditable || (loaded !== null && !hasUnsavedChanges);
  const deleteDisabled = isSaving || !isDeletable;

  const actions = useMemo<PermissionActionGroupDefinition[]>(() => [
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
          disabled: saveDisabled,
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
          disabled: deleteDisabled,
          onClick: handleDelete,
        },
      ],
    },
  ], [canDelete, canWrite, deleteDisabled, embedded, handleDelete, handleNew, handleSave, isReadOnly, isSaving, saveDisabled]);

  useEffect(() => {
    if (!embedded || !onEmbeddedActionsChange) return;
    onEmbeddedActionsChange({
      canSave: canWrite && !isReadOnly,
      saveDisabled,
      canDelete: canDelete && !isReadOnly,
      deleteDisabled,
      saving: isSaving,
      save: () => void handleSave(),
      remove: handleDelete,
    });
  }, [canDelete, canWrite, deleteDisabled, embedded, handleDelete, handleSave, isReadOnly, isSaving, onEmbeddedActionsChange, saveDisabled]);

  useEffect(() => () => {
    onEmbeddedActionsChange?.(null);
  }, [onEmbeddedActionsChange]);

  const requesterName = loaded ? (loaded.requesterName ?? '') : loginUser.name;
  const requestDeptName = loaded ? (loaded.requestDeptName ?? '') : loginUser.departmentName;
  const statusLabel = purchaseRequestStatusLabel(loaded?.status ?? EDITABLE_STATUS);

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
        aria-label="구매요청 입력 내용"
        aria-busy={isSaving || isLoading}
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
        {loaded && !isStatusEditable ? (
          <Alert severity="info">확정된 구매요청은 수정할 수 없습니다.</Alert>
        ) : null}
        {notice && <Alert severity="success">{notice}</Alert>}
        <PageMessageArea message={error} onClose={() => setError('')} severity="error" compact />
        <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, borderRadius: 1 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            구매요청 기본정보
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
              label="구매요청번호"
              size="small"
              value={loaded?.requestNo ?? '저장 시 자동 채번'}
              slotProps={{ input: { readOnly: true } }}
            />
            <FormDateField
              label="요청일"
              value={requestDt}
              disabled={!isEditable}
              onChange={(value) => { markDateTouched(); setRequestDt(value); setValidationMessages([]); }}
            />
            <TextField
              label="요청자"
              size="small"
              value={requesterName}
              slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
            />
            <TextField
              label="요청부서"
              size="small"
              value={requestDeptName}
              slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }}
            />
            <TextField
              label="상태"
              size="small"
              value={statusLabel}
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
                setValidationMessages([]);
              }}
              disabled={!isEditable}
              slotProps={{ htmlInput: { maxLength: 500 } }}
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
                구매요청 상세
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isEditable
                  ? '행을 추가해 품목을 선택하세요. 마우스 오른쪽 버튼으로 행 복사·삭제를 할 수 있습니다.'
                  : '구매요청 품목 내역입니다.'}
              </Typography>
            </Box>
            {isEditable ? (
              <Box
                data-testid="purchase-request-detail-toolbar"
                sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => gridRef.current?.addRow()}
                >
                  상세 행 추가
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SearchOutlinedIcon fontSize="small" />}
                  disabled={selectedRowIds.length !== 1}
                  onClick={openSelectedMaterialPicker}
                >
                  품목 선택
                </Button>
              </Box>
            ) : null}
          </Box>
          <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1 }}>
            <PurchaseRequestDetailGrid
              key={gridKey}
              gridRef={gridRef}
              rows={gridRows}
              useTypeOptions={useTypeOptions}
              onChangesChange={handleChangesChange}
              onSelectionChange={setSelectedRowIds}
              onOpenMaterialPicker={openMaterialPicker}
              disabled={!isEditable}
            />
          </Box>
          <Box
            aria-label="구매요청 수량 합계"
            sx={{ display: 'flex', justifyContent: 'flex-end', p: { xs: 1.5, sm: 2 } }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
              }}
            >
              <Typography variant="body2" color="text.secondary">요청수량 합계</Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {totalQty.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
      <MaterialPickerDialog
        open={pickerOpen && isEditable}
        search={searchPurchaseMaterials}
        onClose={closeMaterialPicker}
        onChange={selectMaterial}
      />
      {embedded ? null : <PurchaseRequestRouteLeaveGuard when={hasUnsavedChanges} />}
      <UnsavedChangesConfirmDialog
        open={deleteConfirmOpen}
        title="구매요청 삭제"
        dialogTitleId="purchase-request-delete-dialog-title"
        description={`구매요청번호 ${loaded?.requestNo ?? ''} 을(를) 삭제하시겠습니까? 삭제한 구매요청은 되돌릴 수 없습니다.`}
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

function PurchaseRequestRouteLeaveGuard({ when }: { when: boolean }) {
  const blocker = useBlocker(when);
  return (
    <UnsavedChangesConfirmDialog
      open={blocker.state === 'blocked'}
      description="저장되지 않은 구매요청 내용이 있습니다. 이동하면 입력 내용이 사라집니다. 이동하시겠습니까?"
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
