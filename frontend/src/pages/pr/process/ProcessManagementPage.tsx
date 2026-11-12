import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteForeverOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { Box, TextField } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ProcessManagementTree } from './components/ProcessManagementTree';
import { useProcessManagement } from './hooks/useProcessManagement';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function ProcessManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: Props) {
  const management = useProcessManagement();
  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description} actionGroups={[
          { key: 'write', actions: [
            { label: '공정그룹 추가', icon: AddIcon, visible: canCreate, disabled: management.loading || management.saving || Boolean(management.appliedQuery), onClick: management.addGroup },
            { label: '공정 추가', icon: AddIcon, visible: canCreate, disabled: management.loading || management.saving || !management.parentId || Boolean(management.appliedQuery), onClick: management.addProcess },
            { label: '저장', icon: SaveIcon, visible: canCreate || canUpdate || canDelete, disabled: !management.dirty || management.saving, onClick: () => void management.save() },
          ] },
          { key: 'delete', actions: [{ label: '삭제', icon: DeleteOutlineIcon, visible: canDelete, disabled: management.saving || management.selected.length === 0, onClick: () => management.treeRef.current?.deleteSelectedRows() }] },
        ]} />
      <PageSearchArea searchField={<TextField size="small" margin="none" value={management.query} placeholder="공정그룹 / 공정 검색"
        disabled={management.dirty || management.loading || management.saving} onChange={(event) => management.setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') management.setAppliedQuery(management.query); }}
        slotProps={{ htmlInput: { 'aria-label': '공정 검색' } }}
        sx={(theme) => ({
          width: '100%',
          height: 40,
          '& .MuiOutlinedInput-root': {
            height: '100%',
            borderRadius: '0 6px 6px 0',
            backgroundColor: theme.palette.background.paper,
          },
        })} />}
        onDefaultSearch={() => { if (!management.dirty) management.setAppliedQuery(management.query); }} />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} horizontalPadding="grid" />
      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, px: { xs: 1, sm: 2 }, py: 1 }}>
        <ProcessManagementTree treeRef={management.treeRef} rows={management.visibleRows} version={management.version}
          loading={management.loading} saving={management.saving} filtered={Boolean(management.appliedQuery)}
          canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} onSelection={management.onSelection}
          onChanges={management.onChanges} onError={management.setError} onAddGroup={management.addGroup}
          onAddProcess={management.addProcessUnder} />
      </Box>
    </Box>
  );
}
