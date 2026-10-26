import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';
import type { F1GridSavedRow } from '../src/shared/components/f1-grid';
import { createMaterialColumns, createMaterialRow } from '../src/pages/co/master/materials/components/MaterialGrid';
import { fetchMaterials, normalizeMaterialRow, toMaterialPayload } from '../src/pages/co/master/materials/services/materialManagement.service';
import { useMaterialManagement } from '../src/pages/co/master/materials/hooks/useMaterialManagement';
import { DashboardContent } from '../src/pages/dashboard/components/DashboardContent';
import { F1GridFormModal } from '../src/shared/components/f1-grid/form/F1GridFormModal';
import { NotificationProvider } from '../src/shared/context/NotificationContext';
import { buildGridFormSections } from '../src/shared/components/f1-grid/form/GridFormModel';
import { toPageSearchFields } from '../src/shared/components/page-search/searchFields';

const api = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn() }));
vi.mock('../src/shared/services/apiClient', () => api);

const material = {
  materialId: 12, tenantId: 9, materialCode: '000012', materialName: 'Sample',
  materialTypeCode: 'RAW', matCataType: '', expiryedStatus: 'NONE',
  safeInvoice: 0, materialWeight: null, expiryedCount: null,
};
const wrapper = ({ children }: PropsWithChildren) => (
  <NotificationProvider>{children}</NotificationProvider>
);
const acceptRows = <T extends object,>(saved: F1GridSavedRow<T>[]) => saved.map(({ row }) => row);

beforeEach(() => {
  vi.clearAllMocks();
  api.apiGet.mockImplementation(async (url: string) =>
    ({ resultList: url.endsWith('/options') ? [
      { groupCode: 'MATERIAL_TYPE', itemCode: 'FOOD', itemName: '식품' },
      { groupCode: 'STORE_METHOD', itemCode: 'COLD', itemName: '냉장' },
    ] : [material] }));
});

describe('material management contract', () => {
  it('places and pins the account, code and name before other business columns', () => {
    const columns = createMaterialColumns(true);
    expect(columns.slice(0, 4).map((column) => column.field)).toEqual([
      'materialId', 'materialTypeCode', 'materialCode', 'materialName',
    ]);
    expect(columns.slice(0, 4).every((column) => column.pinned === 'left')).toBe(true);
    for (const field of ['materialCode', 'materialKind', 'storeMethod', 'expiryedStatus']) {
      expect(columns.find((column) => column.field === field)?.align).toBe('center');
    }
    expect(columns.find((column) => column.field === 'safeInvoice')?.align).toBe('right');
  });

  it('uses common code labels for all five selects in columns and row forms', () => {
    const options = [
      { groupCode: 'ITEM_TYPE', itemCode: 'RAW', itemName: '원재료' },
      { groupCode: 'ITEM_UNIT', itemCode: 'EA', itemName: '개' },
      { groupCode: 'MATERIAL_TYPE', itemCode: 'TYPE_01', itemName: '초콜릿' },
      { groupCode: 'STORE_METHOD', itemCode: 'REFRIG', itemName: '냉장' },
      { groupCode: 'EXPIRY_STATUS', itemCode: 'DAY', itemName: '일 단위' },
      { groupCode: 'EXPIRY_STATUS', itemCode: 'INVALID', itemName: '미지원' },
    ];
    const columns = createMaterialColumns(true, options);
    const fields = buildGridFormSections(columns, createMaterialRow())
      .flatMap((section) => section.fields);
    const selectFields = ['materialTypeCode', 'unit', 'materialKind', 'storeMethod', 'expiryedStatus'];
    selectFields.forEach((field, index) => {
      const { itemCode, itemName } = options[index];
      expect(columns.find((column) => column.field === field)).toMatchObject({
        type: 'select', options: expect.arrayContaining([{ value: itemCode, label: itemName }]),
      });
      expect(fields.find((entry) => entry.field === field)?.column.type).toBe('select');
    });
    expect(columns.find((column) => column.field === 'expiryedStatus')?.options).toEqual([
      { value: 'DAY', label: '일 단위' },
    ]);
    expect(toPageSearchFields(columns).find((field) => field.field === 'materialTypeCode'))
      .toMatchObject({ type: 'select' });
  });

  it('removes classification from every UI surface but preserves its saved value', () => {
    const row = normalizeMaterialRow({ ...material, matCataType: 'OLD_CLASS' });
    const columns = createMaterialColumns(true, [], [row]);
    expect(columns.some((column) => column.field === 'matCataType')).toBe(false);
    expect(buildGridFormSections(columns, row).flatMap((section) => section.fields)
      .some((field) => field.field === 'matCataType')).toBe(false);
    expect(toPageSearchFields(columns).some((field) => field.field === 'matCataType')).toBe(false);
    expect(toMaterialPayload(row, false).matCataType).toBe('OLD_CLASS');
  });

  it('applies account and unit selections as codes from the common code options', () => {
    const row = { ...createMaterialRow(), materialName: 'Sample' };
    const onApply = vi.fn();
    render(
      <F1GridFormModal
        open
        mode="create"
        row={row}
        columns={createMaterialColumns(true, [
          { groupCode: 'ITEM_TYPE', itemCode: 'RAW', itemName: '원재료' },
          { groupCode: 'ITEM_UNIT', itemCode: 'EA', itemName: '개' },
          { groupCode: 'EXPIRY_STATUS', itemCode: 'NONE', itemName: '없음' },
        ])}
        rowKey="materialId"
        plugin={{}}
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    );
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /품목계정코드/ }));
    fireEvent.click(screen.getByRole('option', { name: '원재료' }));
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '단위' }));
    fireEvent.click(screen.getByRole('option', { name: '개' }));
    fireEvent.click(screen.getByRole('button', { name: '적용' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      materialTypeCode: 'RAW', unit: 'EA',
    }));
  });

  it('preserves saved account, unit and expiry codes without inventing new expiry choices', () => {
    const row = { ...normalizeMaterialRow(material), unit: 'OLD_UNIT', expiryedStatus: 'MONTH' as const };
    const columns = createMaterialColumns(true, [], [row]);
    expect(columns.find((column) => column.field === 'materialTypeCode')?.options)
      .toContainEqual({ value: 'RAW', label: 'RAW' });
    expect(columns.find((column) => column.field === 'unit')?.options)
      .toContainEqual({ value: 'OLD_UNIT', label: 'OLD_UNIT' });
    expect(columns.find((column) => column.field === 'expiryedStatus')?.options)
      .toEqual([{ value: 'MONTH', label: 'MONTH' }]);
  });

  it('combines basic and detailed search without sending tenant identity', async () => {
    await fetchMaterials({ keyword: ' Sample ', materialSpec: ' A ', materialKind: 'FOOD' });
    expect(api.apiGet).toHaveBeenCalledWith(
      '/api/v1/co/master/materials?keyword=Sample&materialSpec=A&materialKind=FOOD',
    );
  });

  it('preserves nullable numbers, zero and string audit users', () => {
    const row = normalizeMaterialRow({ ...material, createdBy: '00101' });
    expect(row.safeInvoice).toBe(0);
    expect(row.materialWeight).toBeNull();
    expect(row.createdBy).toBe('00101');
    expect(() => normalizeMaterialRow({ ...material, expiryedStatus: 'INVALID' })).toThrow();
    expect(() => normalizeMaterialRow({ ...material, safeInvoice: 'wrong' })).toThrow();
  });

  it('validates required fields, lengths and numeric constraints without leaking server fields', () => {
    const row = { ...createMaterialRow(), materialName: ' Sample ', materialTypeCode: ' RAW ' };
    expect(toMaterialPayload(row, true)).toMatchObject({
      materialCode: '', materialName: 'Sample', materialTypeCode: 'RAW',
      safeInvoice: null, materialWeight: null, expiryedStatus: 'NONE',
    });
    expect(toMaterialPayload(row, true)).not.toHaveProperty('materialId');
    expect(toMaterialPayload(row, true)).not.toHaveProperty('tenantId');
    expect(toMaterialPayload(row, true)).not.toHaveProperty('deleteStatus');
    expect(() => toMaterialPayload({ ...row, materialName: '' }, true)).toThrow('품목명');
    expect(() => toMaterialPayload({ ...row, materialTypeCode: '' }, true)).toThrow('품목계정코드');
    expect(() => toMaterialPayload(row, false)).toThrow('품목코드');
    expect(() => toMaterialPayload({ ...row, materialCode: 'x'.repeat(21) }, true)).toThrow();
    expect(() => toMaterialPayload({ ...row, materialWeight: 1.5 }, true)).toThrow();
    expect(() => toMaterialPayload({ ...row, safeInvoice: Infinity }, true)).toThrow();
    expect(() => toMaterialPayload({ ...row, expiryedCount: 0 }, true)).toThrow();
    expect(() => toMaterialPayload({ ...row, expiryedCount: 2147483648 }, true)).toThrow();
  });

  it('requires a positive integer expiry count for active expiry statuses only', () => {
    const row = {
      ...createMaterialRow(),
      materialName: 'Sample',
      materialTypeCode: 'RAW',
    };

    expect(
      toMaterialPayload({ ...row, expiryedStatus: 'NONE', expiryedCount: null }, true)
        .expiryedCount,
    ).toBeNull();
    for (const expiryedStatus of ['DAY', 'MONTH', 'YEAR'] as const) {
      expect(
        toMaterialPayload({ ...row, expiryedStatus, expiryedCount: 1 }, true)
          .expiryedCount,
      ).toBe(1);
      expect(() =>
        toMaterialPayload({ ...row, expiryedStatus, expiryedCount: null }, true),
      ).toThrow('소비기한 숫자');
    }

    for (const expiryedCount of [1, 0, -1, 1.5, 2147483648]) {
      expect(() =>
        toMaterialPayload({ ...row, expiryedStatus: 'NONE', expiryedCount }, true),
      ).toThrow('소비기한');
    }
  });

  it('clears the expiry count only when the basis changes to NONE', () => {
    const row = {
      ...createMaterialRow(),
      expiryedStatus: 'DAY' as const,
      expiryedCount: 30,
    };
    const statusColumn = createMaterialColumns(true).find(
      (column) => column.field === 'expiryedStatus',
    );

    expect(statusColumn?.onValueChange?.(row, 'NONE')).toEqual({
      expiryedStatus: 'NONE',
      expiryedCount: null,
    });
    expect(statusColumn?.onValueChange?.(row, 'MONTH')).toEqual({
      expiryedStatus: 'MONTH',
    });
  });

  it('derives the expiry count label and disabled state from its basis', () => {
    const columns = createMaterialColumns(true);
    const countColumn = columns.find(
      (column) => column.field === 'expiryedCount',
    );
    const row = {
      ...createMaterialRow(),
      expiryedStatus: 'DAY' as const,
      expiryedCount: 30,
    };
    const sections = buildGridFormSections(columns, row);
    const expirySection = sections.find(
      (section) => section.group === '기타·소비기한',
    );
    const countField = expirySection?.fields.find(
      (field) => field.field === 'expiryedCount',
    );
    const basisIndex = expirySection?.fields.findIndex(
      (field) => field.field === 'expiryedStatus',
    );
    const countIndex = expirySection?.fields.findIndex(
      (field) => field.field === 'expiryedCount',
    );

    expect(countField?.label).toBe('소비기한 숫자 (일)');
    expect(basisIndex).toBe(6);
    expect(countIndex).toBe((basisIndex ?? -1) + 1);
    expect(countColumn?.form?.disabled).toEqual(expect.any(Function));
    expect(
      countColumn?.form?.disabled?.(row, 'edit'),
    ).toBe(false);
    expect(
      countColumn?.form?.disabled?.(
        { ...row, expiryedStatus: 'NONE' },
        'edit',
      ),
    ).toBe(true);
  });

  it('blocks applying an active expiry basis without its required count', () => {
    const row = {
      ...createMaterialRow(),
      materialName: 'Sample',
      materialTypeCode: 'RAW',
      expiryedStatus: 'DAY' as const,
      expiryedCount: null,
    };
    const onApply = vi.fn();

    render(
      <F1GridFormModal
        open
        mode="edit"
        row={row}
        originalRow={row}
        columns={createMaterialColumns(true, [], [row])}
        rowKey="materialId"
        plugin={{}}
        onCancel={vi.fn()}
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '적용' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByText('소비기한 숫자를 입력해 주세요.')).toBeInTheDocument();
  });

  it('exposes every business field in the form, lookup options and detailed search', () => {
    const columns = createMaterialColumns(true, [
      { groupCode: 'MATERIAL_TYPE', itemCode: 'FOOD', itemName: '식품' },
    ]);
    const sections = buildGridFormSections(columns, createMaterialRow());
    const fields = sections.flatMap((section) => section.fields.map((field) => field.column.field));
    expect(fields).toEqual(expect.arrayContaining([
      'materialName', 'materialEngName', 'materialTypeCode', 'customerCode',
      'safeInvoice', 'materialSpec2', 'materialKind', 'storeMethod', 'expiryedCount',
      'kfdaReportNo', 'partNo', 'materialNo', 'location',
    ]));
    expect(columns.find((column) => column.field === 'materialCode')?.editable).toBe(false);
    expect(columns.find((column) => column.field === 'materialCode')?.hidden).not.toBe(true);
    expect(fields).not.toContain('materialCode');
    expect(fields).not.toContain('tenantId');
    expect(columns.find((c) => c.field === 'materialKind')?.options)
      .toContainEqual({ value: 'FOOD', label: '식품' });
    expect(toPageSearchFields(columns).map((f) => f.field))
      .toEqual(expect.arrayContaining(['materialSpec', 'materialTypeCode', 'materialKind']));
  });

  it('preserves inactive saved codes and allows clearing optional lookups', () => {
    const row = { ...normalizeMaterialRow(material), materialKind: 'LEGACY' };
    const columns = createMaterialColumns(true, [], [row]);
    expect(columns.find((c) => c.field === 'materialKind')?.options).toEqual([
      { value: '', label: '선택 안 함' }, { value: 'LEGACY', label: 'LEGACY' },
    ]);
  });

  it('applies create and update permissions separately to editable rows', () => {
    const columns = createMaterialColumns((row) => String(row.materialId).startsWith('new-'));
    const editable = columns.find((c) => c.field === 'materialName')?.editable;
    expect(typeof editable).toBe('function');
    if (typeof editable !== 'function') throw new Error('Expected per-row permissions');
    expect(editable(createMaterialRow())).toBe(true);
    expect(editable(normalizeMaterialRow(material))).toBe(false);
  });
});

describe('material workflow', () => {
  it('ignores stale searches that complete after a newer search', async () => {
    let finishOld!: (value: unknown) => void;
    api.apiGet.mockImplementation(async (url: string) => {
      if (url.endsWith('/options')) return { resultList: [] };
      if (url.endsWith('keyword=old')) return new Promise((resolve) => { finishOld = resolve; });
      return { resultList: [{ ...material, materialName: url.endsWith('keyword=new') ? 'Latest' : 'Initial' }] };
    });
    const { result } = renderHook(() => useMaterialManagement(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.applyFilters({ keyword: 'old' }));
    act(() => result.current.applyFilters({ keyword: 'new' }));
    await waitFor(() => expect(result.current.rows[0].materialName).toBe('Latest'));
    await act(async () => finishOld({ resultList: [{ ...material, materialName: 'Stale' }] }));
    expect(result.current.rows[0].materialName).toBe('Latest');
  });

  it('blocks concurrent saves and requires an explicit query after an invalid saved response', async () => {
    let finishSave!: (value: unknown) => void;
    api.apiPost.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
    const { result } = renderHook(() => useMaterialManagement(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = { insertedRows: [{ ...createMaterialRow(), materialName: 'New', materialTypeCode: 'RAW' }],
      updatedRows: [], deletedRows: [] };
    act(() => result.current.handleChangesChange(changes));
    let pending!: Promise<void>;
    act(() => { pending = result.current.saveChanges(changes, acceptRows); void result.current.saveChanges(changes, acceptRows); });
    expect(api.apiPost).toHaveBeenCalledTimes(1);
    await act(async () => { finishSave({ item: { materials: [material] } }); await pending; });
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.error).toContain('저장은 완료');
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(api.apiPost).toHaveBeenCalledTimes(1);
    expect(api.apiGet).toHaveBeenCalledTimes(2);
    act(() => result.current.applyFilters({}));
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.apiPost.mockResolvedValue({ item: {
      materials: [material], rowIdMappings: { [String(changes.insertedRows[0].materialId)]: 12 },
    } });
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(api.apiPost).toHaveBeenCalledTimes(2);
    expect(result.current.hasChanges).toBe(false);
  });

  it('saves a single batch and preserves dirty rows after an error', async () => {
    const { result } = renderHook(() => useMaterialManagement(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = {
      insertedRows: [{ ...createMaterialRow(), materialName: 'New', materialTypeCode: 'RAW' }],
      updatedRows: [normalizeMaterialRow(material)], deletedRows: [],
    };
    act(() => result.current.handleChangesChange(changes));
    api.apiPost.mockRejectedValueOnce(new Error('중복 품목코드'));
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.error).toContain('중복');
    api.apiPost.mockResolvedValueOnce({ item: {
      materials: [material, { ...material, materialId: 31, materialName: 'New' }],
      rowIdMappings: { [String(changes.insertedRows[0].materialId)]: 31, '12': 12 },
    } });
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(api.apiPost).toHaveBeenLastCalledWith(
      '/api/v1/co/master/materials/save-batch',
      { materials: {
        insertedRows: [expect.objectContaining({ materialName: 'New', materialCode: '' })],
        updatedRows: [expect.objectContaining({ materialId: '12' })], deletedRows: [],
      } },
    );
    expect(result.current.hasChanges).toBe(false);
  });

  it('rejects deletion without sending a request', async () => {
    const { result } = renderHook(() => useMaterialManagement(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => result.current.saveChanges({
      insertedRows: [], updatedRows: [], deletedRows: [normalizeMaterialRow(material)],
    }, acceptRows));
    expect(result.current.error).toContain('삭제');
    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it('blocks resubmission when the server saved but grid acknowledgement throws', async () => {
    const { result } = renderHook(() => useMaterialManagement(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const changes = { insertedRows: [], updatedRows: [normalizeMaterialRow(material)], deletedRows: [] };
    act(() => result.current.handleChangesChange(changes));
    api.apiPost.mockResolvedValue({ item: { materials: [material], rowIdMappings: { '12': 12 } } });
    await act(async () => result.current.saveChanges(changes, () => { throw new Error('Grid unavailable'); }));
    expect(result.current.error).toContain('저장은 완료했지만 화면 반영에 실패');
    expect(result.current.hasChanges).toBe(true);
    act(() => result.current.setError(''));
    await act(async () => result.current.saveChanges(changes, acceptRows));
    expect(result.current.error).toContain('조회');
    expect(api.apiPost).toHaveBeenCalledTimes(1);
  });

  it('routes to the actual materials grid and searches through the common page header', async () => {
    render(<ThemeProvider theme={createTheme()}><NotificationProvider>
      <DashboardContent
        selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
        currentMenuName="품목관리" currentPageKey="materials"
        breadcrumbItems={['기준정보', '품목관리']}
        content={{ title: '품목관리', description: '품목 기준정보', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: false }}
        isTenantAdmin
      />
    </NotificationProvider></ThemeProvider>);
    await waitFor(() => expect(screen.getByLabelText('품목 목록')).toBeInTheDocument());
    expect(await screen.findByText('Sample')).toBeInTheDocument();
    const codeCell = await screen.findByRole('gridcell', { name: '000012' });
    fireEvent.click(codeCell);
    fireEvent.paste(codeCell, {
      clipboardData: { getData: () => '999999' },
    });
    expect(screen.queryByRole('gridcell', { name: '999999' })).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '000012' })).toBeVisible();
    fireEvent.doubleClick(codeCell);
    expect(screen.queryByDisplayValue('000012')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('품목 검색'), { target: { value: 'Sample' } });
    fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
    await waitFor(() => expect(api.apiGet).toHaveBeenCalledWith('/api/v1/co/master/materials?keyword=Sample'));
    fireEvent.click(screen.getByRole('button', { name: '품목 추가' }));
    expect(await screen.findByRole('dialog', { name: '품목 등록' })).toBeInTheDocument();
  }, 15000);

  it('accepts canonical rows without list/options reload or grid recreation', async () => {
    let finishSave!: (value: unknown) => void;
    let listRequests = 0;
    api.apiGet.mockImplementation((url: string) => {
      if (url.endsWith('/options')) return Promise.resolve({ resultList: [] });
      listRequests += 1;
      return listRequests === 1
        ? Promise.resolve({ resultList: [material] })
        : Promise.reject(new Error('Unexpected reload'));
    });
    api.apiPost.mockImplementation(
      () => new Promise((resolve) => { finishSave = resolve; }),
    );

    render(<ThemeProvider theme={createTheme()}><NotificationProvider>
      <DashboardContent
        selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
        currentMenuName="품목관리" currentPageKey="materials" breadcrumbItems={['품목관리']}
        content={{ title: '품목관리', description: '품목', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: false, excel: false }}
        isTenantAdmin
      />
    </NotificationProvider></ThemeProvider>);

    const nameCell = await screen.findByRole('gridcell', { name: 'Sample' });
    const originalGrid = screen.getByRole('grid', { name: '품목 목록' });
    fireEvent.doubleClick(nameCell);
    const editor = screen.getByDisplayValue('Sample');
    fireEvent.change(editor, { target: { value: 'Updated Sample' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
    expect(screen.getByRole('progressbar', { name: '품목 저장 중' })).toBeVisible();
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Updated Sample' })).toBeVisible();

    await act(async () => finishSave({ item: {
      materials: [{ ...material, materialName: 'Server canonical' }], rowIdMappings: { '12': 12 },
    } }));
    expect(listRequests).toBe(1);
    expect(api.apiGet).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('f1-grid-loading-overlay')).not.toBeInTheDocument();
    expect(screen.getByRole('grid', { name: '품목 목록' })).toBe(originalGrid);
    await waitFor(() => expect(screen.queryByRole('progressbar', { name: '품목 저장 중' })).not.toBeInTheDocument());
    expect(screen.getByRole('gridcell', { name: 'Server canonical' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(api.apiPost).toHaveBeenCalledTimes(1);
  });

  it('does not expose write actions to a non-admin user', async () => {
    render(<ThemeProvider theme={createTheme()}><NotificationProvider>
      <DashboardContent
        selectedModule={{ id: 'co', name: '기준정보', icon: null, tree: [], menus: [] }}
        currentMenuName="품목관리" currentPageKey="materials" breadcrumbItems={['품목관리']}
        content={{ title: '품목관리', description: '품목', cards: [], items: [] }}
        selectedMenuPermissions={{ read: true, create: true, update: true, delete: true, excel: false }}
        isTenantAdmin={false}
      />
    </NotificationProvider></ThemeProvider>);
    expect(await screen.findByText('Sample')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '품목 추가' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '저장', exact: true })).not.toBeInTheDocument();
  });
});
