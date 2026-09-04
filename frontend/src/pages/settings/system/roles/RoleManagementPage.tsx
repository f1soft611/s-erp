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
  RoleManagementPanel,
  type RoleManagementPanelHandle,
} from './components/RoleManagementPanel';
import {
  createRole,
  fetchRoleRows,
  updateRole,
  type RoleSavePayload,
} from './services/roleManagement.service';
import type { RoleManagementRow } from './types/roleManagement.types';

type RoleManagementPageProps = {
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

export function RoleManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: RoleManagementPageProps) {
  const rolePanelRef = useRef<RoleManagementPanelHandle>(null);
  const [roles, setRoles] = useState<RoleManagementRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [roleGridKey, setRoleGridKey] = useState(0);
  const roleRequestIdRef = useRef(0);

  const pageActionPermissions = useMemo(() => {
    const writeAllowed = Boolean(
      selectedMenuPermissions?.create ||
      selectedMenuPermissions?.update ||
      true,
    );

    return {
      read: Boolean(selectedMenuPermissions?.read ?? true),
      write: writeAllowed,
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    };
  }, [selectedMenuPermissions]);

  const loadRoles = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      const requestId = ++roleRequestIdRef.current;
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }
      try {
        const result = await fetchRoleRows();
        if (requestId === roleRequestIdRef.current) {
          setRoles(result);
        }
      } catch (requestError) {
        if (requestId === roleRequestIdRef.current) {
          setRoles([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '역할 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === roleRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadRoles({ showSkeleton: true }).catch(() => undefined);
  }, [loadRoles]);

  const handleCreateRole = async (payload: RoleSavePayload) => {
    await createRole(payload);
  };

  const handleUpdateRole = async (roleId: string, payload: RoleSavePayload) => {
    await updateRole(roleId, payload);
  };

  const handleRolesSaved = useCallback(
    async (_options?: { silent?: boolean }) => {
      await loadRoles();
      setRoleGridKey((current) => current + 1);
    },
    [loadRoles],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!rolePanelRef.current) return;
    setSaving(true);
    try {
      await rolePanelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '역할 저장에 실패했습니다.',
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
            void loadRoles({ showSkeleton: true });
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
          placeholder="역할 코드/명/설명 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '역할 검색' },
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
      <RoleManagementPanel
        ref={rolePanelRef}
        roles={roles}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        onCreateRole={handleCreateRole}
        onUpdateRole={handleUpdateRole}
        onRolesSaved={handleRolesSaved}
        onDirtyChange={setPanelDirty}
        onError={setError}
        roleGridKey={roleGridKey}
        roleGridLoading={pageLoading}
      />
    </Box>
  );
}
