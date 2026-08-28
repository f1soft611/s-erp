import { Button } from '@mui/material';

type CodePickerEditorProps = {
  onPick: () => void;
};

export function CodePickerEditor({ onPick }: CodePickerEditorProps) {
  return (
    <Button size="small" onClick={onPick}>
      코드 선택
    </Button>
  );
}
