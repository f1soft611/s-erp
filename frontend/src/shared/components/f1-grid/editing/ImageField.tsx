import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';

type Props = {
  label: string;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string) => void;
  cell?: boolean;
};

export function ImageField({ label, value, disabled = false, onChange, cell = false }: Props) {
  const [error, setError] = useState('');
  const image = typeof value === 'string' ? value : '';
  const fileInput = (
    <input hidden type="file" aria-label={`${label} 파일`} accept="image/png,image/jpeg"
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!['image/png', 'image/jpeg'].includes(file.type) || file.size === 0 || file.size > 512 * 1024) {
          setError('PNG/JPEG 이미지(512KB 이하)를 선택해 주세요.');
          return;
        }
        setError('');
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== 'string') return;
          const encoded = reader.result.slice(reader.result.indexOf(',') + 1);
          const signature = atob(encoded.slice(0, 12));
          const type = signature.startsWith('\x89PNG\r\n\x1a\n') ? 'image/png'
            : signature.startsWith('\xff\xd8\xff') ? 'image/jpeg' : file.type;
          onChange(`data:${type};base64,${encoded}`);
        };
        reader.onerror = () => setError('이미지를 읽지 못했습니다.');
        reader.readAsDataURL(file);
      }} />
  );

  if (cell) {
    const preview = image ? (
      <Box component="img" src={image} alt={label}
        sx={{ width: 60, height: 60, objectFit: 'contain' }} />
    ) : (
      <Box role="img" aria-label={`${label} 없음`}
        sx={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', bgcolor: 'action.hover' }}>
        <ImageOutlinedIcon />
      </Box>
    );
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {disabled ? preview : <Box component="label" sx={{ display: 'flex', cursor: 'pointer' }}>{preview}{fileInput}</Box>}
        {error ? <Typography role="alert" color="error" variant="caption">{error}</Typography> : null}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}
      onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      {image ? (
        <Box component="img" src={image} alt={label}
          sx={{ maxHeight: 24, maxWidth: 36, objectFit: 'contain' }} />
      ) : null}
      {!disabled ? (
        <>
          <Button size="small" component="label">
            선택
            {fileInput}
          </Button>
          {image ? <Button size="small" aria-label={`${label} 삭제`} onClick={() => onChange('')}>삭제</Button> : null}
        </>
      ) : null}
      {error ? <Typography role="alert" color="error" variant="caption">{error}</Typography> : null}
    </Box>
  );
}
