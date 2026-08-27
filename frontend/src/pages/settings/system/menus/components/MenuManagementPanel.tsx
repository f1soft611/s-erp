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
  TextField,
  Typography,
} from '@mui/material';
import type { MenuManagementRow } from '../types/menuManagement.types';

type MenuManagementPanelProps = { menus: MenuManagementRow[] };

export function MenuManagementPanel({ menus }: MenuManagementPanelProps) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 2, p: 3 }}
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
              메뉴 관리
            </Typography>
            <Button variant="contained" size="small">
              새 메뉴
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>코드</TableCell>
                <TableCell>메뉴명</TableCell>
                <TableCell>상위 메뉴</TableCell>
                <TableCell>정렬</TableCell>
                <TableCell>사용 여부</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menus.map((menu) => (
                <TableRow key={menu.id} hover>
                  <TableCell>{menu.code}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>
                      {menu.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {menu.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{menu.parent}</TableCell>
                  <TableCell>{menu.order}</TableCell>
                  <TableCell>{menu.enabled ? '사용' : '미사용'}</TableCell>
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
            기본정보
          </Typography>
          <Stack spacing={2}>
            <TextField label="메뉴명" defaultValue="권한관리" size="small" />
            <TextField
              label="상위 메뉴"
              defaultValue="시스템 관리"
              size="small"
            />
            <TextField label="권한 그룹" defaultValue="관리" size="small" />
            <TextField
              label="설명"
              defaultValue="역할별 접근 권한 설정"
              size="small"
              multiline
              minRows={3}
            />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                사용 여부
              </Typography>
              <FormControlLabel
                control={<Checkbox defaultChecked />}
                label="사용"
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                정렬 순서
              </Typography>
              <Chip label="1" color="primary" variant="outlined" />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
