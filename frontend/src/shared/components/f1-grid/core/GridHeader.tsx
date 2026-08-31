import { useState, type MouseEvent } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterListIcon from '@mui/icons-material/FilterList';
import PushPinIcon from '@mui/icons-material/PushPin';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { canHideGridColumn } from '../columns/GridColumnManagement';
import { getGridColumnPinSide } from '../columns/GridColumnPin';
import { getGridFilterOperators } from '../filter/GridFilter';
import { getGridSortIndicator } from '../sorting/GridSort';
import { getGridColumnTrack } from '../utils/grid.utils';
import type {
  F1GridColumn,
  F1GridFilter,
  F1GridFilterOperator,
  F1GridPinSide,
  F1GridRowId,
  F1GridSort,
} from '../types/grid.types';

const OPERATOR_LABELS: Record<F1GridFilterOperator, string> = {
  equals: '같음',
  notEquals: '같지 않음',
  contains: '포함',
  startsWith: '시작 문자',
  endsWith: '끝 문자',
  greaterThan: '초과',
  lessThan: '미만',
  greaterThanOrEqual: '이상',
  lessThanOrEqual: '이하',
  between: '범위',
  isEmpty: '비어 있음',
  isNotEmpty: '비어 있지 않음',
};

type GridHeaderProps<T extends object> = {
  columns: F1GridColumn<T>[];
  allColumns: F1GridColumn<T>[];
  columnLine: boolean;
  selectedAll: boolean;
  selectedIds: F1GridRowId[];
  columnWidths: Record<string, number>;
  resizableColumns?: boolean;
  minColumnWidth?: number;
  showCheckbox?: boolean;
  onResizeColumn: (column: F1GridColumn<T>, nextWidth: number) => void;
  getColumnCheckboxState: (column: F1GridColumn<T>) => {
    allChecked: boolean;
    indeterminate: boolean;
    hasEditableRows: boolean;
  };
  onToggleAllRows: () => void;
  onToggleColumnCheckbox: (column: F1GridColumn<T>, nextValue: boolean) => void;
  onToggleColumnVisibility: (column: F1GridColumn<T>, visible: boolean) => void;
  sorts: F1GridSort<T>[];
  onToggleSort: (column: F1GridColumn<T>, direction: 'asc' | 'desc') => void;
  disableSorting?: boolean;
  filters: F1GridFilter<T>[];
  onApplyFilter: (
    column: F1GridColumn<T>,
    filter: F1GridFilter<T> | undefined,
  ) => void;
  disableFiltering?: boolean;
  pinnedFields: Map<string, F1GridPinSide>;
  onPinColumn: (
    column: F1GridColumn<T>,
    side: F1GridPinSide | undefined,
  ) => void;
  leftOffsets: Record<string, number>;
  rightOffsets: Record<string, number>;
};

export function GridHeader<T extends object>({
  columns,
  allColumns,
  columnLine,
  selectedAll,
  selectedIds,
  columnWidths,
  resizableColumns = true,
  minColumnWidth = 50,
  showCheckbox = true,
  onResizeColumn,
  getColumnCheckboxState,
  onToggleAllRows,
  onToggleColumnCheckbox,
  onToggleColumnVisibility,
  sorts,
  onToggleSort,
  disableSorting = false,
  filters,
  onApplyFilter,
  disableFiltering = false,
  pinnedFields,
  onPinColumn,
  leftOffsets,
  rightOffsets,
}: GridHeaderProps<T>) {
  const [menuColumn, setMenuColumn] = useState<F1GridColumn<T>>();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [columnListAnchor, setColumnListAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [filterDraft, setFilterDraft] = useState<{
    operator: F1GridFilterOperator;
    value: string;
    value2: string;
  }>({ operator: 'contains', value: '', value2: '' });

  function handleResizeStart(
    event: MouseEvent<HTMLElement>,
    column: F1GridColumn<T>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const currentWidth =
      columnWidths[String(column.field)] ?? column.width ?? 140;

    function handleMouseMove(e: globalThis.MouseEvent) {
      const delta = e.clientX - startX;
      const nextWidth = Math.max(minColumnWidth, currentWidth + delta);
      onResizeColumn(column, nextWidth);
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function closeMenus() {
    setMenuAnchor(null);
    setColumnListAnchor(null);
    setFilterAnchor(null);
  }

  function openColumnMenu(
    event: MouseEvent<HTMLElement>,
    column: F1GridColumn<T>,
  ) {
    event.stopPropagation();
    setMenuColumn(column);
    setMenuAnchor(event.currentTarget);
  }

  function openFilterPopover(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    const existing = menuColumn
      ? filters.find((filter) => filter.field === menuColumn.field)
      : undefined;
    setFilterDraft({
      operator: existing?.operator ?? 'contains',
      value: existing?.value === undefined ? '' : String(existing.value),
      value2: existing?.value2 === undefined ? '' : String(existing.value2),
    });
    setMenuAnchor(null);
    setFilterAnchor(event.currentTarget);
  }

  function applyFilterDraft() {
    if (!menuColumn) return;
    if (
      filterDraft.operator === 'isEmpty' ||
      filterDraft.operator === 'isNotEmpty'
    ) {
      onApplyFilter(menuColumn, {
        field: menuColumn.field,
        operator: filterDraft.operator,
      });
    } else if (filterDraft.value === '') {
      onApplyFilter(menuColumn, undefined);
    } else {
      onApplyFilter(menuColumn, {
        field: menuColumn.field,
        operator: filterDraft.operator,
        value:
          menuColumn.type === 'checkbox'
            ? filterDraft.value === 'true'
            : filterDraft.value,
        value2: filterDraft.value2 === '' ? undefined : filterDraft.value2,
      });
    }
    closeMenus();
  }

  function clearFilterDraft() {
    if (!menuColumn) return;
    onApplyFilter(menuColumn, undefined);
    closeMenus();
  }

  const activeOperator = filterDraft.operator;
  const needsValue =
    activeOperator !== 'isEmpty' && activeOperator !== 'isNotEmpty';
  const needsSecondValue = activeOperator === 'between';

  return (
    <>
      <Box
        role="row"
        sx={{
          display: 'grid',
          gridTemplateColumns: `${showCheckbox ? '44px ' : ''}${columns
            .map((column) =>
              getGridColumnTrack(column, columnWidths[String(column.field)]),
            )
            .join(' ')}`,
          minWidth: 'max-content',
          bgcolor: 'action.hover',
          fontWeight: 700,
          isolation: 'isolate',
        }}
      >
        {showCheckbox ? (
          <Box
            role="columnheader"
            sx={{
              display: 'flex',
              justifyContent: 'center',
              position: 'sticky',
              left: 0,
              zIndex: 4,
              backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgb(28, 36, 50)'
                  : 'rgb(232, 236, 244)',
            }}
          >
            <Checkbox
              size="small"
              aria-label="전체 행 선택"
              checked={selectedAll}
              indeterminate={selectedIds.length > 0 && !selectedAll}
              onChange={onToggleAllRows}
            />
          </Box>
        ) : null}
        {columns.map((column) => {
          const checkboxState = getColumnCheckboxState(column);
          const pinSide = getGridColumnPinSide(pinnedFields, column);
          const sortIndicator = getGridSortIndicator(sorts, column.field);
          const hasFilter = filters.some(
            (filter) => filter.field === column.field,
          );
          const isMenuOpen =
            menuColumn?.field === column.field &&
            Boolean(menuAnchor || columnListAnchor || filterAnchor);

          return (
            <Box
              key={String(column.field)}
              role="columnheader"
              sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                justifyContent:
                  column.headerAlign === 'right'
                    ? 'flex-end'
                    : column.headerAlign === 'left'
                      ? 'flex-start'
                      : 'center',
                textAlign: column.headerAlign ?? 'left',
                borderRight: 1,
                borderRightColor: 'divider',
                borderLeft: columnLine ? 1 : 0,
                borderLeftColor: 'divider',
                position: pinSide ? 'sticky' : 'relative',
                left:
                  pinSide === 'left'
                    ? leftOffsets[String(column.field)]
                    : undefined,
                right:
                  pinSide === 'right'
                    ? rightOffsets[String(column.field)]
                    : undefined,
                zIndex: pinSide ? 3 : undefined,
                backgroundColor: pinSide
                  ? (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgb(28, 36, 50)'
                        : 'rgb(232, 236, 244)'
                  : undefined,
                boxShadow:
                  pinSide === 'left'
                    ? '2px 0 4px -2px rgba(0, 0, 0, 0.32)'
                    : pinSide === 'right'
                      ? '-2px 0 4px -2px rgba(0, 0, 0, 0.32)'
                      : undefined,
                '& .f1-grid-col-menu-btn': {
                  opacity: isMenuOpen ? 1 : 0,
                  transition: 'opacity 0.15s ease-in-out',
                  flexShrink: 0,
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                },
                '&:hover .f1-grid-col-menu-btn, &:focus-within .f1-grid-col-menu-btn':
                  {
                    opacity: 1,
                  },
                '&:hover .f1-grid-header-content, &:focus-within .f1-grid-header-content':
                  {
                    pr: 4,
                  },
              }}
            >
              <Box
                className="f1-grid-header-content"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    column.headerAlign === 'right'
                      ? 'flex-end'
                      : column.headerAlign === 'left'
                        ? 'flex-start'
                        : 'center',
                  gap: 0.5,
                  minWidth: 0,
                  width: '100%',
                  pr: isMenuOpen ? 4 : 0,
                }}
              >
                {column.type === 'checkbox' && column.headerCheckbox ? (
                  <Checkbox
                    size="small"
                    sx={{ p: 0.25, mr: -0.25 }}
                    checked={checkboxState.allChecked}
                    indeterminate={checkboxState.indeterminate}
                    disabled={!checkboxState.hasEditableRows}
                    slotProps={{
                      input: { 'aria-label': `${column.headerName} 전체 선택` },
                    }}
                    onChange={() =>
                      onToggleColumnCheckbox(column, !checkboxState.allChecked)
                    }
                  />
                ) : null}
                {column.headerName}
                {sortIndicator ? (
                  <Box
                    component="span"
                    aria-label={`${column.headerName} 정렬 상태`}
                    sx={{ display: 'flex', alignItems: 'center', fontSize: 12 }}
                  >
                    {sortIndicator.direction === 'asc' ? (
                      <ArrowUpwardIcon fontSize="inherit" />
                    ) : (
                      <ArrowDownwardIcon fontSize="inherit" />
                    )}
                    {sorts.length > 1 ? sortIndicator.order : null}
                  </Box>
                ) : null}
                {hasFilter ? (
                  <FilterListIcon
                    fontSize="small"
                    color="primary"
                    aria-label={`${column.headerName} 필터 적용됨`}
                  />
                ) : null}
              </Box>
              <IconButton
                size="small"
                className="f1-grid-col-menu-btn"
                aria-label={`${column.headerName} 컬럼 메뉴`}
                onClick={(event) => openColumnMenu(event, column)}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
              {resizableColumns && (
                <Box
                  role="separator"
                  aria-label={`${column.headerName} 컬럼 너비 조절`}
                  onMouseDown={(event) => handleResizeStart(event, column)}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    cursor: 'col-resize',
                    zIndex: 3,
                    userSelect: 'none',
                    '&:hover': {
                      bgcolor: 'primary.main',
                    },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenus}
      >
        {!disableSorting ? (
          <>
            <MenuItem
              onClick={() => {
                if (menuColumn) onToggleSort(menuColumn, 'asc');
                closeMenus();
              }}
            >
              <ListItemIcon>
                <ArrowUpwardIcon fontSize="small" />
              </ListItemIcon>
              오름차순 정렬
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (menuColumn) onToggleSort(menuColumn, 'desc');
                closeMenus();
              }}
            >
              <ListItemIcon>
                <ArrowDownwardIcon fontSize="small" />
              </ListItemIcon>
              내림차순 정렬
            </MenuItem>
            <Divider />
          </>
        ) : null}
        <MenuItem
          onClick={(event) => {
            event.stopPropagation();
            setColumnListAnchor(event.currentTarget);
          }}
        >
          컬럼 목록
        </MenuItem>
        {!disableFiltering ? (
          <>
            <Divider />
            <MenuItem onClick={openFilterPopover}>
              <ListItemIcon>
                <FilterListIcon fontSize="small" />
              </ListItemIcon>
              필터
            </MenuItem>
          </>
        ) : null}
        <Divider />
        <MenuItem
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, 'left');
            closeMenus();
          }}
        >
          <ListItemIcon>
            <PushPinIcon fontSize="small" />
          </ListItemIcon>
          왼쪽 고정
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, 'right');
            closeMenus();
          }}
        >
          <ListItemIcon>
            <PushPinIcon fontSize="small" />
          </ListItemIcon>
          오른쪽 고정
        </MenuItem>
        <MenuItem
          disabled={
            !menuColumn || !getGridColumnPinSide(pinnedFields, menuColumn)
          }
          onClick={() => {
            if (menuColumn) onPinColumn(menuColumn, undefined);
            closeMenus();
          }}
        >
          고정 해제
        </MenuItem>
      </Menu>
      <Menu
        anchorEl={columnListAnchor}
        open={Boolean(columnListAnchor)}
        onClose={() => setColumnListAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {allColumns.map((column) => {
          const visible = columns.some(
            (visibleColumn) => visibleColumn.field === column.field,
          );
          const canHide = canHideGridColumn(columns, column);

          return (
            <MenuItem
              key={String(column.field)}
              dense
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox
                size="small"
                checked={visible}
                disabled={visible && !canHide}
                slotProps={{
                  input: { 'aria-label': `${column.headerName} 표시` },
                }}
                onChange={() => {
                  onToggleColumnVisibility(column, !visible);
                  closeMenus();
                }}
              />
              {column.headerName}
            </MenuItem>
          );
        })}
      </Menu>
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={closeMenus}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            minWidth: 220,
          }}
        >
          {menuColumn?.type === 'checkbox' ? (
            <Select
              size="small"
              value={filterDraft.value}
              onChange={(event) =>
                setFilterDraft((current) => ({
                  ...current,
                  operator: 'equals',
                  value: event.target.value,
                }))
              }
              displayEmpty
              aria-label={`${menuColumn?.headerName} 필터 값`}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="true">Yes</MenuItem>
              <MenuItem value="false">No</MenuItem>
            </Select>
          ) : (
            <>
              <Select
                size="small"
                value={filterDraft.operator}
                onChange={(event) =>
                  setFilterDraft((current) => ({
                    ...current,
                    operator: event.target.value as F1GridFilterOperator,
                  }))
                }
                aria-label={`${menuColumn?.headerName} 필터 연산자`}
              >
                {getGridFilterOperators(menuColumn?.type).map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {OPERATOR_LABELS[operator]}
                  </MenuItem>
                ))}
              </Select>
              {needsValue ? (
                <TextField
                  size="small"
                  label={`${menuColumn?.headerName} 필터 값`}
                  value={filterDraft.value}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      value: event.target.value,
                    }))
                  }
                />
              ) : null}
              {needsSecondValue ? (
                <TextField
                  size="small"
                  label={`${menuColumn?.headerName} 필터 값2`}
                  value={filterDraft.value2}
                  onChange={(event) =>
                    setFilterDraft((current) => ({
                      ...current,
                      value2: event.target.value,
                    }))
                  }
                />
              ) : null}
            </>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button size="small" onClick={clearFilterDraft}>
              초기화
            </Button>
            <Button size="small" variant="contained" onClick={applyFilterDraft}>
              적용
            </Button>
          </Box>
        </Box>
      </Menu>
    </>
  );
}
