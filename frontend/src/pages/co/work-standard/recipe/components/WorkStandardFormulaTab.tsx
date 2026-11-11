import { useCallback, useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridRef,
  type F1GridRowId,
} from '../../../../../shared/components/f1-grid';
import { MaterialPickerDialog } from '../../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import {
  calculateFormulaTotals,
  createFormulaColumns,
  createFormulaRow,
  duplicateFormulaRow,
  resolveActiveFormulaRows,
  toFormulaMaterialPatch,
} from '../data/workStandardFormula';
import { searchWorkStandardMaterials } from '../services/workStandard.service';
import type {
  FormulaQuantityBasis,
  WorkStandardFormulaRow,
} from '../types/workStandard.types';

type Props = {
  rows: WorkStandardFormulaRow[];
  baseQty: number;
  disabled?: boolean;
  onRowCountChange?: (count: number) => void;
};

const EMPTY_CHANGES: F1GridChanges<WorkStandardFormulaRow> = {
  insertedRows: [],
  updatedRows: [],
  deletedRows: [],
};

export function WorkStandardFormulaTab({
  rows,
  baseQty,
  disabled = false,
  onRowCountChange,
}: Props) {
  const gridRef = useRef<F1GridRef<WorkStandardFormulaRow> | null>(null);
  const applyPatchRef = useRef<((changes: Partial<WorkStandardFormulaRow>) => void) | null>(null);
  const selectedRowIdRef = useRef<F1GridRowId | null>(null);
  const [changes, setChanges] = useState(EMPTY_CHANGES);
  const [selectedRowIds, setSelectedRowIds] = useState<F1GridRowId[]>([]);
  const [basis, setBasis] = useState<FormulaQuantityBasis>('batch');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeRows = useMemo(() => resolveActiveFormulaRows(rows, changes), [changes, rows]);
  const totals = useMemo(() => calculateFormulaTotals(activeRows, baseQty), [activeRows, baseQty]);

  const openMaterialPicker = useCallback(
    (applyPatch: (changes: Partial<WorkStandardFormulaRow>) => void) => {
      selectedRowIdRef.current = null;
      applyPatchRef.current = applyPatch;
      setPickerOpen(true);
    },
    [],
  );

  const closeMaterialPicker = useCallback(() => {
    selectedRowIdRef.current = null;
    applyPatchRef.current = null;
    setPickerOpen(false);
  }, []);

  const openSelectedMaterialPicker = useCallback(() => {
    const [selectedRow] = gridRef.current?.getSelectedRows() ?? [];
    if (!selectedRow) return;
    selectedRowIdRef.current = selectedRow.rowId;
    setPickerOpen(true);
  }, []);

  const selectMaterial = useCallback(
    (option: MasterPickerOption) => {
      const selectedRowId = selectedRowIdRef.current;
      if (selectedRowId !== null) {
        gridRef.current?.setCellValue(selectedRowId, 'materialCode', option);
      } else {
        applyPatchRef.current?.(toFormulaMaterialPatch(option));
      }
      closeMaterialPicker();
    },
    [closeMaterialPicker],
  );

  const columns = useMemo(
    () =>
      createFormulaColumns({
        baseQty,
        totalQty: totals.inputQty,
        basis,
        disabled,
        onOpenMaterialPicker: openMaterialPicker,
      }),
    [basis, baseQty, disabled, openMaterialPicker, totals.inputQty],
  );

  const handleChangesChange = useCallback(
    (next: F1GridChanges<WorkStandardFormulaRow>) => {
      setChanges(next);
      onRowCountChange?.(resolveActiveFormulaRows(rows, next).length);
    },
    [onRowCountChange, rows],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
      <Box
        data-testid="work-standard-formula-toolbar"
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          px: { xs: 1.5, sm: 2 },
          py: 1,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon fontSize="small" />}
          disabled={disabled}
          onClick={() => gridRef.current?.addRow()}
        >
          원료 추가
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SearchOutlinedIcon fontSize="small" />}
          disabled={disabled || selectedRowIds.length !== 1}
          onClick={openSelectedMaterialPicker}
        >
          원료 선택
        </Button>
        <RadioGroup
          row
          aria-label="투입량 기준"
          value={basis}
          onChange={(event) => setBasis(event.target.value as FormulaQuantityBasis)}
          sx={{ ml: { sm: 1 } }}
        >
          <FormControlLabel
            value="batch"
            control={<Radio size="small" />}
            label={`기준 생산량(${baseQty || '-'}판)`}
            slotProps={{ typography: { variant: 'body2' } }}
          />
          <FormControlLabel
            value="plate"
            control={<Radio size="small" />}
            label="1판 기준"
            slotProps={{ typography: { variant: 'body2' } }}
          />
        </RadioGroup>
        <Typography variant="caption" color="text.secondary" sx={{ ml: { md: 'auto' } }}>
          배합비(%)와 1판당(g)은 투입량 기준으로 자동 계산됩니다.
        </Typography>
      </Box>
      <Box sx={{ flex: '1 0 260px', minHeight: 260, minWidth: 0, overflow: 'hidden', px: 1 }}>
        <F1Grid
          ref={gridRef}
          ariaLabel="배합비 목록"
          storageKey="work-standard-recipe-formula-grid-v1"
          rows={rows}
          columns={columns}
          rowKey="rowId"
          createRow={createFormulaRow}
          createDuplicate={duplicateFormulaRow}
          onChangesChange={handleChangesChange}
          onSelectionChange={setSelectedRowIds}
          showCheckbox
          height="100%"
          minHeight={260}
          allowAddRowInContextMenu={!disabled}
          allowDuplicateRowInContextMenu={!disabled}
          allowDeleteRowInContextMenu={!disabled}
          disableContextMenu={disabled}
          canExportExcel={false}
        />
      </Box>
      <Box
        aria-label="배합비 합계"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        <FormulaSummary
          label={basis === 'batch' ? '투입량 합계(kg)' : '1판 투입량 합계(kg)'}
          value={basis === 'batch' || baseQty <= 0 ? totals.inputQty : totals.inputQty / baseQty}
          digits={3}
        />
        <FormulaSummary label="배합비 합계(%)" value={totals.ratio} digits={2} />
        <FormulaSummary label="1판당 합계(g)" value={totals.perPlateG} digits={1} />
      </Box>
      <MaterialPickerDialog
        open={pickerOpen && !disabled}
        search={searchWorkStandardMaterials}
        onClose={closeMaterialPicker}
        onChange={selectMaterial}
      />
    </Box>
  );
}

function FormulaSummary({ label, value, digits }: { label: string; value: number; digits: number }) {
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
      <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}
      </Typography>
    </Box>
  );
}
