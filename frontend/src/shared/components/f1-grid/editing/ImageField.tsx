import { useState } from 'react';
import { Avatar, Box, Button, Typography } from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { COMPRESS_ACCEPTED_TYPES, resizeImageToDataUrl, type ImageCompressOptions } from './imageResize';

type Props = {
  label: string;
  value: unknown;
  disabled?: boolean;
  onChange: (value: string) => void;
  cell?: boolean;
  /** 'circle'이면 원형으로 표시한다(기본은 네모). */
  shape?: 'circle';
  /** 이미지가 없을 때 아이콘 대신 원 안에 표시할 글자(shape: 'circle'일 때만 사용). */
  fallbackText?: string;
  /** 지정하면 PNG·JPEG·WEBP를 받아 긴 변을 줄인 JPEG로 저장한다. */
  compress?: ImageCompressOptions;
  /** 행 폼에서 큰 미리보기(한 변 px)와 선택·삭제 버튼, 안내문을 나란히 보여 준다. */
  formSize?: number;
  /** `formSize` 레이아웃에서 버튼 아래에 보여 줄 안내문. */
  helperText?: string;
};

const CIRCLE_CELL_SIZE = 48;

export function ImageField({
  label, value, disabled = false, onChange, cell = false, shape, fallbackText, compress, formSize, helperText,
}: Props) {
  const [error, setError] = useState('');
  const image = typeof value === 'string' ? value : '';
  const circle = shape === 'circle';
  const accept = compress ? COMPRESS_ACCEPTED_TYPES.join(',') : 'image/png,image/jpeg';

  const readFile = (file: File) => {
    if (compress) {
      resizeImageToDataUrl(file, compress)
        .then((dataUrl) => { setError(''); onChange(dataUrl); })
        .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : '이미지를 처리하지 못했습니다.'));
      return;
    }
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
  };

  const fileInput = (
    <input hidden type="file" aria-label={`${label} 파일`} accept={accept}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) readFile(file);
      }} />
  );

  if (cell) {
    const size = circle ? CIRCLE_CELL_SIZE : 60;
    const preview = image ? (
      circle ? (
        <Box component="img" src={image} alt={label}
          sx={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <Box component="img" src={image} alt={label}
          sx={{ width: 60, height: 60, objectFit: 'contain' }} />
      )
    ) : circle ? (
      <Avatar role="img" aria-label={`${label} 없음`}
        sx={{ width: size, height: size, fontSize: 18, color: 'text.secondary', bgcolor: 'action.hover' }}>
        {fallbackText ? fallbackText : <ImageOutlinedIcon />}
      </Avatar>
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

  if (formSize) {
    const radius = circle ? '50%' : 2;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', minWidth: 0 }}
        onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
        {image ? (
          <Box component="img" src={image} alt={label}
            sx={{ width: formSize, height: formSize, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <Avatar variant={circle ? 'circular' : 'rounded'} role="img" aria-label={`${label} 없음`}
            sx={{ width: formSize, height: formSize, flexShrink: 0, fontSize: formSize / 3, bgcolor: 'action.hover', color: 'text.secondary' }}>
            {fallbackText ? fallbackText : <ImageOutlinedIcon sx={{ fontSize: formSize / 2 }} />}
          </Avatar>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
          {!disabled ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="outlined" component="label">
                {label} 선택
                {fileInput}
              </Button>
              <Button size="small" color="inherit" disabled={!image} aria-label={`${label} 삭제`} onClick={() => onChange('')}>삭제</Button>
            </Box>
          ) : null}
          {helperText ? <Typography variant="caption" color="text.secondary">{helperText}</Typography> : null}
          {error ? <Typography role="alert" color="error" variant="caption">{error}</Typography> : null}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}
      onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
      {image ? (
        circle ? (
          <Box component="img" src={image} alt={label}
            sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <Box component="img" src={image} alt={label}
            sx={{ maxHeight: 24, maxWidth: 36, objectFit: 'contain' }} />
        )
      ) : circle && fallbackText ? (
        <Avatar aria-hidden sx={{ width: 36, height: 36, fontSize: 15, color: 'text.secondary', bgcolor: 'action.hover' }}>
          {fallbackText}
        </Avatar>
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
