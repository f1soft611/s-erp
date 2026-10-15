import type { ReactNode } from 'react';
import { Divider, Stack } from '@mui/material';

type DocumentApprovalToolbarProps = {
  approvalActions?: ReactNode;
  status: ReactNode;
  pinControl: ReactNode;
  moreMenu?: ReactNode;
  documentKind: ReactNode;
};

export function DocumentApprovalToolbar({
  approvalActions,
  status,
  pinControl,
  moreMenu,
  documentKind,
}: DocumentApprovalToolbarProps) {
  return (
    <Stack
      data-testid="document-approval-toolbar"
      direction="row"
      spacing={0}
      sx={{
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        minWidth: 0,
        maxWidth: '100%',
        columnGap: 0.5,
        width: { xs: '100%', sm: 'auto' },
      }}
    >
      {approvalActions}
      {status}
      <Divider orientation="vertical" flexItem />
      {pinControl}
      {moreMenu}
      {documentKind}
    </Stack>
  );
}
