import type { KeyboardEvent } from 'react';
import type { F1GridColumn, F1GridOption } from '../types/grid.types';
import { DateEditor } from './DateEditor';
import { NumberEditor } from './NumberEditor';
import { SelectEditor } from './SelectEditor';
import { TextEditor } from './TextEditor';

type CellEditorProps<T extends object> = {
  column: F1GridColumn<T>;
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onSelectChange: (value: F1GridOption['value']) => void;
};

export function CellEditor<T extends object>({
  column,
  value,
  onChange,
  onKeyDown,
  onSelectChange,
}: CellEditorProps<T>) {
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
