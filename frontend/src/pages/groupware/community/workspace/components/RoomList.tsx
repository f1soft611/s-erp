import AddOutlined from '@mui/icons-material/AddOutlined';
import ForumOutlined from '@mui/icons-material/ForumOutlined';
import { Box, Button, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import type { WorkspaceRoom } from '../types/workspace.types';

type RoomListProps = {
  rooms: WorkspaceRoom[];
  selectedRoomId: string | null;
  onSelect: (roomId: string) => void;
  onCreate: () => void;
  canCreate: boolean;
};

export function RoomList({ rooms, selectedRoomId, onSelect, onCreate, canCreate }: RoomListProps) {
  return (
    <Box component="nav" aria-label="협업공간 방 목록">
      <List dense disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {rooms.map((room) => (
          <ListItemButton
            key={room.id}
            selected={room.id === selectedRoomId}
            onClick={() => onSelect(room.id)}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <ForumOutlined fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={room.name}
              slotProps={{
                primary: { noWrap: true, sx: { fontWeight: room.id === selectedRoomId ? 700 : 400 } },
              }}
            />
          </ListItemButton>
        ))}
      </List>
      {canCreate ? (
        <Button size="small" startIcon={<AddOutlined />} onClick={onCreate} sx={{ mt: 1 }}>
          방 만들기
        </Button>
      ) : null}
    </Box>
  );
}
