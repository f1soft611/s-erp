import { useState, type ReactNode } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageLoadBoundary } from '../../../../shared/components/PageLoadBoundary';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import { usePageSessionState } from '../../../../shared/hooks/usePageSessionState';
import {
  isPageSearchValues,
  type PageSearchFieldValue,
} from '../../../../shared/components/page-search/searchFields';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { ItemPartnerPriceGrid } from './components/ItemPartnerPriceGrid';
import {
  PRICE_HISTORY_FIELD,
  PRICE_TRADE_TYPE_FIELD,
  PRICE_USE_AT_FIELD,
  searchText,
} from './data/priceSearchFields';
import { useItemPartnerPriceCodes } from './hooks/useItemPartnerPriceCodes';
import { useItemPartnerPriceManagement } from './hooks/useItemPartnerPriceManagement';
import type { ItemPartnerPriceFilters } from './types/itemPartnerPrice.types';

const SESSION_KEY = 's-erp:page:item-partner-prices';
const SESSION_VERSION = 2;
const DETAIL_FIELDS = [PRICE_TRADE_TYPE_FIELD, PRICE_USE_AT_FIELD, PRICE_HISTORY_FIELD];
const DEFAULT_DETAIL_VALUES: Record<string, PageSearchFieldValue> = { includeHistory: 'Y' };

type SearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

function isSearchSession(value: unknown): value is SearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toFilters(session: SearchSession): ItemPartnerPriceFilters {
  const filters: ItemPartnerPriceFilters = {
    keyword: session.keyword.trim() || undefined,
  };
  const tradeType = searchText(session.detailValues, 'tradeType');
  const useAt = searchText(session.detailValues, 'useAt');
  // 이력 목록이므로 기본은 종료된 과거 단가까지 보여 준다. "현재·예정만"을 고르면 과거를 숨긴다.
  if (session.detailValues.includeHistory !== 'N') filters.includeHistory = true;
  if (tradeType) filters.tradeType = tradeType as ItemPartnerPriceFilters['tradeType'];
  if (useAt) filters.useAt = useAt as ItemPartnerPriceFilters['useAt'];
  return filters;
}

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems?: string[];
  selectedMenuPermissions?: MenuPermission;
  /** 탭 호스트가 넘기는 탭 막대. 헤더 아래에 그린다. */
  tabs?: ReactNode;
};

/**
 * 단가 이력 조회 화면(조회 전용). 단가 입력·정정은 "품목 기준" 탭에서 하고,
 * 여기서는 종료된 과거 단가를 포함해 기간별 단가를 조회·엑셀로 내보내기만 한다.
 */
export function ItemPartnerPriceListPage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  tabs,
}: Props) {
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<SearchSession | null>(SESSION_KEY, null, {
      version: SESSION_VERSION,
      validate: (value): value is SearchSession | null =>
        value === null || isSearchSession(value),
    });
  const codeOptions = useItemPartnerPriceCodes();
  const management = useItemPartnerPriceManagement(
    toFilters(searchSession ?? { keyword: '', detailValues: DEFAULT_DETAIL_VALUES }),
  );
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(
    searchSession?.detailValues ?? DEFAULT_DETAIL_VALUES,
  );
  const detailFields = DETAIL_FIELDS;

  const search = (session: SearchSession) => {
    management.applyFilters(toFilters(session));
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };
  const searchDefault = () => search({
    keyword: keyword.trim(),
    detailValues: searchSession?.detailValues ?? DEFAULT_DETAIL_VALUES,
  });
  const searchDetails = (values: Record<string, PageSearchFieldValue>) =>
    search({ keyword: keyword.trim(), detailValues: values });

  const actions: PermissionActionGroupDefinition[] = [
    { key: 'read', actions: [{
      label: '조회',
      icon: SearchIcon,
      visible: Boolean(selectedMenuPermissions?.read),
      onClick: searchDefault,
    }] },
  ];

  return (
    <Box sx={{
      display: 'flex', flex: 1, flexDirection: 'column',
      minHeight: 0, minWidth: 0, height: '100%',
    }}>
      <PageHeader
        breadcrumbItems={breadcrumbItems?.length
          ? breadcrumbItems : [selectedModule.name, currentMenuName]}
        description={content.description}
        actionGroups={actions}
      />
      {tabs}
      <PageLoadBoundary
        {...management.initialLoad}
        label="단가 목록"
        onRetry={() => management.applyFilters(management.appliedFilters)}
      >
        <PageSearchArea
          searchField={
            <TextField
              size="small"
              margin="none"
              placeholder="품목/거래처 코드 또는 명 검색"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': '단가 검색' },
                input: {
                  endAdornment: keyword
                    ? <IconButton
                        size="small"
                        aria-label="단가 검색어 초기화"
                        onClick={() => setKeyword('')}
                      >×</IconButton>
                    : null,
                },
              }}
              sx={(theme) => ({
                width: '100%', height: 40,
                '& .MuiOutlinedInput-root': {
                  height: '100%', borderRadius: '0 4px 4px 0',
                  backgroundColor: theme.palette.background.paper,
                },
              })}
            />
          }
          onDefaultSearch={searchDefault}
          detailFields={detailFields}
          detailValues={detailValues}
          appliedDetailValues={searchSession?.detailValues ?? DEFAULT_DETAIL_VALUES}
          onDetailValuesChange={setDetailValues}
          onDetailSearch={searchDetails}
          detailLoading={management.loading}
        />
        <PageMessageArea
          message={management.error}
          onClose={() => management.setError('')}
        />
        <Box sx={{ flex: 1, minHeight: 280, minWidth: 0, p: 1 }}>
          <ItemPartnerPriceGrid
            rows={management.rows}
            highlightKeyword={management.appliedFilters.keyword}
            canCreate={false}
            canUpdate={false}
            canExportExcel={Boolean(selectedMenuPermissions?.excel)}
            loading={management.loading}
            gridKey={management.gridKey}
            gridRef={undefined}
            codeOptions={codeOptions}
            onChangesChange={management.handleChangesChange}
          />
        </Box>
      </PageLoadBoundary>
    </Box>
  );
}
