import { Box } from '@mui/material';
import type { ReactNode } from 'react';

type ContentSplitLayoutProps = {
  left: ReactNode;
  right: ReactNode;
  rightTop?: number | string;
  /** 왼쪽 칸의 최대 폭(md 이상). 남는 폭은 오른쪽 칸이 가져간다. 지정하지 않으면 기존 비율(1.35fr : 0.75fr)을 쓴다. */
  leftMaxWidth?: number | string;
  /** leftMaxWidth를 쓸 때 오른쪽 칸이 줄어들 수 있는 최소 폭. */
  rightMinWidth?: number | string;
  /** 부모 높이를 채우고 왼쪽 칸을 세로로 늘린다(왼쪽 안의 보드가 남은 높이를 채울 때). */
  fillHeight?: boolean;
};

export function ContentSplitLayout({
  left,
  right,
  rightTop = 16,
  leftMaxWidth,
  rightMinWidth = 320,
  fillHeight = false,
}: ContentSplitLayoutProps) {
  const px = (value: number | string) => (typeof value === 'number' ? `${value}px` : value);
  return (
    <Box
      data-testid="view-mode-split-layout"
      data-fill-height={fillHeight ? 'true' : undefined}
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md:
            leftMaxWidth === undefined
              ? 'minmax(0, 1.35fr) minmax(0, 0.75fr)'
              : `minmax(0, ${px(leftMaxWidth)}) minmax(${px(rightMinWidth)}, 1fr)`,
        },
        gap: 2,
        alignItems: fillHeight ? 'stretch' : 'start',
        ...(fillHeight ? { height: '100%' } : {}),
      }}
    >
      <Box
        sx={{
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          ...(fillHeight ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : {}),
        }}
      >
        {left}
      </Box>
      <Box
        data-testid="view-mode-right-slot"
        sx={{
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          position: 'sticky',
          top: rightTop,
          alignSelf: 'start',
        }}
      >
        {right}
      </Box>
    </Box>
  );
}
