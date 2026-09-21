import { Box, Stack } from '@mui/material';
import type { CommonViewItemRenderer } from './commonViewTypes';

type FeedViewProps<T> = {
  items: T[];
  renderItem: CommonViewItemRenderer<T>;
};

export function FeedView<T>({ items, renderItem }: FeedViewProps<T>) {
  return (
    <Stack spacing={2}>
      {items.map((item, index) => (
        <Box key={index}>{renderItem(item, index)}</Box>
      ))}
    </Stack>
  );
}
