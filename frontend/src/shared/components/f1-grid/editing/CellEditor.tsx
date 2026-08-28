import type { KeyboardEvent } from 'react';
import type { F1GridColumn, F1GridOption } from '../types/grid.types';
import { DateEditor } from './DateEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { TextEditor } from './TextEditor';
import { CodePickerEditor } from './CodePickerEditor';
import { AutocompleteEditor } from './AutocompleteEditor';
import { CurrencyEditor } from './CurrencyEditor';
import { DateTimeEditor } from './DateTimeEditor';
import { DecimalEditor } from './DecimalEditor';
import { TimeEditor } from './TimeEditor';

type CellEditorProps<T extends object> = {
  column: F1GridColumn<T>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: F1GridOption['value']) => void;
  onCodePick: () => void;
};

export function CellEditor<T extends object>({
  column,
  value,
  onChange,
  onKeyDown,
  onSelectChange,
  onCodePick,
}: CellEditorProps<T>) {
  if (column.type === 'code') return <CodePickerEditor onPick={onCodePick} />;
  if (column.type === 'autocomplete')
    return (
      <AutocompleteEditor
        value={value}
        options={column.options ?? []}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onSelectChange={onSelectChange}
      />
    );
  if (column.type === 'currency')
    return (
      <CurrencyEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'decimal')
    return (
      <DecimalEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'datetime')
    return (
      <DateTimeEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'time')
    return (
      <TimeEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'date')
    return (
      <DateEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'number')
    return (
      <NumberEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />
    );
  if (column.type === 'select')
    return (
      <SelectEditor
        value={value}
        options={column.options ?? []}
        onChange={onSelectChange}
      />
    );
  return <TextEditor value={value} onChange={onChange} onKeyDown={onKeyDown} />;
}
