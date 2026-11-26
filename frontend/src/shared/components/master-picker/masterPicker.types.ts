export type MasterPickerOption = {
  id: number;
  code: string;
  name: string;
  details?: { label: string; value: string }[];
  /** 항목 아래 새 줄에 `라벨 done/total` 로 표시한다. done은 녹색, 미완료가 남으면 합계는 주황색. */
  progress?: { label: string; done: number; total: number };
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
