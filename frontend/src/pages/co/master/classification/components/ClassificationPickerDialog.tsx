import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack } from '@mui/material';
import { CommonDialog } from '../../../../../shared/components/CommonDialog';
import { AppLoadingSpinner } from '../../../../../shared/components/AppLoadingSpinner';
import { F1Tree, type F1GridColumn } from '../../../../../shared/components/f1-grid';
import { fetchClassifications } from '../services/classification.service';
import type { Classification, ClassificationKind } from '../types/classification.types';

export type ClassificationSelection = {
  row: Classification;
  path: string;
  parent?: Classification;
};

type Props = {
  open: boolean;
  kind: ClassificationKind;
  level?: 1 | 2;
  parentId?: number | null;
  onSelect: (selection: ClassificationSelection | null) => void;
  onClose: () => void;
};

const columns: F1GridColumn<Classification>[] = [
  { field: 'name', headerName: '분류명', width: 220, flex: 1, editable: false },
  { field: 'useAt', headerName: '사용여부', width: 90, editable: false,
    getValue: (row) => row.useAt === 'Y' ? '사용' : '미사용', align: 'center' },
];

function PickerContent({ kind, level, parentId, onSelect, onClose }: Omit<Props, 'open'>) {
  const [rows, setRows] = useState<Classification[]>([]);
  const [selectedId, setSelectedId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);
  useEffect(() => {
    let active = true;
    void fetchClassifications(kind).then((data) => {
      if (active) setRows(data);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '분류 목록을 불러오지 못했습니다.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [kind, attempt]);

  const selected = selectedId === undefined ? undefined : byId.get(selectedId);
  const selection = (() => {
    if (!selected || loading || error ||
      (kind === 'partner' && (selected.level !== level ||
        (level === 2 && parentId != null && selected.parentId !== parentId)))) return null;
    if (selected.level < 1 || selected.level > (kind === 'item' ? 3 : 2)) return null;
    const chain: Classification[] = [];
    let node: Classification | undefined = selected;
    for (let depth = selected.level; depth >= 1; depth--) {
      if (!node || node.level !== depth || node.useAt !== 'Y') return null;
      chain.unshift(node);
      if (depth === 1 && node.parentId !== null) return null;
      node = node.parentId === null ? undefined : byId.get(node.parentId);
    }
    return { row: selected, path: chain.map((row) => row.name).join(' > '),
      parent: chain[chain.length - 2] };
  })();
  const title = kind === 'item' ? '품목분류 선택'
    : level === 1 ? '거래처 대분류 선택' : '거래처 소분류 선택';

  return (
    <CommonDialog open onClose={onClose} title={title}
      description="분류를 선택한 뒤 선택 버튼을 누르세요. 사용 중인 분류만 선택할 수 있습니다."
      fullScreenOnMobile bodyMode="fill" paperHeight="min(680px, 90vh)"
      actions={<Stack direction="row" spacing={1}>
        <Button variant="contained" disabled={!selection} onClick={() => {
          if (selection) onSelect(selection);
        }}>선택</Button>
        <Button onClick={onClose}>취소</Button>
      </Stack>}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <AppLoadingSpinner aria-label="분류 조회 중" />
        </Box> : error ? <Alert severity="error" action={<Button onClick={() => {
          setLoading(true); setError(''); setSelectedId(undefined); setAttempt((value) => value + 1);
        }}>다시 조회</Button>}>{error}</Alert> : rows.length === 0
          ? <Alert severity="info">등록된 분류가 없습니다. 분류 설정에서 먼저 등록해 주세요.</Alert>
          : <F1Tree rows={rows} columns={columns} rowKey="id" parentKey="parentId"
            treeColumn="name" ariaLabel="분류 선택 트리" height="100%" minHeight={200}
            showCheckbox={false} defaultExpandAll getRowOrder={(row) => row.sortSeq}
            onSelectionChange={(ids) => setSelectedId(typeof ids[0] === 'number' ? ids[0] : undefined)}
            disableContextMenu allowAddRootInContextMenu={false} allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false} />}
      </Box>
    </CommonDialog>
  );
}

export function ClassificationPickerDialog({ open, ...props }: Props) {
  return open ? <PickerContent key={`${props.kind}-${props.level}-${props.parentId}`} {...props} /> : null;
}
