export type MasterPickerOption = {
  id: number;
  code: string;
  name: string;
  details?: { label: string; value: string }[];
};

export type MasterPickerSearch = (
  keyword: string,
) => Promise<MasterPickerOption[]>;

export type MasterPickerProps = {
  label: string;
  value: MasterPickerOption | null;
  search: MasterPickerSearch;
  onChange: (value: MasterPickerOption) => void;
  triggerMode?: 'button' | 'icon';
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
};

type MasterPickerDialogCommonProps = {
  label: string;
  open: boolean;
  search: MasterPickerSearch;
  onClose: () => void;
};

export type MasterPickerDialogProps = MasterPickerDialogCommonProps &
  (
    | {
        multiple?: false;
        onChange: (value: MasterPickerOption) => void;
      }
    | {
        multiple: true;
        selectedValues: MasterPickerOption[];
        onApply: (values: MasterPickerOption[]) => void;
      }
  );

export type MasterPickerMultiSelectProps = {
  selectedValues: MasterPickerOption[];
  search: MasterPickerSearch;
  onApply: (values: MasterPickerOption[]) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
};
