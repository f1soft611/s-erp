import { useCallback, useEffect, useMemo, useState } from 'react';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import SaveIcon from '@mui/icons-material/Save';
import { Alert, Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { PageHeader } from '../../../../shared/components/PageHeader';
import { PageMessageArea } from '../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../shared/components/SearchResultMessage';
import type { PermissionActionGroupDefinition } from '../../../../shared/components/PermissionGroup';
import type { MenuPermission, ModuleItem, PageContent } from '../../../dashboard/types/dashboard';
import { WorkStandardBasicInfo } from './components/WorkStandardBasicInfo';
import { WorkStandardFormulaTab } from './components/WorkStandardFormulaTab';
import { WorkStandardListPanel } from './components/WorkStandardListPanel';
import { WorkStandardSearchArea } from './components/WorkStandardSearchArea';
import {
  createEmptyWorkStandardHeader,
  WORK_STANDARD_SEARCH_FIELDS,
} from './data/workStandard.data';
import {
  filterBySegment,
  searchWorkStandards,
  toWorkStandardListRow,
} from './services/workStandard.service';
import type {
  WorkStandardFormulaRow,
  WorkStandardHeader,
  WorkStandardItem,
  WorkStandardListSegment,
  WorkStandardSearchFilters,
  WorkStandardSearchValues,
} from './types/workStandard.types';

type Props = {
  selectedModule: ModuleItem;
  currentMenuName: string;
  content: PageContent;
  breadcrumbItems: string[];
  selectedMenuPermissions?: MenuPermission;
};

const DEFAULT_SEARCH_VALUES: WorkStandardSearchValues = {};
const DETAIL_TABS = ['배합비', '공정절차', '포장 기준', 'CCP·품질 기준', '버전 이력'] as const;

function toFilters(keyword: string, values: WorkStandardSearchValues): WorkStandardSearchFilters {
  const text = (field: string) => {
    const value = values[field];
    return typeof value === 'string' && value ? value : undefined;
  };
  return {
    keyword,
    itemAccount: text('itemAccount'),
    productCategory: text('productCategory'),
    versionStatus: text('versionStatus'),
    processName: text('processName'),
  };
}

function toHeader(item: WorkStandardItem): WorkStandardHeader {
  const header = createEmptyWorkStandardHeader();
  (Object.keys(header) as (keyof WorkStandardHeader)[]).forEach((key) => {
    (header as Record<string, unknown>)[key] = item[key];
  });
  return header;
}

export function WorkStandardRecipePage({
  selectedModule,
  currentMenuName,
  content,
  breadcrumbItems,
  selectedMenuPermissions,
}: Props) {
  const canWrite = Boolean(selectedMenuPermissions?.create || selectedMenuPermissions?.update);
  const canDelete = Boolean(selectedMenuPermissions?.delete);

  const [keyword, setKeyword] = useState('');
  const [detailValues, setDetailValues] = useState<WorkStandardSearchValues>(DEFAULT_SEARCH_VALUES);
  const [appliedDetailValues, setAppliedDetailValues] =
    useState<WorkStandardSearchValues>(DEFAULT_SEARCH_VALUES);
  const [items, setItems] = useState<WorkStandardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState<WorkStandardListSegment>('전체');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [header, setHeader] = useState<WorkStandardHeader>(createEmptyWorkStandardHeader);
  const [formulaRows, setFormulaRows] = useState<WorkStandardFormulaRow[]>([]);
  const [formulaCount, setFormulaCount] = useState(0);
  const [formulaKey, setFormulaKey] = useState('new-0');
  const [tabIndex, setTabIndex] = useState(0);

  const selectedItem = useMemo(
    () => items.find((item) => item.workStandardId === selectedId) ?? null,
    [items, selectedId],
  );

  const applyItem = useCallback((item: WorkStandardItem | null) => {
    setSelectedId(item?.workStandardId ?? null);
    setHeader(item ? toHeader(item) : createEmptyWorkStandardHeader());
    setFormulaRows(item?.formula ?? []);
    setFormulaCount(item?.formula.length ?? 0);
    setFormulaKey(item ? `item-${item.workStandardId}` : `new-${Date.now()}`);
  }, []);

  const runSearch = useCallback(
    async (nextKeyword: string, values: WorkStandardSearchValues) => {
      setLoading(true);
      setError('');
      try {
        const result = await searchWorkStandards(toFilters(nextKeyword, values));
        setItems(result);
        setHasLoaded(true);
        applyItem(result[0] ?? null);
      } catch (searchError) {
        setError(
          searchError instanceof Error ? searchError.message : '작업표준서를 조회하지 못했습니다.',
        );
      } finally {
        setLoading(false);
      }
    },
    [applyItem],
  );

  useEffect(() => {
    void runSearch('', DEFAULT_SEARCH_VALUES);
  }, [runSearch]);

  const handleSearch = useCallback(
    (values?: WorkStandardSearchValues) => {
      const nextValues = values ?? appliedDetailValues;
      setAppliedDetailValues(nextValues);
      setDetailValues(nextValues);
      void runSearch(keyword, nextValues);
    },
    [appliedDetailValues, keyword, runSearch],
  );

  const handleReset = useCallback(() => {
    setKeyword('');
    setDetailValues(DEFAULT_SEARCH_VALUES);
    setAppliedDetailValues(DEFAULT_SEARCH_VALUES);
    void runSearch('', DEFAULT_SEARCH_VALUES);
  }, [runSearch]);

  const listRows = useMemo(
    () => filterBySegment(items.map(toWorkStandardListRow), segment),
    [items, segment],
  );

  const handleSelect = useCallback(
    (workStandardId: number) => {
      applyItem(items.find((item) => item.workStandardId === workStandardId) ?? null);
      setTabIndex(0);
    },
    [applyItem, items],
  );

  const handleNew = useCallback(() => {
    applyItem(null);
    setTabIndex(0);
  }, [applyItem]);

  const actionGroups = useMemo<PermissionActionGroupDefinition[]>(
    () => [
      {
        key: 'write',
        actions: [
          {
            label: '신규',
            icon: NoteAddOutlinedIcon,
            visible: canWrite,
            onClick: handleNew,
          },
          // 백엔드 API 연결 전까지 저장·삭제는 비활성화한다.
          {
            label: '저장',
            icon: SaveIcon,
            visible: canWrite,
            disabled: true,
            onClick: () => undefined,
          },
        ],
      },
      {
        key: 'delete',
        actions: [
          {
            label: '삭제',
            icon: DeleteForeverOutlinedIcon,
            visible: canDelete,
            disabled: true,
            onClick: () => undefined,
          },
        ],
      },
    ],
    [canDelete, canWrite, handleNew],
  );

  const editable = canWrite;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <PageHeader
        breadcrumbItems={
          breadcrumbItems.length ? breadcrumbItems : [selectedModule.name, currentMenuName]
        }
        description={content.description}
        actionGroups={actionGroups}
      />
      <WorkStandardSearchArea
        keyword={keyword}
        onKeywordChange={setKeyword}
        detailFields={WORK_STANDARD_SEARCH_FIELDS}
        detailValues={detailValues}
        appliedDetailValues={appliedDetailValues}
        defaultValues={DEFAULT_SEARCH_VALUES}
        onDetailValuesChange={setDetailValues}
        onSearch={handleSearch}
        onReset={handleReset}
        loading={loading}
      />
      {/* 메시지를 스크롤 영역 안에 두어 스크롤바 유무와 관계없이 본문과 같은 폭을 유지한다. */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <PageMessageArea message={error} onClose={() => setError('')} horizontalPadding="grid" />
        {hasLoaded && !loading && !error ? (
          <SearchResultMessage resultCount={items.length} horizontalPadding="grid" />
        ) : null}
        <Box
          role="region"
          aria-label="작업표준서 등록 내용"
          sx={{
            flex: '1 0 auto',
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              lg: '360px minmax(0, 1fr)',
            },
            gap: 2,
            minWidth: 0,
            px: { xs: 1, sm: 2 },
            // 메시지가 있으면 PageMessageArea의 인접 형제 규칙으로 0이 되고, 닫히면 상단 여백이 복원된다.
            pt: 2,
            pb: 2,
          }}
        >
          <WorkStandardListPanel
            rows={listRows}
            segment={segment}
            onSegmentChange={setSegment}
            selectedId={selectedId}
            onSelect={handleSelect}
            loading={loading}
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {!editable ? (
              <Alert severity="info">조회 권한만 있어 작업표준서를 수정할 수 없습니다.</Alert>
            ) : null}
            <WorkStandardBasicInfo
              header={header}
              onChange={(patch) => setHeader((current) => ({ ...current, ...patch }))}
              disabled={!editable}
              auditText={
                selectedItem
                  ? `등록: ${selectedItem.createdBy} ${selectedItem.createdAt} · 변경: ${selectedItem.updatedBy} ${selectedItem.updatedAt}`
                  : '신규 작업표준서 · 저장은 백엔드 연결 후 제공'
              }
            />
            <Paper
              variant="outlined"
              sx={{
                display: 'flex',
                flex: '1 0 auto',
                flexDirection: 'column',
                minHeight: 420,
                minWidth: 0,
                overflow: 'hidden',
                borderRadius: 1,
              }}
            >
              <Tabs
                value={tabIndex}
                onChange={(_event, value: number) => setTabIndex(value)}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="작업표준서 상세 탭"
                sx={{
                  borderBottom: 1,
                  borderColor: 'divider',
                  px: 1,
                  minHeight: 44,
                }}
              >
                {DETAIL_TABS.map((label, index) => (
                  <Tab
                    key={label}
                    label={index === 0 ? `${label} ${formulaCount}` : label}
                    id={`work-standard-tab-${index}`}
                    aria-controls={`work-standard-tabpanel-${index}`}
                    sx={{ minHeight: 44 }}
                  />
                ))}
              </Tabs>
              {DETAIL_TABS.map((label, index) => (
                <Box
                  key={label}
                  role="tabpanel"
                  id={`work-standard-tabpanel-${index}`}
                  aria-labelledby={`work-standard-tab-${index}`}
                  hidden={tabIndex !== index}
                  sx={{
                    display: tabIndex === index ? 'flex' : 'none',
                    flex: 1,
                    flexDirection: 'column',
                    minHeight: 0,
                    minWidth: 0,
                  }}
                >
                  {index === 0 ? (
                    <WorkStandardFormulaTab
                      key={formulaKey}
                      rows={formulaRows}
                      baseQty={header.baseQty}
                      disabled={!editable}
                      onRowCountChange={setFormulaCount}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                      {label} 화면은 준비 중입니다.
                    </Typography>
                  )}
                </Box>
              ))}
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
