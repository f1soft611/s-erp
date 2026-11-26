import { memo } from 'react';
import { Box, alpha } from '@mui/material';
import { splitByHighlight } from '../utils/grid.utils';

type F1GridHighlightTextProps = {
  text: string;
  keyword?: string;
};

/** 검색어와 일치하는 글자를 빨간색 굵은 글자와 빨간 톤 배경으로 표시한다. 검색어가 없으면 텍스트를 그대로 렌더링한다. */
export const F1GridHighlightText = memo(function F1GridHighlightText({
  text,
  keyword,
}: F1GridHighlightTextProps) {
  if (!keyword) return <>{text}</>;
  return (
    <>
      {splitByHighlight(text, keyword).map((part, index) =>
        part.match ? (
          <Box
            key={index}
            component="span"
            data-f1-grid-highlight="true"
            sx={{
              color: 'error.main',
              fontWeight: 700,
              backgroundColor: (theme) => alpha(theme.palette.error.main, 0.22),
              borderRadius: '2px',
            }}
          >
            {part.text}
          </Box>
        ) : (
          part.text
        ),
      )}
    </>
  );
});
