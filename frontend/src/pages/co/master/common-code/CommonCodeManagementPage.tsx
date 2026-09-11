import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { UnsavedChangesConfirmDialog } from '../../../../shared/components/UnsavedChangesConfirmDialog';
import { useNotification } from '../../../../shared/context/NotificationContext';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type {
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import {
  CommonCodeManagementPanel,
  type CommonCodeManagementPanelHandle,
} from './components/CommonCodeManagementPanel';
import {
  commonCodeGroupSeed,
  commonCodeItemSeed,
} from './data/commonCodeManagement.data';
import type {
  CommonCodeGroupRow,
  CommonCodeItemRow,
} from './types/commonCodeManagement.types';

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
  const [groups, setGroups] = useState<CommonCodeGroupRow[]>(commonCodeGroupSeed);
  const [items, setItems] = useState<CommonCodeItemRow[]>(commonCodeItemSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState(
    commonCodeGroupSeed.find((group) => group.parentGroupId === null)?.id ??
      commonCodeGroupSeed[0].id,
  );
  const [error, setError] = useState('');
  const [panelDirty, setPanelDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false);
  const [commonCodeGridKey, setCommonCodeGridKey] = useState(0);

  const pageActionPermissions = useMemo(
    () => ({
      read: Boolean(selectedMenuPermissions?.read ?? false),
      write: Boolean(
        selectedMenuPermissions?.create || selectedMenuPermissions?.update,
      ),
      excel: Boolean(selectedMenuPermissions?.excel ?? false),
    }),
    [selectedMenuPermissions],
  );

  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) =>
      [group.groupCode, group.groupNm, group.groupDc]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [groups, searchQuery]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [item.itemCode, item.itemNm, item.itemDc, item.parentItemNm]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [items, searchQuery]);

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
    setError('');
  }, [panelDirty]);

  const confirmRefresh = useCallback(() => {
    setRefreshConfirmOpen(false);
    setPanelDirty(false);
    setGroups(commonCodeGroupSeed);
    setItems(commonCodeItemSeed);
    setSelectedGroupId(
      commonCodeGroupSeed.find((group) => group.parentGroupId === null)?.id ??
        commonCodeGroupSeed[0].id,
    );
    setCommonCodeGridKey((current) => current + 1);
    setError('');
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
    {
      key: 'excel',
      actions: [
        {
          label: '엑셀',
          icon: DownloadOutlined,
          visible: pageActionPermissions.excel,
          onClick: () => panelRef.current?.exportCurrentRows(),
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
      <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          공통코드 관리
        </Typography>
      </Box>
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
        groups={filteredGroups}
        items={filteredItems}
        selectedGroupId={selectedGroupId}
        canExportExcel={pageActionPermissions.excel}
        onSelectedGroupChange={setSelectedGroupId}
        onDirtyChange={setPanelDirty}
        onGroupsSaved={setGroups}
        onItemsSaved={setItems}
        onSaveSuccess={showSuccess}
        onError={setError}
        commonCodeGridKey={commonCodeGridKey}
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
