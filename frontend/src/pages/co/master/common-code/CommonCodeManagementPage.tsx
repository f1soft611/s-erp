import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { type PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  CommonCodeManagementPanel,
  type CommonCodeManagementPanelHandle,
} from './components/CommonCodeManagementPanel';
import { fetchCommonCodeGroups } from './services/commonCodeManagement.service';
import type { CommonCodeGroupRow } from './types/commonCodeManagement.types';

type CommonCodeManagementPageProps = {
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

export function CommonCodeManagementPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: CommonCodeManagementPageProps) {
  const { showSuccess } = useNotification();
  const panelRef = useRef<CommonCodeManagementPanelHandle>(null);
  const [groups, setGroups] = useState<CommonCodeGroupRow[]>([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [commonCodeGridKey, setCommonCodeGridKey] = useState(0);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const groupRequestIdRef = useRef(0);

  const pageActionPermissions = useMemo(() => {
    const writeAllowed = Boolean(
      selectedMenuPermissions?.create || selectedMenuPermissions?.update,
    );

    return {
      read: Boolean(selectedMenuPermissions?.read ?? false),
      write: writeAllowed,
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    };
  }, [selectedMenuPermissions]);

  const loadGroups = useCallback(
    async ({ showSkeleton = false }: { showSkeleton?: boolean } = {}) => {
      const requestId = ++groupRequestIdRef.current;
      setError('');
      if (showSkeleton) {
        setPageLoading(true);
      }
      try {
        const result = await fetchCommonCodeGroups();
        if (requestId === groupRequestIdRef.current) {
          setGroups(result);
        }
      } catch (requestError) {
        if (requestId === groupRequestIdRef.current) {
          setGroups([]);
          setError(
            requestError instanceof Error
              ? requestError.message
              : '공통코드 목록을 불러오지 못했습니다.',
          );
        }
        throw requestError;
      } finally {
        if (requestId === groupRequestIdRef.current && showSkeleton) {
          setPageLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadGroups({ showSkeleton: true }).catch(() => undefined);
  }, [loadGroups]);

  const handleGroupsSaved = useCallback(
    async (_options?: { silent?: boolean }) => {
      await loadGroups();
      setPanelDirty(false);
      setCommonCodeGridKey((current) => current + 1);
    },
    [loadGroups],
  );

  const handleSaveChanges = useCallback(async () => {
    if (!panelRef.current) return;
    setSaving(true);
    try {
      await panelRef.current.saveCurrentChanges();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : '공통코드 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }, []);

  const requestRefresh = useCallback(() => {
    if (panelDirty) {
      setRefreshConfirmOpen(true);
      return;
    }
    void loadGroups({ showSkeleton: true });
  }, [loadGroups, panelDirty]);

  const confirmRefresh = useCallback(() => {
    setRefreshConfirmOpen(false);
    setPanelDirty(false);
    setCommonCodeGridKey((current) => current + 1);
    void loadGroups({ showSkeleton: true });
  }, [loadGroups]);

  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: pageActionPermissions.read,
          disabled: false,
          onClick: requestRefresh,
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
          placeholder="그룹 코드/명/설명 검색"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': '공통코드 검색' },
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize="small"
                  sx={{ mr: 0.5, color: 'text.secondary' }}
                />
              ),
            },
          }}
          sx={(theme) => ({
            flex: '1 1 240px',
            minWidth: { xs: '100%', sm: 240 },
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
      <CommonCodeManagementPanel
        ref={panelRef}
        groups={groups}
        searchQuery={searchQuery}
        canExportExcel={pageActionPermissions.excel}
        onGroupsSaved={handleGroupsSaved}
        onSaveSuccess={showSuccess}
        onDirtyChange={setPanelDirty}
        onError={setError}
        commonCodeGridKey={commonCodeGridKey}
        groupsLoading={pageLoading}
      />
      <UnsavedChangesConfirmDialog
        open={refreshConfirmOpen}
        title="저장하지 않은 변경사항"
        description="변경사항을 버리고 공통코드 목록을 다시 불러오시겠습니까?"
        cancelLabel="취소"
        continueLabel="계속"
        onCancel={() => setRefreshConfirmOpen(false)}
        onContinue={confirmRefresh}
      />
    </Box>
  );
}
