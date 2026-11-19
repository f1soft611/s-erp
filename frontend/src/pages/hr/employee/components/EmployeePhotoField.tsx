import { Alert, Avatar, Box, Button, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { resizePhotoToDataUrl } from '../data/employeePhoto';

type Props = {
  name: string;
  /** 지금 보여 줄 사진(새로 고른 사진 또는 저장된 사진) */
  value: string;
  disabled?: boolean;
  /** 새 사진(데이터 URL) 또는 삭제를 뜻하는 빈 문자열 */
  onChange: (photo: string) => void;
};

/** 사원 사진 선택·삭제. 선택한 이미지는 브라우저에서 긴 변 320px JPEG로 줄여 올린다. */
export function EmployeePhotoField({ name, value, disabled = false, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      onChange(await resizePhotoToDataUrl(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '사진을 처리하지 못했습니다.');
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Avatar src={value || undefined} alt={`${name || '사원'} 사진`} variant="rounded" sx={{ width: 96, height: 96 }}>
        {name.slice(0, 1)}
      </Avatar>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" disabled={disabled} onClick={() => inputRef.current?.click()}>
            사진 선택
          </Button>
          <Button size="small" variant="text" color="inherit" disabled={disabled || !value} onClick={() => onChange('')}>
            삭제
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          PNG·JPEG·WEBP, 선택하면 자동으로 줄여서 저장합니다. 계정이 있으면 내 정보 관리의 프로필 이미지도 같이 바뀝니다.
        </Typography>
        {error ? <Alert severity="error" role="alert">{error}</Alert> : null}
      </Box>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept="image/png,image/jpeg,image/webp"
        aria-label="사원 사진 파일"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </Box>
  );
}
