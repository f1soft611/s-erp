import type { GridDecimalModuleRule, GridDecimalRule } from './gridDecimalPolicy.service';
import contracts from '../config/decimal-column-contract.json';

export type DecimalColumn = {
  type: 'number' | 'decimal' | 'currency';
} & Partial<GridDecimalRule>;

function validateColumn(column: DecimalColumn): void {
  if (!column || typeof column !== 'object'
      || !['number', 'decimal', 'currency'].includes(column.type)
      || Object.keys(column).some((key) => !['type', 'places', 'rounding', 'trailingZeros'].includes(key))
      || ('places' in column && (!Number.isInteger(column.places) || column.places! < 0 || column.places! > 6))
      || ('rounding' in column && !['UP', 'DOWN', 'HALF_UP'].includes(column.rounding!))
      || ('trailingZeros' in column && !['AUTO', 'FIXED'].includes(column.trailingZeros!))) {
    throw new Error('Invalid decimal column contract');
  }
}

export function getDecimalColumnContract(document: string): Readonly<Record<string, DecimalColumn>> {
  if (!Object.hasOwn(contracts, document)) throw new Error(`Unknown decimal contract: ${document}`);
  const contract = contracts[document as keyof typeof contracts] as Record<string, DecimalColumn>;
  Object.values(contract).forEach(validateColumn);
  return contract;
}

/** 계약 컬럼의 type과 예외(places/rounding/trailingZeros)를 F1-Grid 컬럼 옵션(type, decimal)으로 바꾼다. 계약에 없는 필드는 오류다. */
export function decimalColumnOptions(contract: Readonly<Record<string, DecimalColumn>>, field: string): { type: DecimalColumn['type']; decimal: Partial<GridDecimalRule> } {
  const column = contract[field];
  if (!column) throw new Error(`Unknown decimal contract field: ${field}`);
  validateColumn(column);
  const { type, ...decimal } = column;
  return { type, decimal };
}

export function resolveDecimalColumn(column: DecimalColumn, policy: GridDecimalModuleRule): GridDecimalRule {
  validateColumn(column);
  const base = 'places' in policy ? policy : policy[column.type];
  return {
    places: column.places ?? base.places,
    rounding: column.rounding ?? base.rounding,
    trailingZeros: column.trailingZeros ?? base.trailingZeros,
  };
}
