import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { RoleManagementRow } from '../types/roleManagement.types';

type RoleManagementPanelProps = {
  roles: RoleManagementRow[];
};

export function RoleManagementPanel({ roles }: RoleManagementPanelProps) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 2, p: 3 }}
    >
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              역할 목록
            </Typography>
            <Button variant="contained" size="small">
              권한 등록
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>역할</TableCell>
                <TableCell>그룹</TableCell>
                <TableCell>메뉴</TableCell>
                <TableCell>활성</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>
                      {role.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {role.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{role.group}</TableCell>
                  <TableCell>{role.menuCount}</TableCell>
                  <TableCell>{role.active ? '사용' : '미사용'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card
        sx={{
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: 'none',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            권한 상세
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                선택 역할
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                ADMIN
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                권한 매핑
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['READ', 'CREATE', 'UPDATE', 'DELETE'].map((label) => (
                <Chip key={label} label={label} variant="outlined" />
              ))}
            </Box>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="조회"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="생성"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="수정"
              />
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="삭제"
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
