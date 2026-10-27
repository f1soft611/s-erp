import { Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { SalesOrderStatusGrid } from './components/SalesOrderStatusGrid';
import { SalesOrderStatusSearchArea } from './components/SalesOrderStatusSearchArea';
import { useSalesOrderStatusList } from './hooks/useSalesOrderStatusList';
import { useSalesOrderStatusSearch } from './hooks/useSalesOrderStatusSearch';

type SalesOrderStatusPageProps = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

export function SalesOrderStatusPage({
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: SalesOrderStatusPageProps) {
  const search = useSalesOrderStatusSearch();
  const list = useSalesOrderStatusList(search.appliedFilters);
  const pageActionGroups: PermissionActionGroupDefinition[] = [
    {
      key: 'read',
      actions: [
        {
          label: '조회',
          icon: SearchIcon,
          visible: selectedMenuPermissions?.read ?? false,
          disabled: !search.defaultsInitialized || list.loading,
          onClick: () => search.applySearch(),
        },
      ],
    },
  ];

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
        description={content.description}
        actionGroups={pageActionGroups}
      />
      <PageLoadBoundary
        {...search.defaultsInitialLoad}
        label="검색 기본값"
        onRetry={search.retryDefaults}
      >
        <PageLoadBoundary {...list.initialLoad} label="수주현황" onRetry={list.retry}>
        <SalesOrderStatusSearchArea
          keyword={search.keyword}
          onKeywordChange={search.setKeyword}
          detailFields={search.detailFields}
          detailValues={search.detailValues}
          defaultValues={search.defaultValues}
          onDetailValuesChange={search.setDetailValues}
          onSearch={search.applySearch}
          onReset={search.resetSearch}
          initialized={search.defaultsInitialized}
          loading={search.defaultsLoading || list.loading}
        />
        <PageMessageArea
          message={search.defaultsError ?? list.error}
          onClose={list.clearError}
        />
        <Box
          sx={{
            px: { xs: 1, sm: 2 },
            pb: 2,
            pt: 1,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 360,
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
            <SalesOrderStatusGrid
              rows={list.rows}
              loading={list.loading}
              canExportExcel={selectedMenuPermissions?.excel ?? false}
            />
          </Box>
        </Box>
        </PageLoadBoundary>
      </PageLoadBoundary>
    </Box>
  );
}
