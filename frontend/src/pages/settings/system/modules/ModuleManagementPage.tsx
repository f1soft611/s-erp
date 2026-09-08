import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  ModuleManagementPanel,
  type ModuleManagementPanelHandle,
} from './components/ModuleManagementPanel';
import {
  createModule,
  deleteModule,
  fetchModuleRows,
  updateModule,
} from './services/moduleManagement.service';
import type { ModuleManagementRow } from './types/moduleManagement.types';

type ModuleManagementPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: {
    read: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    excel?: boolean;
  };
};

export function ModuleManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: ModuleManagementPageProps) {
  const modulePanelRef = useRef<ModuleManagementPanelHandle>(null);
  const [modules, setModules] = useState<ModuleManagementRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [moduleGridKey, setModuleGridKey] = useState(0);
  const moduleRequestIdRef = useRef(0);

  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return modules;
    return modules.filter((module) =>
      [module.moduleCode, module.moduleName, module.iconName, module.moduleUrl]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [modules, searchQuery]);

  const pageActionPermissions = useMemo(
    () => ({
      read: Boolean(selectedMenuPermissions?.read ?? true),
      write: Boolean(
        selectedMenuPermissions?.create ||
        selectedMenuPermissions?.update ||
        true,
      ),
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    }),
    [selectedMenuPermissions],
  );

  const loadModules = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      const requestId = ++moduleRequestIdRef.current;
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }

      try {
        const result = await fetchModuleRows();
        if (requestId === moduleRequestIdRef.current) {
          setModules(result);
        }
      } catch (requestError) {
        if (requestId === moduleRequestIdRef.current) {
          setModules([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '모듈 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === moduleRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadModules({ showSkeleton: true }).catch(() => undefined);
  }, [loadModules]);

  const handleModulesSaved = useCallback(async () => {
    await loadModules();
    setModuleGridKey((current) => current + 1);
  }, [loadModules]);

  const handleSaveChanges = useCallback(async () => {
    if (!modulePanelRef.current) return;
    setSaving(true);
    try {
      await modulePanelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '모듈 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, []);

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
            void loadModules({ showSkeleton: true });
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
          disabled: !panelDirty || saving,
          onClick: () => {
            void handleSaveChanges();
          },
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems && breadcrumbItems.length > 0
            ? breadcrumbItems
            : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageSearchArea>
        <TextField
          size="small"
          margin="none"
          placeholder="모듈 코드/명/경로/아이콘 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '모듈 검색' },
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: 'text.secondary' }}
                />
              ),
            },
          }}
          sx={{
            flex: '1 1 220px',
            minWidth: { xs: '100%', sm: 220 },
            maxWidth: 360,
            height: 40,
          }}
        />
      </PageSearchArea>
      <PageMessageArea message={error} onClose={() => setError('')} />
      <ModuleManagementPanel
        ref={modulePanelRef}
        modules={filteredModules}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        onCreateModule={createModule}
        onUpdateModule={updateModule}
        onDeleteModule={deleteModule}
        onModulesSaved={handleModulesSaved}
        onDirtyChange={setPanelDirty}
        onError={setError}
        moduleGridKey={moduleGridKey}
        moduleGridLoading={pageLoading}
      />
    </Box>
  );
}
