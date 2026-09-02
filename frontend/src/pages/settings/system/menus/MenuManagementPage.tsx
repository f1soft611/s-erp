import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  MenuPermission,
  MenuTreeNode,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { MenuManagementPanel } from './components/MenuManagementPanel';
import { MENU_PERMISSION_GROUPS } from './constants/menuPermissionGroups';
import {
  fetchActivePermissions,
  fetchMenuRows,
  fetchModules,
} from './services/menuManagement.service';
import type {
  MenuManagementRow,
  MenuModuleOption,
  MenuPermissionDefinition,
} from './types/menuManagement.types';

type MenuManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function MenuManagementPage({
  selectedModule: dashboardModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: MenuManagementPageProps) {
  const { showSuccess } = useNotification();
  const [menus, setMenus] = useState<MenuManagementRow[]>([]);
  const [modules, setModules] = useState<MenuModuleOption[]>([]);
  const [permissions, setPermissions] = useState<MenuPermissionDefinition[]>(
    [],
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number>();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<number>();
  const [pendingPermissionReload, setPendingPermissionReload] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuLoadRequestIdRef = useRef(0);
  const menuPanelRef = useRef<{
    saveCurrentChanges: () => Promise<void>;
    deleteSelectedRows: () => void;
    exportCurrentRows: () => void;
  } | null>(null);

  const hasPermission = (permissionCode: string) =>
    permissions.some(
      (permission) => permission.permissionCode === permissionCode,
    );

  const currentPagePermission = (() => {
    const normalize = (value: string) =>
      value.replace(/\s+/g, '').toLowerCase();

    const findPagePermission = (
      nodes: MenuTreeNode[],
    ): MenuPermission | undefined => {
      for (const node of nodes) {
        const sameName =
          normalize(node.name ?? '') === normalize(currentMenuName);
        const sameLabel =
          normalize(node.name ?? '') === normalize(String(content.title ?? ''));

        if ((sameName || sameLabel) && node.permissions) {
          return node.permissions;
        }

        if (node.children?.length) {
          const nestedPermission = findPagePermission(node.children);
          if (nestedPermission) return nestedPermission;
        }
      }

      return undefined;
    };

    return (
      selectedMenuPermissions ??
      findPagePermission(dashboardModule.tree ?? []) ?? {
        read: MENU_PERMISSION_GROUPS[0].codes.some((code) =>
          hasPermission(code),
        ),
        create: MENU_PERMISSION_GROUPS[1].codes.some(
          (code) => hasPermission(code) && code === 'CREATE',
        ),
        update: MENU_PERMISSION_GROUPS[1].codes.some(
          (code) => hasPermission(code) && code === 'UPDATE',
        ),
        delete: MENU_PERMISSION_GROUPS[2].codes.some((code) =>
          hasPermission(code),
        ),
        excel: MENU_PERMISSION_GROUPS[3].codes.some((code) =>
          hasPermission(code),
        ),
      }
    );
  })();

  const pageActionPermissions = {
    read: Boolean(currentPagePermission?.read ?? false),
    write: Boolean(
      currentPagePermission?.create || currentPagePermission?.update || false,
    ),
    delete: Boolean(currentPagePermission?.delete ?? false),
    excel: Boolean(currentPagePermission?.excel ?? false),
  };

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: false,
          onClick: () => {
            if (!selectedModuleId) return;
            void requestRefresh(selectedModuleId);
          },
        },
      ],
    },
    {
      key: 'write',
      actions: [
        {
          label: '저장',
          icon: SaveIcon,
          visible: pageActionPermissions.write,
          disabled: !dirty || saving,
          onClick: async () => {
            if (!menuPanelRef.current) return;
            await menuPanelRef.current.saveCurrentChanges();
          },
        },
      ],
    },
    {
      key: 'delete',
      actions: [
        {
          label: '삭제',
          icon: DeleteIcon,
          visible: pageActionPermissions.delete,
          disabled: false,
          onClick: () => {
            menuPanelRef.current?.deleteSelectedRows();
          },
        },
      ],
    },
    {
      key: 'excel',
      actions: [
        {
          label: '엑셀',
          icon: DownloadIcon,
          visible: pageActionPermissions.excel,
          disabled: false,
          onClick: () => {
            menuPanelRef.current?.exportCurrentRows();
          },
        },
      ],
    },
  ];

  async function loadMenus(
    moduleId: number,
    reloadPermissions = false,
    clearVisibleMenus = false,
  ) {
    const requestId = ++menuLoadRequestIdRef.current;
    setLoading(true);
    if (clearVisibleMenus) setMenus([]);
    try {
      setError('');
      const [nextMenus, nextPermissions] = await Promise.all([
        fetchMenuRows(moduleId),
        reloadPermissions
          ? fetchActivePermissions()
          : Promise.resolve(undefined),
      ]);
      if (requestId !== menuLoadRequestIdRef.current) return;
      console.log(
        'loadMenus resolved',
        moduleId,
        nextMenus.length,
        nextPermissions,
      );
      setMenus(nextMenus);
      if (nextPermissions) setPermissions(nextPermissions);
      setDirty(false);
    } catch (requestError) {
      if (requestId !== menuLoadRequestIdRef.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : '메뉴 목록을 불러오지 못했습니다.',
      );
      return undefined;
    } finally {
      if (requestId === menuLoadRequestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      setLoading(true);
      setError('');
      try {
        const [nextModules, nextPermissions] = await Promise.all([
          fetchModules(),
          fetchActivePermissions(),
        ]);
        console.log('init modules', nextModules, nextPermissions);
        setModules(nextModules);
        setPermissions(nextPermissions);
        const firstModule = nextModules[0];
        setSelectedModuleId(firstModule?.moduleId);
        if (firstModule) await loadMenus(firstModule.moduleId);
      } catch (requestError) {
        setMenus([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : '메뉴 관리 정보를 불러오지 못했습니다.',
        );
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, []);

  const selectedModule = modules.find(
    (module) => module.moduleId === selectedModuleId,
  );

  function requestModuleChange(moduleId: number) {
    if (loading || moduleId === selectedModuleId) return;
    if (dirty) {
      setPendingModuleId(moduleId);
      setPendingPermissionReload(true);
      setConfirmOpen(true);
      return;
    }
    setSelectedModuleId(moduleId);
    void loadMenus(moduleId, true, true).catch(() => undefined);
  }

  function requestRefresh(moduleId: number, bypassDirtyConfirmation = false) {
    if (loading) return Promise.resolve();
    if (dirty && !bypassDirtyConfirmation) {
      setPendingModuleId(moduleId);
      setPendingPermissionReload(false);
      setConfirmOpen(true);
      return Promise.resolve();
    }
    return loadMenus(moduleId);
  }

  function confirmDiscardChanges() {
    const nextModuleId = pendingModuleId;
    const reloadPermissions = pendingPermissionReload;
    setConfirmOpen(false);
    setPendingModuleId(undefined);
    setPendingPermissionReload(false);
    if (nextModuleId === undefined) return;
    const moduleChanged = nextModuleId !== selectedModuleId;
    if (moduleChanged) setSelectedModuleId(nextModuleId);
    void loadMenus(nextModuleId, reloadPermissions, moduleChanged).catch(
      () => undefined,
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems && breadcrumbItems.length > 0
            ? breadcrumbItems
            : [dashboardModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea>
        <FormControl
          size="small"
          sx={(theme) => ({
            width: { xs: '100%', sm: 'auto' },
            minWidth: { sm: 220 },
            maxWidth: '100%',
            flex: '0 1 280px',
            height: 40,
            m: 0,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.72)'
                  : 'rgba(255,255,255,0.72)',
            },
          })}
        >
          <Select
            value={selectedModuleId ?? ''}
            displayEmpty
            inputProps={{ 'aria-label': '모듈 선택' }}
            disabled={loading || saving || modules.length === 0}
            onChange={(event) =>
              requestModuleChange(Number(event.target.value))
            }
            renderValue={(selected) => {
              if (selectedModuleId === undefined) return '모듈 선택';
              const matchingModule = modules.find(
                (module) => module.moduleId === Number(selected),
              );
              return matchingModule?.moduleName ?? '모듈 선택';
            }}
            sx={{
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                minHeight: '40px',
                paddingTop: '8px',
                paddingBottom: '8px',
              },
            }}
          >
            {modules.map((module) => (
              <MenuItem key={module.moduleId} value={module.moduleId}>
                {module.moduleName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          margin="none"
          placeholder="메뉴명/코드 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && selectedModuleId) {
              event.preventDefault();
              void requestRefresh(selectedModuleId);
            }
          }}
          slotProps={{
            htmlInput: { 'aria-label': '메뉴 검색' },
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: 'text.secondary' }}
                />
              ),
              endAdornment: searchQuery ? (
                <IconButton
                  size="small"
                  aria-label="검색어 초기화"
                  onClick={() => setSearchQuery('')}
                  edge="end"
                  sx={{ p: 0.25 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              ) : null,
            },
          }}
          sx={(theme) => ({
            flex: '1 1 220px',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: 360,
            height: 40,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: 2,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? 'rgba(15, 23, 42, 0.72)'
                  : 'rgba(255,255,255,0.72)',
            },
          })}
        />
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          pt: 1,
        }}
      >
        <MenuManagementPanel
          ref={menuPanelRef}
          key={selectedModuleId ?? 'none'}
          menus={menus}
          selectedModule={selectedModule}
          permissions={permissions}
          onRefresh={requestRefresh}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          onSaveSuccess={showSuccess}
          onError={setError}
        />
      </Box>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>저장하지 않은 변경사항</DialogTitle>
        <DialogContent>
          <DialogContentText>
            변경사항을 버리고 메뉴 목록을 다시 불러오시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>취소</Button>
          <Button onClick={confirmDiscardChanges} autoFocus>
            계속
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
