import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
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
      <IconButton size="small" aria-label="견적 더보기" aria-haspopup="menu"
        onClick={(event) => setAnchor(event.currentTarget)}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => { close(); onView(); }}>자세히보기</MenuItem>
        {canEdit ? <MenuItem onClick={() => { close(); onEdit(); }}>수정</MenuItem> : null}
      </Menu>
    </>
  );
}
