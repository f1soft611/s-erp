import SearchIcon from '@mui/icons-material/Search';
import { Alert, Box, TextField } from '@mui/material';
import { PageHeader } from '../../../../../shared/components/PageHeader';
import { PageSearchArea } from '../../../../../shared/components/PageSearchArea';
import { PageMessageArea } from '../../../../../shared/components/PageMessageArea';
import { SearchResultMessage } from '../../../../../shared/components/SearchResultMessage';
import { F1Grid } from '../../../../../shared/components/f1-grid';
import { StatementDetailPanel } from './components/StatementDetailPanel';
import { StatementEditorDialog } from './components/StatementEditorDialog';
import { StatementPrint } from '../components/StatementPrint';
import type { StatementPageProps } from '../types/salesStatement.types';
import { statementStatusSearchFields } from './data/statementStatusSearch';
import { useSalesStatementStatus } from './hooks/useSalesStatementStatus';

export function SalesStatementStatusPage(props: StatementPageProps) {
  const {
    defaults, values, setValues, applied, keyword, setKeyword, appliedKeyword, rows, loading, error, setError,
    loaded, selectedId, detail, detailError, detailLoading, editor, setEditor, printing, setPrinting,
    canRead, detailPermissions, search, columns, resetSearch, closeDetail, saved, deleted,
  } = useSalesStatementStatus(props);
  if (!canRead) return <Alert severity="warning">거래명세서현황 조회 권한이 없습니다.</Alert>;
  return <Box sx={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
    <PageHeader breadcrumbItems={props.breadcrumbItems.length ? props.breadcrumbItems : [props.currentMenuName]}
      description={props.content.description} actionGroups={[{ key: 'read', actions: [
        { label: '조회', icon: SearchIcon, visible: canRead, disabled: loading, onClick: () => search(applied) },
      ] }]} />
    <PageSearchArea detailFields={statementStatusSearchFields} detailValues={values} appliedDetailValues={applied}
      defaultValues={defaults} onDetailValuesChange={setValues} onDetailSearch={search}
      onDetailReset={resetSearch}
      detailLoading={loading} onDefaultSearch={() => search(applied)}
      searchField={<TextField size="small" margin="none" placeholder="명세번호/출하번호/거래처/품목 검색" value={keyword}
        onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') search(applied); }}
        slotProps={{ htmlInput: { 'aria-label': '거래명세서현황 빠른 검색' } }}
        sx={{ width: '100%', height: 40, '& .MuiOutlinedInput-root': { height: '100%', borderRadius: '0 4px 4px 0' } }} />} />
    <PageMessageArea
      message={error}
      onClose={() => setError('')}
      horizontalPadding="grid"
      salesSpacing="outer"
    />
    {loaded && !loading && !error ? (
      <SearchResultMessage
        resultCount={rows.length}
        horizontalPadding="grid"
        salesSpacing="outer"
      />
    ) : null}
    <Box data-testid="sales-status-content" sx={{ px: 2, pt: 2, pb: 2, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 360, flex: 1 }}>
      <Box sx={{ flex: 1, minHeight: 320, minWidth: 0, overflow: 'hidden' }}>
        <F1Grid ariaLabel="거래명세서현황 목록" rows={rows} columns={columns} rowKey="salesStatementDetailId" highlightKeyword={appliedKeyword}
          storageKey="sales-statement-status-grid-v1" loading={loading} showCheckbox={false} height="100%"
          minHeight={320} selectionMode="row" selectRowOnContextMenu={false} allowAddRowInContextMenu={false}
          allowDuplicateRowInContextMenu={false} allowDeleteRowInContextMenu={false}
          canExportExcel={Boolean(props.selectedMenuPermissions?.excel)} />
      </Box>
    </Box>
    {selectedId !== null ? <StatementDetailPanel item={detail} loading={detailLoading} error={detailError}
      canEdit={Boolean(detail && (detailPermissions.update || detailPermissions.delete))}
      onClose={closeDetail}
      onView={() => setEditor('view')} onEdit={() => setEditor('edit')} onPrint={() => setPrinting(true)} /> : null}
    {selectedId !== null && editor ? <StatementEditorDialog id={selectedId} mode={editor} page={props}
      permissions={detailPermissions} onClose={() => setEditor(null)}
      onSaved={saved} onDeleted={deleted} /> : null}
    {printing && detail ? <StatementPrint item={detail} onClose={() => setPrinting(false)} /> : null}
  </Box>;
}
