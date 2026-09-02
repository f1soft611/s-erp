import { Button } from '@mui/material';

type CodePickerEditorProps = {
  onPick: () => void;
};

export function CodePickerEditor({ onPick }: CodePickerEditorProps) {
  return (
    <Button
      size="small"
      onClick={onPick}
      sx={{ height: '100%', minHeight: 0, py: 0 }}
    >
      코드 선택
    </Button>
  );
}
