import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { useState } from 'react';

type SalesOrderActionsMenuProps = {
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
};

export function SalesOrderActionsMenu({ canEdit, onView, onEdit }: SalesOrderActionsMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <IconButton
        aria-label="수주 더보기"
        size="small"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onView();
          }}
        >
          자세히보기
        </MenuItem>
        {canEdit && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onEdit();
            }}
          >
            수정
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
