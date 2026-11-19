export const richTextEditorIconButtonSx = {
  width: 32,
  height: 32,
  flexShrink: 0,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  p: 0,
  bgcolor: 'background.paper',
  color: 'text.secondary',
  '&:hover': {
    borderColor: 'text.secondary',
    bgcolor: 'action.hover',
  },
} as const;
