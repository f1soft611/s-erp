import type {
  F1GridChanges,
  F1GridColumn,
} from '../../../../../shared/components/f1-grid';
import type { MasterPickerOption } from '../../../../../shared/components/master-picker/masterPicker.types';
import { roundGridNumber } from '../../../../../shared/components/f1-grid/utils/grid.utils';
import type { GridDecimalModuleRule, GridDecimalRule } from '../../../../../shared/services/gridDecimalPolicy.service';
import {
  decimalColumnOptions,
  getDecimalColumnContract,
  resolveDecimalColumn,
} from '../../../../../shared/services/decimalColumnContract';
import type {
  FormulaQuantityBasis,
  WorkStandardFormulaRow,
} from '../types/workStandard.types';
import { PROCESS_OPTIONS } from './workStandard.data';

export type OpenFormulaMaterialPicker = (
  applyPatch: (changes: Partial<WorkStandardFormulaRow>) => void,
) => void;

export type FormulaTotals = {
  inputQty: number;
  ratio: number;
  perPlateG: number;
};

export function createFormulaRow(): WorkStandardFormulaRow {
  return {
    rowId: `formula-new-${crypto.randomUUID()}`,
    processName: '',
    materialId: null,
    materialCode: '',
    materialName: '',
    spec: '',
    unit: '',
    inputQty: 0,
    ratio: 0,
    perPlateG: 0,
    lotInput: true,
    substitute: '',
    remark: '',
  };
}

export function duplicateFormulaRow(row: WorkStandardFormulaRow): WorkStandardFormulaRow {
  return { ...row, rowId: createFormulaRow().rowId };
}

function numericValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** 작업표준 배합 컬럼의 정책 규칙. 계약 문서 co.workStandard의 각 필드를 정책(decimal)으로 푼다. */
export type FormulaDecimalRules = {
  inputQty: GridDecimalRule;
  ratio: GridDecimalRule;
  perPlateG: GridDecimalRule;
};

export function resolveFormulaDecimalRules(policy: GridDecimalModuleRule): FormulaDecimalRules {
  const contract = getDecimalColumnContract('co.workStandard');
  return {
    inputQty: resolveDecimalColumn(contract.inputQty, policy),
    ratio: resolveDecimalColumn(contract.ratio, policy),
    perPlateG: resolveDecimalColumn(contract.perPlateG, policy),
  };
}

/** 정책 규칙이 있으면 그 규칙으로 반올림하고, 정책이 없으면 고정 자릿수 없이 원래 값을 쓴다. */
function roundByRule(value: number, rule?: GridDecimalRule): number {
  return rule ? roundGridNumber(value, rule.places, rule.rounding) : value;
}

export function calculateRatio(inputQty: number, totalQty: number, rule?: GridDecimalRule): number {
  return totalQty > 0 ? roundByRule((numericValue(inputQty) / totalQty) * 100, rule) : 0;
}

/** 투입량(kg)을 기준 생산량으로 나눈 1판당 투입량(g) */
export function calculatePerPlateGram(inputQty: number, baseQty: number, rule?: GridDecimalRule): number {
  return baseQty > 0 ? roundByRule((numericValue(inputQty) * 1000) / baseQty, rule) : 0;
}

export function calculateFormulaTotals(
  rows: WorkStandardFormulaRow[],
  baseQty: number,
  rules?: FormulaDecimalRules,
): FormulaTotals {
  const inputQty = roundByRule(
    rows.reduce((sum, row) => sum + numericValue(row.inputQty), 0),
    rules?.inputQty,
  );
  return {
    inputQty,
    ratio: inputQty > 0 ? 100 : 0,
    perPlateG: calculatePerPlateGram(inputQty, baseQty, rules?.perPlateG),
  };
}

export function resolveActiveFormulaRows(
  baseRows: WorkStandardFormulaRow[],
  changes: F1GridChanges<WorkStandardFormulaRow>,
): WorkStandardFormulaRow[] {
  const deletedIds = new Set(changes.deletedRows.map((row) => row.rowId));
  const updatedById = new Map(changes.updatedRows.map((row) => [row.rowId, row]));
  return [
    ...baseRows
      .filter((row) => !deletedIds.has(row.rowId))
      .map((row) => updatedById.get(row.rowId) ?? row),
    ...changes.insertedRows.filter((row) => !deletedIds.has(row.rowId)),
  ];
}

type FormulaColumnOptions = {
  baseQty: number;
  totalQty: number;
  basis: FormulaQuantityBasis;
  disabled: boolean;
  onOpenMaterialPicker: OpenFormulaMaterialPicker;
  /** 정책에서 푼 규칙. 정책이 없으면 계산값을 반올림하지 않는다. */
  rules?: FormulaDecimalRules;
};

export function createFormulaColumns({
  baseQty,
  totalQty,
  basis,
  disabled,
  onOpenMaterialPicker,
  rules,
}: FormulaColumnOptions): F1GridColumn<WorkStandardFormulaRow>[] {
  const contract = getDecimalColumnContract('co.workStandard');
  const isBatchBasis = basis === 'batch';
  const baseLabel = baseQty > 0 ? `${baseQty}` : '-';

  return [
    {
      field: 'rowId',
      headerName: '순서',
      type: 'rownumber',
      width: 56,
      align: 'center',
      pinned: 'left',
      form: { hidden: true },
      search: { hidden: true },
    },
    {
      field: 'processName',
      headerName: '투입 공정',
      type: 'select',
      options: PROCESS_OPTIONS,
      width: 110,
      align: 'center',
      editable: !disabled,
    },
    {
      field: 'materialCode',
      headerName: '원료코드',
      type: 'code',
      width: 120,
      editable: !disabled,
      required: true,
      validate: (value) => (String(value ?? '').trim() ? true : '원료를 선택해 주세요.'),
      onValueChange: (_row, value) => {
        if (!isMasterPickerOption(value)) {
          throw new Error('원료 선택 항목을 확인해 주세요.');
        }
        return toFormulaMaterialPatch(value);
      },
      onOpenCodePicker: (_row, applyPatch) => {
        if (!disabled) onOpenMaterialPicker(applyPatch);
        return undefined;
      },
    },
    { field: 'materialName', headerName: '원료명', type: 'text', width: 200, editable: false },
    { field: 'spec', headerName: '규격', type: 'text', width: 80, editable: false },
    { field: 'unit', headerName: '단위', type: 'text', width: 64, align: 'center', editable: false },
    {
      field: 'inputQty',
      headerName: isBatchBasis ? `투입량 (${baseLabel}판)` : '투입량 (1판)',
      ...decimalColumnOptions(contract, 'inputQty'),
      width: 130,
      align: 'right',
      editable: !disabled && isBatchBasis,
      required: true,
      min: 0,
      getValue: isBatchBasis
        ? undefined
        : (row) => (baseQty > 0 ? roundByRule(numericValue(row.inputQty) / baseQty, rules?.inputQty) : 0),
      validate: (value) => (Number(value) > 0 ? true : '투입량은 0보다 커야 합니다.'),
    },
    {
      field: 'ratio',
      headerName: '배합비(%)',
      ...decimalColumnOptions(contract, 'ratio'),
      width: 100,
      align: 'right',
      editable: false,
      getValue: (row) => calculateRatio(row.inputQty, totalQty, rules?.ratio),
    },
    {
      field: 'perPlateG',
      headerName: '1판당(g)',
      ...decimalColumnOptions(contract, 'perPlateG'),
      width: 100,
      align: 'right',
      editable: false,
      getValue: (row) => calculatePerPlateGram(row.inputQty, baseQty, rules?.perPlateG),
    },
    {
      field: 'lotInput',
      headerName: 'LOT 투입',
      type: 'checkbox',
      width: 88,
      align: 'center',
      editable: !disabled,
    },
    { field: 'substitute', headerName: '대체 원료', type: 'text', width: 180, editable: !disabled },
    { field: 'remark', headerName: '비고', type: 'text', width: 160, editable: !disabled },
  ];
}

export function toFormulaMaterialPatch(
  option: MasterPickerOption,
): Partial<WorkStandardFormulaRow> {
  const detail = (label: string) =>
    option.details?.find((item) => item.label === label)?.value ?? '';
  return {
    materialId: option.id,
    materialCode: option.code,
    materialName: option.name,
    spec: detail('품목규격'),
    unit: detail('단위'),
  };
}

function isMasterPickerOption(value: unknown): value is MasterPickerOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}
