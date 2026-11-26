import AddOutlined from '@mui/icons-material/AddOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import {
  Autocomplete,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import type { WorkspaceGroup, WorkspaceLevel, WorkspaceUser } from '../types/workspace.types';

type PermissionGroupTableProps = {
  groups: WorkspaceGroup[];
  users: WorkspaceUser[];
  onChange: (groups: WorkspaceGroup[]) => void;
};

const LEVEL_OPTIONS: { value: WorkspaceLevel; label: string }[] = [
  { value: 'read', label: '읽기' },
  { value: 'write', label: '저장 (글·댓글·카드 이동)' },
  { value: 'admin', label: '방 설정' },
];

let groupSeq = 0;
const newGroupId = () => {
  groupSeq += 1;
  return `g-${Date.now().toString(36)}-${groupSeq}`;
};

export function PermissionGroupTable({ groups, users, onChange }: PermissionGroupTableProps) {
  const patch = (id: string, partial: Partial<WorkspaceGroup>) =>
    onChange(groups.map((group) => (group.id === id ? { ...group, ...partial } : group)));

  return (
    <>
      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '24%' }}>그룹 이름</TableCell>
              <TableCell>구성원</TableCell>
              <TableCell sx={{ width: '28%' }}>권한 수준</TableCell>
              <TableCell sx={{ width: 48 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <TextField
                    size="small"
                    fullWidth
                    value={group.name}
                    onChange={(event) => patch(group.id, { name: event.target.value })}
                    slotProps={{ htmlInput: { 'aria-label': '그룹 이름' } }}
                  />
                </TableCell>
                <TableCell>
                  <Autocomplete
                    multiple
                    size="small"
                    options={users}
                    getOptionLabel={(user) => user.name}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={users.filter((user) => group.members.some((member) => member.userId === user.id))}
                    onChange={(_, selected) =>
                      patch(group.id, { members: selected.map((user) => ({ kind: 'user' as const, userId: user.id })) })
                    }
                    noOptionsText="선택할 사용자가 없습니다"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder={group.members.length === 0 ? '구성원 선택' : undefined}
                        slotProps={{
                          ...params.slotProps,
                          htmlInput: { ...params.slotProps.htmlInput, 'aria-label': '구성원' },
                        }}
                      />
                    )}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={group.level}
                    onChange={(event) => patch(group.id, { level: event.target.value as WorkspaceLevel })}
                    slotProps={{ select: { native: true }, htmlInput: { 'aria-label': '권한 수준' } }}
                  >
                    {LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell padding="none">
                  <IconButton
                    size="small"
                    aria-label="그룹 삭제"
                    onClick={() => onChange(groups.filter((item) => item.id !== group.id))}
                  >
                    <DeleteOutlineRounded fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        size="small"
        startIcon={<AddOutlined />}
        sx={{ mt: 1 }}
        onClick={() => onChange([...groups, { id: newGroupId(), name: '새 그룹', level: 'read', members: [] }])}
      >
        그룹 추가
      </Button>
    </>
  );
}
