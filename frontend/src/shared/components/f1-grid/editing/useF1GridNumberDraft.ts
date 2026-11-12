import { useState } from 'react';
import { normalizeGridNumberInput } from '../utils/grid.utils';

export function useF1GridNumberDraft(value: string, decimalPlaces?: number) {
  const [draft, setDraft] = useState<{ raw: string; normalized: string } | null>(null);
  const normalizedValue = normalizeGridNumberInput(value, decimalPlaces);
  if (draft && (decimalPlaces !== 0 || draft.normalized !== normalizedValue)) {
    setDraft(null);
  }
  const displayedValue =
    decimalPlaces === 0 && draft?.normalized === normalizedValue
      ? draft.raw
      : normalizedValue;

  const normalizeInput = (raw: string) => {
    const normalized = normalizeGridNumberInput(raw, decimalPlaces);
    setDraft(decimalPlaces === 0 && raw.includes('.') ? { raw, normalized } : null);
    return normalized;
  };

  return {
    displayedValue,
    normalizeInput,
    clearDraft: () => setDraft(null),
  };
}
