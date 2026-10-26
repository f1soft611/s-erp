export type MasterPickerOption = {
  id: number;
  code: string;
  name: string;
};

export type MasterPickerSearch = (
  keyword: string,
) => Promise<MasterPickerOption[]>;

export type MasterPickerProps = {
  label: string;
  value: MasterPickerOption | null;
  search: MasterPickerSearch;
  onChange: (value: MasterPickerOption) => void;
  disabled?: boolean;
};

export type MasterPickerDialogProps = {
  label: string;
  open: boolean;
  search: MasterPickerSearch;
  onClose: () => void;
  onChange: (value: MasterPickerOption) => void;
};
