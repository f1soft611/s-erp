import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import { useMemo } from 'react';
import { F1Tree, type F1GridColumn } from '../../../../shared/components/f1-grid';
import { COMPANY_ROW_ID } from '../data/departmentTree';
import type { DepartmentTreeRow } from '../types/department.types';

const INACTIVE_STYLE = { opacity: 0.5 } as const;
const COMPANY_STYLE = { fontWeight: 700 } as const;

function createColumns(): F1GridColumn<DepartmentTreeRow>[] {
  return [
    {
      field: 'departmentNm',
      headerName: '부서명',
      flex: 1,
      width: 220,
      editable: false,
      getCellStyle: ({ row }) => {
        if (row.isCompany) return COMPANY_STYLE;
        return row.useAt === 'N' ? INACTIVE_STYLE : undefined;
      },
      search: { hidden: true },
    },
    { field: 'managerUserNm', headerName: '부서장', width: 100, editable: false, search: { hidden: true } },
    {
      field: 'useAt',
      headerName: '사용',
      width: 78,
      align: 'center',
      editable: false,
      getValue: (row) => {
        if (row.isCompany) return '';
        return row.useAt === 'Y' ? '사용' : '사용안함';
      },
      search: { hidden: true },
    },
  ];
}

type Props = {
  /** 맨 위 회사 노드를 포함한 트리 행(`buildTreeRows` 결과). */
  rows: DepartmentTreeRow[];
  gridKey: number;
  loading: boolean;
  /** 선택된 트리 행 ID(회사 노드는 `COMPANY_ROW_ID`). */
  selectedId: number | null;
  canCreate: boolean;
  canUpdate: boolean;
  onSelect: (rowId: number) => void;
  /** 회사 바로 아래(최상위) 부서 추가 */
  onAddRoot: () => void;
  onAddChild: (parentDepartmentId: number) => void;
  onEdit: (departmentId: number) => void;
  onChangeUse: (departmentId: number, useAt: 'Y' | 'N') => void;
};

/**
 * 폴더 아이콘으로 부서 계층을 보여 주는 읽기 전용 트리. 맨 위는 회사 노드이고 편집·사용안함 대상이 아니다.
 * 등록·편집·사용안함은 우클릭 메뉴에서 한다.
 */
export function DepartmentTree({
  rows, gridKey, loading, selectedId, canCreate, canUpdate,
  onSelect, onAddRoot, onAddChild, onEdit, onChangeUse,
}: Props) {
  const columns = useMemo(() => createColumns(), []);
  const findRow = (rowId?: string | number) => rows.find((row) => row.departmentId === Number(rowId));
  const isDepartmentRow = (rowId?: string | number) => {
    const row = findRow(rowId);
    return row !== undefined && !row.isCompany;
  };

  return (
    <F1Tree
      key={gridKey}
      ariaLabel="부서 트리"
      storageKey="hr-department-tree-v1"
      rows={rows}
      columns={columns}
      rowKey="departmentId"
      parentKey="parentDepartmentId"
      treeColumn="departmentNm"
      defaultExpanded="all"
      height="100%"
      showCheckbox={false}
      selectionMode="row"
      multiSelect={false}
      initialSelectedRowIds={selectedId === null ? undefined : [selectedId]}
      loading={loading}
      rowFormPlugin={{ enabled: false }}
      allowAddRootInContextMenu={false}
      allowDuplicateRowInContextMenu={false}
      allowDeleteRowInContextMenu={false}
      treeNodeIcon={({ row, expanded, hasChildren }) => {
        if (row.isCompany) {
          return (
            <BusinessOutlined
              fontSize="small"
              aria-hidden="true"
              sx={{ mr: 0.75, color: 'primary.main', flex: '0 0 auto' }}
            />
          );
        }
        const Icon = !hasChildren ? DescriptionOutlined : expanded ? FolderOpenOutlined : FolderOutlined;
        return (
          <Icon
            fontSize="small"
            aria-hidden="true"
            sx={{ mr: 0.75, color: hasChildren ? 'warning.main' : 'text.secondary', flex: '0 0 auto' }}
          />
        );
      }}
      treeContextMenu={{
        addChildLabel: '하위 부서 추가',
        isAddChildDisabled: (rowId) => {
          const row = findRow(rowId);
          return !canCreate || loading || row === undefined || (!row.isCompany && row.useAt !== 'Y');
        },
        onAddRoot,
        onAddChild: (rowId) => {
          if (rowId === undefined) return;
          // 회사 노드 아래에 추가하면 최상위 부서가 된다.
          if (Number(rowId) === COMPANY_ROW_ID) onAddRoot();
          else onAddChild(Number(rowId));
        },
        items: [
          {
            key: 'edit',
            label: '편집',
            disabled: (rowId) => !canUpdate || loading || !isDepartmentRow(rowId),
            onClick: (rowId) => {
              if (rowId !== undefined) onEdit(Number(rowId));
            },
          },
          {
            key: 'deactivate',
            label: '사용안함',
            disabled: (rowId) => !canUpdate || loading || !isDepartmentRow(rowId) || findRow(rowId)?.useAt !== 'Y',
            onClick: (rowId) => {
              if (rowId !== undefined) onChangeUse(Number(rowId), 'N');
            },
          },
          {
            key: 'restore',
            label: '복원',
            disabled: (rowId) => !canUpdate || loading || !isDepartmentRow(rowId) || findRow(rowId)?.useAt !== 'N',
            onClick: (rowId) => {
              if (rowId !== undefined) onChangeUse(Number(rowId), 'Y');
            },
          },
        ],
      }}
      onSelectionChange={(ids) => {
        // 트리가 다시 그려질 때 오는 빈 선택은 무시한다.
        const id = ids[0];
        if (id !== undefined) onSelect(Number(id));
      }}
    />
  );
}
