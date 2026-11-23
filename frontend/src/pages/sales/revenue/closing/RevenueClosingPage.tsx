import { useEffect, useMemo, useRef, useState } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, IconButton, TextField } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../shared/components/PageSearchArea';
import { useCommonConfirmDialog } from '../../../../shared/hooks/useCommonConfirmDialog';
import { getSystemDate } from '../../../../shared/services/systemDateService';
import { type F1GridRef, type F1GridRowId } from '../../../../shared/components/f1-grid';
import { CustomerMultiPicker } from '../../../../shared/components/master-picker/MasterPickers';
import type { MasterPickerOption } from '../../../../shared/components/master-picker/masterPicker.types';
import type { PageSearchField, PageSearchFieldValue } from '../../../../shared/components/page-search/searchFields';
import type {
  MenuPermission,
  ModuleItem,
  PageContent,
} from '../../../dashboard/types/dashboard';
import { searchOrderCustomers } from '../../order/create/services/salesOrderMaster.service';
import { MAX_STATEMENT_DETAIL_COUNT } from '../../shared/statementDetailLimit';
import { CustomerClosingSummary } from './components/CustomerClosingSummary';
import { RevenueClosingDetailGrid } from './components/RevenueClosingDetailGrid';
import { filterRevenueClosingDetails } from './data/revenueClosingFilters';
import { closeRevenueClosings, searchRevenueClosings } from './services/revenueClosing.service';
import type {
  RevenueClosingCustomerSummaryRow,
  RevenueClosingDetailRow,
} from './types/revenueClosing.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

type ClosingSearchValues = {
  deliveryDtFrom: string;
  deliveryDtTo: string;
  keyword: string;
};

const detailFields: PageSearchField[] = [
  { field: 'deliveryDt', label: '출하일', type: 'date', required: true, searchSpan: 2 },
];

const emptyDetails: RevenueClosingDetailRow[] = [];
const emptyCustomerSummaries: RevenueClosingCustomerSummaryRow[] = [];

function currentMonthRange(date = new Date()) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const toDateString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return { deliveryDtFrom: toDateString(first), deliveryDtTo: toDateString(last) };
}

function searchValuesOf(values: Pick<ClosingSearchValues, 'deliveryDtFrom' | 'deliveryDtTo'>) {
  return { deliveryDt: { from: values.deliveryDtFrom, to: values.deliveryDtTo } };
}

function dateRangeOf(values: Record<string, PageSearchFieldValue>) {
  const value = values.deliveryDt;
  if (typeof value !== 'object' || value === null) return { from: '', to: '' };
  return { from: value.from ?? '', to: value.to ?? '' };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

function validPeriod(from: string, to: string) {
  return validDate(from) && validDate(to) && from <= to;
}

export function RevenueClosingPage({
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const canRead = Boolean(selectedMenuPermissions?.read);
  const defaults = useMemo(() => currentMonthRange(), []);
  const [detailValues, setDetailValues] = useState<Record<string, PageSearchFieldValue>>(
    () => searchValuesOf(defaults),
  );
  const [keyword, setKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState<ClosingSearchValues>(() => ({
    ...defaults,
    keyword: '',
  }));
  const [draftCustomers, setDraftCustomers] = useState<MasterPickerOption[]>([]);
  const [appliedCustomers, setAppliedCustomers] = useState<MasterPickerOption[]>([]);
  const [selectedSummaryCustomerId, setSelectedSummaryCustomerId] = useState<number | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<F1GridRowId[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [details, setDetails] = useState<RevenueClosingDetailRow[]>(emptyDetails);
  const [customerSummaries, setCustomerSummaries] =
    useState<RevenueClosingCustomerSummaryRow[]>(emptyCustomerSummaries);
  const searchRequestIdRef = useRef(0);
  const closeInFlightRef = useRef(false);
  const gridRef = useRef<F1GridRef<RevenueClosingDetailRow> | null>(null);
  const { confirm, dialog } = useCommonConfirmDialog();
  const appliedCriteriaRef = useRef({
    ...defaults,
    keyword: '',
    customers: [] as MasterPickerOption[],
  });

  const appliedDetailValues = useMemo(
    () => searchValuesOf(appliedSearch),
    [appliedSearch],
  );
  const visibleDetails = useMemo(
    () => filterRevenueClosingDetails(details, selectedSummaryCustomerId),
    [details, selectedSummaryCustomerId],
  );
  const selectedDetailIds = useMemo(() => {
    const selectedIds = new Set(selectedRowIds);
    return details
      .filter((row) => selectedIds.has(row.rowId) && row.closingStatus === 'OPEN')
      .map((row) => row.rowId);
  }, [details, selectedRowIds]);
  const canCreate = Boolean(selectedMenuPermissions?.create);

  const clearGridSelection = () => {
    gridRef.current?.clearSelection();
    setSelectedRowIds([]);
  };

  useEffect(() => {
    if (!canRead) return undefined;
    const requestId = ++searchRequestIdRef.current;
    void searchRevenueClosings({
      deliveryDtFrom: appliedSearch.deliveryDtFrom,
      deliveryDtTo: appliedSearch.deliveryDtTo,
      keyword: appliedSearch.keyword,
      customerIds: appliedCustomers.map(({ id }) => id),
    }).then((result) => {
      if (requestId !== searchRequestIdRef.current) return;
      setDetails(result.details);
      setCustomerSummaries(result.customerSummaries);
    }).catch((searchError: unknown) => {
      if (requestId !== searchRequestIdRef.current) return;
      setDetails(emptyDetails);
      setCustomerSummaries(emptyCustomerSummaries);
      setError(searchError instanceof Error ? searchError.message : '매출마감 조회에 실패했습니다.');
    }).finally(() => {
      if (requestId === searchRequestIdRef.current) setLoading(false);
    });
    return () => {
      searchRequestIdRef.current += 1;
    };
  }, [appliedCustomers, appliedSearch, canRead]);

  const applyDetailSearch = (values: Record<string, PageSearchFieldValue>) => {
    const range = dateRangeOf(values);
    if (!validPeriod(range.from, range.to)) {
      setError('출하일 기간의 시작일과 종료일을 확인해 주세요.');
      return;
    }
    const customers = draftCustomers;
    const next = { deliveryDtFrom: range.from, deliveryDtTo: range.to, keyword };
    clearGridSelection();
    setLoading(true);
    setError('');
    appliedCriteriaRef.current = { ...next, customers };
    setAppliedCustomers(customers);
    setAppliedSearch(next);
    setDetailValues(searchValuesOf(next));
    setError('');
  };

  const applyCurrentSearch = () => {
    const applied = appliedCriteriaRef.current;
    const next = { ...applied, keyword };
    clearGridSelection();
    setLoading(true);
    setError('');
    appliedCriteriaRef.current = next;
    setAppliedSearch(next);
    setError('');
  };

  const resetSearch = () => {
    const next = { ...defaults, keyword: '', customers: [] as MasterPickerOption[] };
    clearGridSelection();
    setLoading(true);
    appliedCriteriaRef.current = next;
    setKeyword('');
    setDetailValues(searchValuesOf(defaults));
    setAppliedSearch({ ...defaults, keyword: '' });
    setDraftCustomers([]);
    setAppliedCustomers([]);
    setSelectedSummaryCustomerId(null);
    setError('');
  };

  const selectSummaryCustomer = (customerId: number | null) => {
    clearGridSelection();
    setSelectedSummaryCustomerId(customerId);
  };

  const closeSelectedDetails = async () => {
    const detailIds = selectedDetailIds;
    if (!canCreate || closing || closeInFlightRef.current || detailIds.length === 0) return;
    if (new Set(detailIds).size > MAX_STATEMENT_DETAIL_COUNT) {
      setNotice('');
      setError('매출마감은 출하 상세를 최대 100건까지 처리할 수 있습니다.');
      return;
    }
    closeInFlightRef.current = true;
    const accepted = await confirm({
      title: '매출 마감',
      description: `${detailIds.length.toLocaleString('ko-KR')}개 상세를 마감 처리합니다. 미발행 상세는 거래처별 거래명세서로 발행됩니다.`,
      confirmLabel: '마감 처리',
    });
    if (!accepted) {
      closeInFlightRef.current = false;
      return;
    }

    setClosing(true);
    setError('');
    setNotice('');
    try {
      const statementDt = await getSystemDate();
      const result = await closeRevenueClosings(detailIds, statementDt);
      clearGridSelection();
      setNotice(`${result.closedCount.toLocaleString('ko-KR')}개 상세의 매출마감이 완료되었습니다.`);
      setLoading(true);
      setAppliedSearch((current) => ({ ...current }));
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : '매출마감 처리에 실패했습니다.');
    } finally {
      closeInFlightRef.current = false;
      setClosing(false);
    }
  };

  if (!canRead) {
    return <Alert severity="warning">매출마감관리 조회 권한이 없습니다.</Alert>;
  }

  return (
    <Box
      sx={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: { xs: 'auto', md: 'hidden' },
      }}
    >
      <PageHeader
        breadcrumbItems={breadcrumbItems.length ? breadcrumbItems : [currentMenuName]}
        description={content.description}
        actionGroups={[
          {
            key: 'close',
            actions: [{
              label: `마감 (${selectedDetailIds.length.toLocaleString('ko-KR')}건)`,
              icon: TaskAltIcon,
              visible: canCreate,
              disabled: closing || loading || selectedDetailIds.length === 0,
              onClick: () => void closeSelectedDetails(),
            }],
          },
          {
            key: 'read',
            actions: [{
              label: '조회',
              icon: SearchIcon,
              visible: canRead,
              onClick: applyCurrentSearch,
            }],
          },
        ]}
      />
      <PageSearchArea
        detailFields={detailFields}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        defaultValues={searchValuesOf(defaults)}
        onDetailValuesChange={setDetailValues}
        onDetailSearch={applyDetailSearch}
        onDetailReset={resetSearch}
        onDetailClose={() => {
          const applied = appliedCriteriaRef.current;
          setDraftCustomers(applied.customers);
          setDetailValues(searchValuesOf(applied));
        }}
        detailExtraContent={
          <CustomerMultiPicker
            selectedValues={draftCustomers}
            search={searchOrderCustomers}
            onApply={setDraftCustomers}
          />
        }
        detailExtraActiveFilterCount={appliedCustomers.length}
        onDefaultSearch={applyCurrentSearch}
        searchField={
          <TextField
            size="small"
            margin="none"
            placeholder="출하번호/수주번호/거래처/품목 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') applyCurrentSearch();
            }}
            slotProps={{
              htmlInput: { 'aria-label': '매출마감관리 빠른 검색' },
              input: {
                endAdornment: keyword ? (
                  <IconButton
                    type="button"
                    size="small"
                    edge="end"
                    aria-label="매출마감관리 검색어 초기화"
                    onClick={() => setKeyword('')}
                    sx={{ p: 0.25 }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : null,
              },
            }}
            sx={(theme) => ({
              width: '100%',
              height: 40,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                borderRadius: '0 4px 4px 0',
                backgroundColor: theme.palette.background.paper,
              },
            })}
          />
        }
      />
      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
      {notice ? <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert> : null}
      <Box
        sx={{
          px: { xs: 1, sm: 2 },
          pt: 1,
          pb: 2,
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1fr) 320px' },
          gridTemplateRows: { xs: 'minmax(180px, 35vh) minmax(360px, 55vh)', md: 'minmax(0, 1fr)' },
          gridTemplateAreas: { xs: '"summary" "detail"', md: '"detail summary"' },
          gap: 1.5,
          flex: { xs: '0 0 auto', md: 1 },
          minWidth: 0,
          minHeight: { xs: 'auto', md: 0 },
          overflow: { xs: 'visible', md: 'hidden' },
        }}
      >
        <Box sx={{ gridArea: 'summary', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
          <CustomerClosingSummary
            rows={customerSummaries}
            loading={loading}
            selectedCustomerId={selectedSummaryCustomerId}
            onSelectCustomer={selectSummaryCustomer}
          />
        </Box>
        <Box
          component="section"
          aria-label="매출대상 상세"
          sx={{
            gridArea: 'detail',
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <RevenueClosingDetailGrid
            rows={visibleDetails}
            selectedMenuPermissions={selectedMenuPermissions}
            highlightKeyword={appliedSearch.keyword}
            loading={loading}
            gridRef={gridRef}
            onSelectionChange={setSelectedRowIds}
          />
        </Box>
      </Box>
      {dialog}
    </Box>
  );
}
