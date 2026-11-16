import { Button, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';

type Props = {
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
};

export function QuotationActionsMenu({ canEdit, onView, onEdit }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  return (
    <>
      <Button size="small" aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>
        작업
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { close(); onView(); }}>상세 보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { close(); onEdit(); }}>수정</MenuItem> : null}
      </Menu>
    </>
  );
}
