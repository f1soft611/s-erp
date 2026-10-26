import { MasterPicker } from './MasterPicker';
import { MasterPickerDialog } from './MasterPickerDialog';
import type {
  MasterPickerOption,
  MasterPickerSearch,
} from './masterPicker.types';

type Props = {
  value: MasterPickerOption | null;
  search: MasterPickerSearch;
  onChange: (value: MasterPickerOption) => void;
  disabled?: boolean;
};

export function CustomerPicker(props: Props) {
  return <MasterPicker {...props} label="거래처" />;
}

export function MaterialPicker(props: Props) {
  return <MasterPicker {...props} label="품목" />;
}

type DialogProps = {
  open: boolean;
  search: MasterPickerSearch;
  onClose: () => void;
  onChange: (value: MasterPickerOption) => void;
};

export function MaterialPickerDialog(props: DialogProps) {
  return <MasterPickerDialog {...props} label="품목" />;
}
