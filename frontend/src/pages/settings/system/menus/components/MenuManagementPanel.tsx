import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  F1Grid,
  type F1GridChanges,
  type F1GridColumn,
  type F1GridRef,
} from '../../../../../shared/components/f1-grid';
import type { MenuManagementRow } from '../types/menuManagement.types';

type MenuManagementPanelProps = { menus: MenuManagementRow[] };

export function MenuManagementPanel({ menus }: MenuManagementPanelProps) {
  const gridRef = useRef<F1GridRef<MenuManagementRow>>(null);
  const [changes, setChanges] = useState<F1GridChanges<MenuManagementRow>>({
    insertedRows: [],
    updatedRows: [],
    deletedRows: [],
  });
  const [newMenuSequence, setNewMenuSequence] = useState(1);
  const columns: F1GridColumn<MenuManagementRow>[] = [
    {
      field: 'code',
      headerName: '코드',
      width: 90,
      editable: true,
      mergeRows: true,
    },
    {
      field: 'name',
      headerName: '메뉴명',
      width: 160,
      editable: true,
      mergeRows: true,
    },
    {
      field: 'parent',
      headerName: '상위 메뉴',
      width: 130,
      editable: true,
      mergeRows: true,
    },
    {
      field: 'order',
      headerName: '정렬',
      width: 80,
      editable: true,
      type: 'number',
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'enabled',
      headerName: '사용 여부',
      width: 120,
      editable: true,
      type: 'checkbox',
      headerCheckbox: true,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'status',
      headerName: '상태',
      type: 'select',
      editable: (row) => row.status === 'draft',
      headerAlign: 'center',
      align: 'center',
      options: [
        { value: 'draft', label: '작성중' },
        { value: 'confirmed', label: '확정' },
      ],
    },
  ];

  function createMenuRow(): MenuManagementRow {
    const sequence = newMenuSequence;
    setNewMenuSequence((current) => current + 1);
    return {
      id: `new-menu-${sequence}`,
      code: `NEW${sequence}`,
      name: '새 메뉴',
      parent: '루트',
      order: 0,
      enabled: true,
      status: 'draft',
      description: '',
      permissionGroup: '관리',
    };
  }

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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={() => gridRef.current?.deleteSelectedRows()}
              >
                삭제
              </Button>
              <Button
                size="small"
                onClick={() => gridRef.current?.duplicateSelectedRows()}
              >
                복제
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => gridRef.current?.addRow()}
              >
                새 메뉴
              </Button>
            </Box>
          </Box>
          <F1Grid
            ref={gridRef}
            rows={menus}
            columns={columns}
            rowKey="id"
            columnLine
            ariaLabel="F1-GRID 메뉴 관리"
            createRow={createMenuRow}
            createDuplicate={(menu) => ({
              ...menu,
              id: `${menu.id}-copy-${Date.now()}`,
              code: `${menu.code}-COPY`,
            })}
            onChangesChange={setChanges}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            변경: 신규 {changes.insertedRows.length}건 / 수정{' '}
            {changes.updatedRows.length}건 / 삭제 {changes.deletedRows.length}건
          </Typography>
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
