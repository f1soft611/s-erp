import { useMemo, useState, type ReactNode } from 'react';
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
  PRICE_ITEM_TYPE_FIELD,
  PRICE_USE_AT_FIELD,
  priceSearchDefaults,
  searchText,
} from './data/priceSearchFields';
import { useItemPartnerPriceCodes } from './hooks/useItemPartnerPriceCodes';
import { useItemPartnerPriceManagement } from './hooks/useItemPartnerPriceManagement';
import type { ItemPartnerPriceFilters, ItemPartnerPriceTradeType } from './types/itemPartnerPrice.types';

const SESSION_KEY_PREFIX = 's-erp:page:item-price-history';
const SESSION_VERSION = 3;
const DETAIL_FIELDS = [PRICE_ITEM_TYPE_FIELD, PRICE_USE_AT_FIELD, PRICE_HISTORY_FIELD];

type SearchSession = {
  keyword: string;
  detailValues: Record<string, PageSearchFieldValue>;
};

function isSearchSession(value: unknown): value is SearchSession {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchSession>;
  return typeof candidate.keyword === 'string' && isPageSearchValues(candidate.detailValues);
}

function toFilters(session: SearchSession, tradeType: ItemPartnerPriceTradeType): ItemPartnerPriceFilters {
  // 거래구분은 화면(매입단가등록/매출단가등록)이 정하므로 검색 조건이 아니다.
  const filters: ItemPartnerPriceFilters = {
    keyword: session.keyword.trim() || undefined,
    tradeType,
  };
  const useAt = searchText(session.detailValues, 'useAt');
  filters.itemTypes = searchText(session.detailValues, 'itemTypes') || undefined;
  // 이력 목록이므로 기본은 종료된 과거 단가까지 보여 준다. "현재·예정만"을 고르면 과거를 숨긴다.
  if (session.detailValues.includeHistory !== 'N') filters.includeHistory = true;
  if (useAt) filters.useAt = useAt as ItemPartnerPriceFilters['useAt'];
  return filters;
}

type Props = {
  /** 화면의 거래구분(매입단가등록=매입, 매출단가등록=매출). */
  tradeType: ItemPartnerPriceTradeType;
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
  tradeType,
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
  tabs,
}: Props) {
  const defaultDetailValues = useMemo(
    () => priceSearchDefaults(tradeType, { includeHistory: 'Y' }),
    [tradeType],
  );
  const { state: searchSession, setState: setSearchSession } =
    usePageSessionState<SearchSession | null>(`${SESSION_KEY_PREFIX}-${tradeType === '매출' ? 'sales' : 'purchase'}`, null, {
      version: SESSION_VERSION,
      validate: (value): value is SearchSession | null =>
        value === null || isSearchSession(value),
    });
  const codeOptions = useItemPartnerPriceCodes();
  const management = useItemPartnerPriceManagement(
    toFilters(searchSession ?? { keyword: '', detailValues: defaultDetailValues }, tradeType),
  );
  const [keyword, setKeyword] = useState(searchSession?.keyword ?? '');
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(
    searchSession?.detailValues ?? defaultDetailValues,
  );
  const detailFields = DETAIL_FIELDS;

  const search = (session: SearchSession) => {
    management.applyFilters(toFilters(session, tradeType));
    setSearchSession(session);
    setDetailValues(session.detailValues);
  };
  const searchDefault = () => search({
    keyword: keyword.trim(),
    detailValues: searchSession?.detailValues ?? defaultDetailValues,
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
          appliedDetailValues={searchSession?.detailValues ?? defaultDetailValues}
          defaultValues={defaultDetailValues}
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
            tradeType={tradeType}
            onChangesChange={management.handleChangesChange}
          />
        </Box>
      </PageLoadBoundary>
    </Box>
  );
}
