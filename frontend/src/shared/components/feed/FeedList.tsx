import { Box, Stack, Typography } from '@mui/material';
import { Fragment, isValidElement, type ReactNode } from 'react';

export type FeedListProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage?: string;
  isDark?: boolean;
  getItemKey?: (item: T, index: number) => string | number;
};

export function FeedList<T>({
  items,
  renderItem,
  emptyMessage,
  getItemKey,
}: FeedListProps<T>) {
  if (items.length === 0) {
    if (!emptyMessage) {
      return null;
    }

    return (
      <Typography variant="body2" color="text.secondary">
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {items.map((item, index) => {
        const key = getItemKey?.(item, index) ?? String(index);
        const content = renderItem(item, index);

        if (isValidElement(content)) {
          return <Fragment key={key}>{content}</Fragment>;
        }

        return <Box key={key}>{content}</Box>;
      })}
    </Stack>
  );
}
