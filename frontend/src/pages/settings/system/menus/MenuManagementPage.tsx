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
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useTheme,
} from '@mui/material';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { MenuManagementPanel } from './components/MenuManagementPanel';
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
};

export function MenuManagementPage({
  selectedModule: dashboardModule,
  currentMenuName,
  content,
}: MenuManagementPageProps) {
  const theme = useTheme();
  const { showSuccess } = useNotification();
  const isDark = theme.palette.mode === 'dark';
  const [menus, setMenus] = useState<MenuManagementRow[]>([]);
  const [modules, setModules] = useState<MenuModuleOption[]>([]);
  const [permissions, setPermissions] = useState<MenuPermissionDefinition[]>(
    [],
  );
  const [selectedModuleId, setSelectedModuleId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<number>();
  const [pendingPermissionReload, setPendingPermissionReload] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const menuLoadRequestIdRef = useRef(0);

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
      throw requestError;
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
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid rgba(148,163,184,0.18)',
          bgcolor: isDark
            ? 'rgba(15, 23, 42, 0.75)'
            : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: '#64748b', letterSpacing: 1.4 }}
        >
          {dashboardModule.name} / {currentMenuName}
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mt: 0.5, fontWeight: 800 }}
        >
          {content.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {content.description}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <FormControl
            size="small"
            sx={{
              width: { xs: '100%', sm: 'auto' },
              minWidth: { sm: 220 },
              maxWidth: '100%',
              flex: '0 1 280px',
            }}
          >
            <InputLabel id="menu-module-label">모듈 선택</InputLabel>
            <Select
              labelId="menu-module-label"
              label="모듈 선택"
              value={selectedModuleId ?? ''}
              disabled={loading || saving || modules.length === 0}
              onChange={(event) =>
                requestModuleChange(Number(event.target.value))
              }
            >
              {modules.map((module) => (
                <MenuItem key={module.moduleId} value={module.moduleId}>
                  {module.moduleName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <MenuManagementPanel
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
