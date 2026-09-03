import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import {
  F1Grid,
  F1Tree,
  type F1GridColumn,
  type F1GridRef,
} from '../../../shared/components/f1-grid';
import type { PlaygroundKind } from '../types';

type DemoRow = {
  id: string;
  code: string;
  name: string;
  group: string;
  qty: number;
};

const baseRows: DemoRow[] = [
  {
    id: 'one',
    code: 'ITEM-001',
    name: '스테인리스 배관 부품',
    group: '원자재',
    qty: 10,
  },
  {
    id: 'two',
    code: 'ITEM-001',
    name: '스테인리스 배관 부품',
    group: '원자재',
    qty: 5,
  },
  {
    id: 'three',
    code: 'ITEM-002',
    name: '실리콘 패킹 가스켓',
    group: '부자재',
    qty: 100,
  },
];

type TreeDemoRow = {
  id: string;
  parentId?: string | null;
  name: string;
  type: string;
  owner: string;
};

const treeRows: TreeDemoRow[] = [
  {
    id: 'erp',
    parentId: null,
    name: 'ERP 시스템',
    type: 'root',
    owner: '기획팀',
  },
  {
    id: 'base',
    parentId: 'erp',
    name: '기준정보',
    type: 'group',
    owner: '기준팀',
  },
  {
    id: 'org',
    parentId: 'base',
    name: '조직관리',
    type: 'menu',
    owner: '인사팀',
  },
  {
    id: 'dept',
    parentId: 'org',
    name: '부서관리',
    type: 'page',
    owner: '인사팀',
  },
  {
    id: 'code',
    parentId: 'org',
    name: '공통코드',
    type: 'page',
    owner: '시스템팀',
  },
  {
    id: 'sales',
    parentId: 'erp',
    name: '영업관리',
    type: 'group',
    owner: '영업팀',
  },
  {
    id: 'customer',
    parentId: 'sales',
    name: '고객관리',
    type: 'menu',
    owner: '영업팀',
  },
  {
    id: 'contract',
    parentId: 'customer',
    name: '계약관리',
    type: 'page',
    owner: '영업팀',
  },
  {
    id: 'report',
    parentId: 'erp',
    name: '리포트',
    type: 'group',
    owner: '분석팀',
  },
];

const columns: F1GridColumn<DemoRow>[] = [
  {
    field: 'code',
    headerName: '품목코드',
    width: 130,
    pinned: 'left',
    editable: true,
  },
  {
    field: 'name',
    headerName: '품목명',
    width: 190,
    editable: true,
    wrapText: true,
    mergeRows: true,
  },
  { field: 'group', headerName: '분류', width: 110, editable: true },
  {
    field: 'qty',
    headerName: '수량',
    width: 90,
    type: 'number',
    editable: true,
    align: 'right',
  },
];

const treeColumns: F1GridColumn<TreeDemoRow>[] = [
  {
    field: 'name',
    headerName: '메뉴명',
    width: 220,
    editable: false,
    wrapText: true,
  },
  { field: 'type', headerName: '유형', width: 100, editable: false },
  { field: 'owner', headerName: '담당자', width: 120, editable: false },
];

export function F1GridPlayground({ kind }: { kind: PlaygroundKind }) {
  const gridRef = useRef<F1GridRef<DemoRow>>(null);
  const [rows, setRows] = useState(baseRows);
  const [rowHeight, setRowHeight] = useState(40);
  const [wrapText, setWrapText] = useState(true);
  const [showCheckbox, setShowCheckbox] = useState(kind === 'selection');
  const [changes, setChanges] = useState(0);

  const playgroundColumns = columns.map((column) =>
    column.field === 'name' ? { ...column, wrapText } : column,
  );
  const activeColumns =
    kind === 'layout' && !showCheckbox
      ? playgroundColumns.filter((column) => column.field !== 'group')
      : playgroundColumns;

  function updateChanges() {
    setChanges(gridRef.current?.getChanges().updatedRows.length ?? 0);
  }

  const editingPlugin = {
    id: 'f1-grid-docs-editing-plugin',
    enabled: kind === 'editing',
    canEdit: ({ column }: { column: F1GridColumn<DemoRow> }) =>
      Boolean(column.editable),
    createEditor: ({ column }: { column: F1GridColumn<DemoRow> }) => {
      if (column.field === 'qty') return null;
      return undefined;
    },
    startEdit: () => true,
    endEdit: () => true,
  };

  if (kind === 'tree') {
    return (
      <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
        <Box className="f1-doc-playground-controls">
          <Typography variant="subtitle1">Try it</Typography>
          <Typography variant="body2">계층형 데이터 예제입니다.</Typography>
        </Box>
        <Box className="f1-doc-grid-wrap">
          <F1Tree
            rows={treeRows}
            columns={treeColumns}
            rowKey="id"
            parentKey="parentId"
            treeColumn="name"
            defaultExpandAll
            ariaLabel="F1-Tree documentation example"
            height={260}
            showCheckbox={false}
          />
        </Box>
        <Button size="small" onClick={() => setRows(baseRows)}>
          Reset sample
        </Button>
      </Box>
    );
  }

  return (
    <Box className="f1-doc-playground" data-testid="f1-grid-doc-playground">
      <Box className="f1-doc-playground-controls">
        <Typography variant="subtitle1">Try it</Typography>
        {kind === 'row-height' && (
          <>
            <Typography variant="body2">{rowHeight}px</Typography>
            <Button
              aria-label="Increase row height"
              onClick={() => setRowHeight((value) => Math.min(120, value + 8))}
            >
              Increase row height
            </Button>
            <Button
              aria-label="Decrease row height"
              onClick={() => setRowHeight((value) => Math.max(32, value - 8))}
            >
              Decrease row height
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={wrapText}
                  onChange={(event) => setWrapText(event.target.checked)}
                />
              }
              label="Wrap text"
            />
          </>
        )}
        {kind === 'layout' && (
          <FormControlLabel
            control={
              <Switch
                checked={showCheckbox}
                onChange={(event) => setShowCheckbox(event.target.checked)}
              />
            }
            label="Show category"
          />
        )}
        {kind === 'selection' && (
          <Typography variant="body2">변경된 행: {changes}</Typography>
        )}
        {kind === 'editing' && (
          <Typography variant="body2">셀을 선택해 값을 편집하세요.</Typography>
        )}
        {kind === 'row-merge' && (
          <Typography variant="body2">
            품목명 컬럼은 같은 값이 병합됩니다.
          </Typography>
        )}
      </Box>
      <Box className="f1-doc-grid-wrap">
        <F1Grid
          ref={gridRef}
          rows={rows}
          columns={activeColumns}
          rowKey="id"
          ariaLabel="F1-Grid documentation example"
          rowHeight={rowHeight}
          minRowHeight={32}
          maxRowHeight={120}
          resizableRows={kind === 'row-height'}
          resizableColumns={kind === 'layout'}
          showCheckbox={showCheckbox}
          editorPlugins={kind === 'editing' ? [editingPlugin] : []}
          onChangesChange={updateChanges}
          onSelectionChange={updateChanges}
        />
      </Box>
      <Button size="small" onClick={() => setRows(baseRows)}>
        Reset sample
      </Button>
    </Box>
  );
}
