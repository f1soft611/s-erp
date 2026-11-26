import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteForeverOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import { Box, TextField } from '@mui/material';
import { PageHeader } from '../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../shared/components/PageSearchArea';
import type { MenuPermission, ModuleItem, PageContent } from '../../dashboard/types/dashboard';
import { ProcessManagementTree } from './components/ProcessManagementTree';
import { ProcessMasterDialog } from './components/ProcessMasterDialog';
import { ProcessPickerDialog } from './components/ProcessPickerDialog';
import { useCommonConfirmDialog } from '../../../shared/hooks/useCommonConfirmDialog';
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
  const { confirm, dialog: confirmDialog } = useCommonConfirmDialog();
  /** 조회(새로고침). 저장하지 않은 변경이 있으면 공통 확인 모달에서 버릴지 먼저 확인한다. */
  const refresh = async () => {
    if (management.dirty && !await confirm({
      title: '저장하지 않은 변경사항',
      description: '저장하지 않은 변경사항이 사라집니다. 다시 조회하시겠습니까?',
      confirmLabel: '조회', cancelLabel: '취소',
    })) return;
    await management.reload();
  };
  const canRead = Boolean(selectedMenuPermissions?.read);
  const canCreate = Boolean(selectedMenuPermissions?.create);
  const canUpdate = Boolean(selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
      <PageHeader breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description} actionGroups={[
          { key: 'write', actions: [
            { label: '공정 설정', icon: SettingsIcon, visible: canCreate || canUpdate || canDelete, disabled: management.loading || management.saving || management.dirty, onClick: management.openSettings },
            { label: '작업장 추가', icon: AddIcon, visible: canCreate, disabled: management.loading || management.saving || Boolean(management.appliedQuery), onClick: management.addWorkplace },
            { label: '공정 추가', icon: AddIcon, visible: canCreate, disabled: management.loading || management.saving || !management.parentId || Boolean(management.appliedQuery), onClick: management.addProcess },
            { label: '조회', icon: SearchIcon, visible: canRead, disabled: management.loading || management.saving, onClick: () => void refresh() },
            { label: '저장', icon: SaveIcon, visible: canCreate || canUpdate || canDelete, disabled: !management.dirty || management.saving, onClick: () => void management.save() },
          ] },
          { key: 'delete', actions: [{ label: '삭제', icon: DeleteOutlineIcon, visible: canDelete, disabled: management.saving || management.selected.length === 0, onClick: () => management.treeRef.current?.deleteSelectedRows() }] },
        ]} />
      <PageSearchArea searchField={<TextField size="small" margin="none" value={management.query} placeholder="작업장 / 공정 검색"
        disabled={management.dirty || management.loading || management.saving} onChange={(event) => management.setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') management.setAppliedQuery(management.query); }}
        slotProps={{ htmlInput: { 'aria-label': '공정 검색' } }}
        sx={(theme) => ({
          width: '100%',
          height: 40,
          '& .MuiOutlinedInput-root': {
            height: '100%',
            borderRadius: '0 4px 4px 0',
            backgroundColor: theme.palette.background.paper,
          },
        })} />}
        onDefaultSearch={() => { if (!management.dirty) management.setAppliedQuery(management.query); }} />
      <PageMessageArea message={management.error} onClose={() => management.setError('')} pageSpacing="outer" />
      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, p: 2 }}>
        <ProcessManagementTree treeRef={management.treeRef} rows={management.visibleRows} version={management.version}
          loading={management.loading} saving={management.saving} filtered={Boolean(management.appliedQuery)}
          canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} onSelection={management.onSelection}
          onChanges={management.onChanges} onError={management.setError} onAddWorkplace={management.addWorkplace}
          onAddProcess={management.addProcessUnder} />
      </Box>
      {confirmDialog}
      {management.settingsOpen && (
        <ProcessMasterDialog canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete}
          onClose={management.closeSettings} onSaved={() => void management.reload({ silent: true })} />
      )}
      {management.pickerWorkplaceId && (
        <ProcessPickerDialog workplaceName={management.workplaceName(management.pickerWorkplaceId)}
          masters={management.masters} linkedProcessIds={management.linkedProcessIds(management.pickerWorkplaceId)}
          loading={management.mastersLoading} error={management.mastersError}
          onClose={management.closePicker} onConfirm={management.confirmPicker} />
      )}
    </Box>
  );
}
