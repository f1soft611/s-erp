import { useMemo, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Card, CardContent, TextField, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import Splitter from '../../../../shared/components/Splitter';
import { F1Grid, type F1GridRef } from '../../../../shared/components/f1-grid';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { useNotification } from '../../../../shared/context/notification';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { useUnsavedChangesBeforeUnload } from '../../../../shared/hooks/useUnsavedChangesBeforeUnload';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { customerColumns, destinationColumns } from './data/salesDestinationColumns';
import { useSalesDestinationManagement } from './hooks/useSalesDestinationManagement';
import type { SalesDestinationGridRow } from './types/salesDestination.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function SalesDestinationPage({ content, breadcrumbItems, selectedMenuPermissions }: Props) {
  const state = useSalesDestinationManagement();
  const { showSuccess } = useNotification();
  const { confirm, dialog } = useCommonConfirmDialog();
  const gridRef = useRef<F1GridRef<SalesDestinationGridRow>>(null);
  const [keyword, setKeyword] = useState('');
  const [selectionKey, setSelectionKey] = useState(0);
  useUnsavedChangesBeforeUnload(state.hasChanges);
  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);
  const customerId = state.customerId;
  const selectedCustomer = state.customers.find((row) => row.customerId === customerId);
  const columns = useMemo(() => destinationColumns(canCreate && !state.saving, canUpdate && !state.saving),
    [canCreate, canUpdate, state.saving]);

  const confirmDiscard = async () => !state.hasChanges || confirm({
    title: '저장하지 않은 변경사항',
    description: '변경사항을 버리고 계속하시겠습니까?',
    confirmLabel: '계속',
  });
  const search = async () => {
    if (!selectedMenuPermissions?.read || state.saving) return;
    if (!(await confirmDiscard())) return;
    state.discardChanges();
    state.setKeyword(keyword.trim());
    state.refresh();
  };
  const selectCustomer = async (id: number) => {
    if (id === state.customerId) return;
    if (state.saving || !(await confirmDiscard())) {
      setSelectionKey((value) => value + 1);
      return;
    }
    state.discardChanges();
    state.setCustomerId(id);
  };
  const actions: PermissionActionGroupDefinition[] = [
    { key: 'write', actions: [{ label: '납품처 추가', icon: AddIcon, visible: canCreate,
      disabled: !state.customerId || state.rowsLoading || state.saving,
      onClick: () => gridRef.current?.addRow() }] },
    { key: 'read', actions: [{ label: '조회', icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read), disabled: state.saving,
      onClick: () => { void search(); } }] },
    { key: 'write', actions: [{ label: '저장', icon: SaveIcon, visible: canCreate || canUpdate,
      saving: state.saving, savingAriaLabel: '납품처 저장 중',
      disabled: !state.hasChanges || state.saving || state.rowsLoading,
      onClick: () => {
        const grid = gridRef.current;
        if (!grid) return;
        if (!grid.validate()) { state.setError('필수 입력 항목을 확인해 주세요.'); return; }
        const changes = grid.getChanges();
        void (async () => {
          if (!await state.save(changes)) return;
          grid.acceptSavedRows([...changes.insertedRows, ...changes.updatedRows].map((row) => ({
            previousRowId: row.salesDestinationId,
            row,
          })));
          showSuccess('납품처 정보를 저장했습니다.');
        })();
      } }] },
    { key: 'delete', actions: [{ label: '삭제', icon: DeleteOutlineIcon, visible: canDelete,
      disabled: !state.selectedId || state.hasChanges || state.rowsLoading || state.saving,
      onClick: () => { void (async () => {
        if (state.selectedId && await confirm({ title: '납품처 삭제',
          description: '선택한 납품처를 삭제하시겠습니까?' })) await state.remove(state.selectedId);
      })(); } }] }
  ];

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, minWidth: 0, height: '100%' }}>
      <PageHeader breadcrumbItems={breadcrumbItems} description={content.description} actionGroups={actions} />
      <PageSearchArea searchField={<TextField size="small" margin="none"
        placeholder="거래처 코드·명 검색" value={keyword} onChange={(event) => setKeyword(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': '거래처 검색' } }}
        sx={(theme) => ({ width: '100%', height: 40, '& .MuiOutlinedInput-root': {
          height: '100%', borderRadius: '0 4px 4px 0', backgroundColor: theme.palette.background.paper,
        } })} />} onDefaultSearch={() => { void search(); }} />
      <PageMessageArea message={state.error} onClose={() => state.setError('')} salesSpacing="outer" />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 280, minWidth: 0, p: 2 }}>
        <Splitter direction="horizontal" mobileMode="stacked" mobileBreakpoint={768}
          minSize={400} maxSize={1000} initialSize={430} ariaLabel="거래처와 납품처 영역 분리기">
        <Card variant="outlined" sx={{ borderRadius: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
          <CardContent sx={{ pt: 1, px: 2, pb: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', '&:last-child': { pb: 2 } }}>
          <Box sx={{ py: 1.2, display: 'flex', justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>거래처 관리</Typography>
          </Box>
          <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <F1Grid key={selectionKey} ariaLabel="거래처 목록" storageKey="sales-destination-customers-v1"
            rows={state.customers} columns={customerColumns} rowKey="customerId" height="100%"
            initialSelectedRowIds={state.customerId === null ? undefined : [state.customerId]}
            loading={state.loading} showCheckbox={false} selectionMode="row" multiSelect={false}
            rowFormPlugin={{ enabled: false }} allowAddRowInContextMenu={false}
            allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
            onSelectionChange={(ids) => { if (ids[0] != null) void selectCustomer(Number(ids[0])); }} />
          </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }}>
          <CardContent sx={{ pt: 1, px: 2, pb: 2, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', overflow: 'hidden', '&:last-child': { pb: 2 } }}>
          <Box sx={{ py: 1.2, display: 'flex', justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' }, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>납품처 관리</Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%', textAlign: 'right',
            }}>
              {selectedCustomer ? `선택 거래처: ${selectedCustomer.customerName}` : '선택 거래처가 없습니다'}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <F1Grid key={state.gridKey} ref={gridRef} ariaLabel="납품처 목록"
              storageKey="sales-destination-list-v2" rows={state.rows} columns={columns}
              rowKey="salesDestinationId" height="100%" loading={state.rowsLoading}
              showCheckbox={false} selectionMode="row" multiSelect={false}
              createRow={customerId === null ? undefined : () => ({
                salesDestinationId: `new-${crypto.randomUUID()}`, customerId,
                destinationCode: '', destinationName: '', businessNo: '', address: '', contactName: '',
                mobileNo: '', telephoneNo: '', facsimileNo: '', remark: '',
              })}
              rowFormPlugin={customerId !== null && (canCreate || canUpdate) ? {
                getTitle: ({ mode }) => mode === 'create' ? '납품처 등록' : '납품처 수정',
                onBeforeApply: ({ mode, draftRow }) =>
                  mode === 'create' || typeof draftRow.salesDestinationId === 'string' ? canCreate : canUpdate,
              } : { enabled: false }}
              allowAddRowInContextMenu={customerId !== null && canCreate} allowDuplicateRowInContextMenu={false}
              allowDeleteRowInContextMenu={false}
              onChangesChange={(changes) => state.setHasChanges(Boolean(changes.insertedRows.length || changes.updatedRows.length))}
              onSelectionChange={(ids) => state.setSelectedId(typeof ids[0] === 'number' ? ids[0] : null)} />
          </Box>
          </CardContent>
        </Card>
        </Splitter>
      </Box>
      {dialog}
    </Box>
  );
}
