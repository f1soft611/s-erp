---
name: skill-view
description: >
  React + TypeScript(Vite, MUI 9, 사내 f1-grid) 프론트엔드에서 새 도메인의
  CRUD 화면 소스 set — Page / Panel / service / types 4파일 — 을
  `frontend/src/pages/settings/system/modules` 레퍼런스 패턴에 맞춰 생성하고
  DashboardContent 디스패치까지 배선하는 업무 스킬. 단일 테이블 CRUD 화면을
  개발할 때 사용한다.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# skill-view — 프론트엔드 CRUD 화면 소스 set 생성

정본(canonical): `frontend/src/pages/settings/system/modules/`
- `ModuleManagementPage.tsx` — 화면 조립 + 페이지 레벨 상태 전부
- `components/ModuleManagementPanel.tsx` — f1-grid + 지연 배치 저장 엔진 (모달 없음, 행 추가/삭제는 그리드 컨텍스트 메뉴)
- `services/moduleManagement.service.ts` — 이 기능에서 유일하게 네트워크를 만지는 곳 (VO↔row 매핑 + 4개 CRUD 함수)
- `types/moduleManagement.types.ts` — 3개 계약 타입

## 0. 시작 전

1. 위 4개 파일 + `src/shared/components/f1-grid/`(배럴 `index.ts`, `types/grid.types.ts`) + `src/shared/services/apiClient.ts` + `src/shared/components/{PageHeader,PageSearchArea,PageMessageArea,PermissionGroup}.tsx` 를 **Read** (최신 코드가 이 문서보다 우선).
2. `frontend/AGENTS.md` 확인.
3. `src/pages/dashboard/components/DashboardContent.tsx` 와 `src/pages/dashboard/services/dashboardData.tsx` 확인 (디스패치/`pageContentMap`).
4. 같은 도메인이 이미 있는지 `Glob("frontend/src/pages/**/<Feat>/**")`.

## 1. 아키텍처 전제 (중요)

화면은 **react-router 라우트가 아니다.** `AppRouter.tsx` 는 인증 경로를 전부 `DashboardPage` 로 보내고, 개별 CRUD 화면은 `DashboardContent.tsx` 의 손수 작성한 if-ladder 가 `selectedModule.id` + `currentPageKey` 로 분기한다. `currentPageKey` = 백엔드 메뉴 `path` 의 마지막 세그먼트 (`menuService.toTreeNode` 가 리프에 `pageKey = id` 부여).

새 화면 배선 = **새 파일 4개 + `DashboardContent.tsx` 에 import 1줄 + if-branch 1개** (+ 선택: `pageContentMap` 항목, + 백엔드: 메뉴 row 와 API). `AppRouter.tsx` 는 건드리지 않는다.

## 2. 토큰

| 토큰 | 규칙 | `modules` | `warehouses` 예시 |
|---|---|---|---|
| `Feat` | 기능 슬러그(소문자, 보통 복수). = `pageKey` = `pageContentMap` 키 = URL 마지막 세그먼트 | `modules` | `warehouses` |
| `Dom` | PascalCase 도메인 토큰(보통 단수) | `Module` | `Warehouse` |
| `dom` | `Dom` 의 camelCase | `module` | `warehouse` |
| `한글명` | 화면 라벨 | `모듈 관리` | `창고 관리` |
| `moduleId` | 소속 모듈(디스패치 게이트 좌변) | `settings` | `settings` |

## 3. 생성 파일 (4개)

`src/pages/settings/system/<Feat>/` 하위:

| 파일 | export |
|---|---|
| `<Dom>ManagementPage.tsx` | `export function <Dom>ManagementPage(props: <Dom>ManagementPageProps)` |
| `components/<Dom>ManagementPanel.tsx` | `export const <Dom>ManagementPanel = forwardRef<<Dom>ManagementPanelHandle, <Dom>ManagementPanelProps>(...)` + `export type <Dom>ManagementPanelHandle` + (select 컬럼용) `export const <DOM>_..._OPTIONS` + `export const canEdit<Dom>Code` |
| `services/<dom>Management.service.ts` | `fetch<Dom>Rows`, `create<Dom>`, `update<Dom>`, `delete<Dom>` |
| `types/<dom>Management.types.ts` | `<Dom>ManagementRow`, `<Dom>SavePayload`, `System<Dom>VO` |

**상대 import 깊이:** Page → `src/` 는 `../../../../`, `src/pages/` 는 `../../../`. Panel·service(한 단계 더 깊음) → `src/` 는 `../../../../../`.

## 4. types 파일

```ts
export type <Dom>ManagementRow = {   // 그리드 행 + 폼 모델 (엄격)
  id: string;                        // 백엔드 PK 문자열화, 미저장 행은 `new-<dom>-${Date.now()}`
  // 입력 필드 1개당 1개: number→number, checkbox→boolean, 그 외→string
  // 백엔드 계산 컬럼(예: menuCount)은 read-only 주석
  use: boolean;
};

export type <Dom>SavePayload = {     // POST/PUT body — 백엔드 Java DTO 필드명
  <dom>Code: string;
  <dom>Nm: string;
  // 선택 문자열: `?: string | null`
  sortOrder: number;
  useAt: 'Y' | 'N';
};

export interface System<Dom>VO {     // result.resultList[] 원본 — 전부 unknown (toRow 가 강제 변환)
  <dom>Id?: unknown;
  tenantId?: unknown;                // 페이로드에 오지만 FE 는 무시 (테넌트는 JWT)
  // 나머지 VO 필드 전부 `?: unknown`
}
```

## 5. service 파일

```ts
import { apiDelete, apiGet, apiPost, apiPut } from '../../../../../shared/services/apiClient';
import type { <Dom>ManagementRow, <Dom>SavePayload, System<Dom>VO } from '../types/<dom>Management.types';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toRow = (vo: System<Dom>VO): <Dom>ManagementRow => ({
  id: String(vo.<dom>Id ?? ''),
  // 텍스트: String(vo.x ?? '') / 숫자: toNumber(vo.x) / 불리언: String(vo.useAt ?? 'Y') !== 'N'
});

export async function fetch<Dom>Rows(): Promise<<Dom>ManagementRow[]> {
  const result = await apiGet<{ resultList: System<Dom>VO[] }>('/api/v1/system/<Feat>');
  return (result.resultList ?? []).map(toRow);
}
export async function create<Dom>(payload: <Dom>SavePayload): Promise<void> { await apiPost('/api/v1/system/<Feat>', payload); }
export async function update<Dom>(id: string, payload: <Dom>SavePayload): Promise<void> { await apiPut(`/api/v1/system/<Feat>/${id}`, payload); }
export async function delete<Dom>(id: string): Promise<void> { await apiDelete(`/api/v1/system/<Feat>/${id}`); }
```

- `apiClient` 규약: `localStorage['s-erp-auth']` 에서 토큰 읽어 `Authorization: Bearer` 부착, 만료 시 자동 refresh, 응답 봉투 `{ resultCode, resultMessage, result }` 를 벗겨 `result` 만 반환, `!ok || resultCode !== '200'` 이면 `Error(정규화된 메시지)` throw. 서비스 함수는 봉투를 신경 쓰지 않는다.
- **테넌트 처리 없음** — 요청 레이어에서 테넌트를 다루지 않는다. `System<Dom>VO.tenantId` 는 읽지도 보내지도 않는다.

## 6. Panel 파일 (핵심)

- `forwardRef<<Dom>ManagementPanelHandle, <Dom>ManagementPanelProps>`.
- props: `{ <feat>: Row[]; searchQuery?; canExportExcel?; onCreate<Dom>?; onUpdate<Dom>?; onDelete<Dom>?; on<Feat>Saved?; onDirtyChange?; onError?; <feat>GridKey?; <feat>GridLoading? }` — 서비스 콜백은 import 한 함수로 **기본값 지정**.
- handle: `export type <Dom>ManagementPanelHandle = { saveCurrentChanges(): Promise<void>; deleteSelectedRows(): void; exportCurrentRows(): void }`.
- `export const canEdit<Dom>Code = (row): boolean => !row.id || String(row.id).startsWith('new-<dom>-')`.
- refs: `gridRef: F1GridRef<Row>`, `saveInFlightRef: useRef<Promise<void>|undefined>`, `completedOperationsRef: useRef(new Set<string>())` (`create:/update:/delete:<id>`).
- `emptyChanges = <T extends object>(): F1GridChanges<T> => ({ insertedRows: [], updatedRows: [], deletedRows: [] })`.
- `columns: F1GridColumn<Row>[]` — 필드 목록에서: 코드 컬럼 `editable: (row) => canEdit<Dom>Code(row)`, 그 외 `editable: true`, 타입 매핑(`type:'number'|'checkbox'|'select'`), select 는 `options` + `selectOptionIcon`, `use` 컬럼은 `type:'checkbox'` + `headerCheckbox: true`, 계산 컬럼은 `editable: false`. `headerAlign:'center'`.
- `create<Dom>Row = useCallback((): Row => ({ id: `new-<dom>-${Date.now()}`, ...기본값 }), [])`.
- `toPayload = (row): <Dom>SavePayload` — 문자열 `.trim()`, 선택 필드는 `|| null`, `useAt: row.use ? 'Y' : 'N'`, `sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0`.
- `saveCurrentChanges = useCallback(() => {...})` — **지연 배치 저장**:
  1. `if (saveInFlightRef.current) return saveInFlightRef.current;` (동시성 가드)
  2. `const changes = gridRef.current?.getChanges() ?? emptyChanges<Row>()`
  3. 검증: 모든 insert/update 행에 코드·이름 필수 → 없으면 `throw new Error('<코드>와 <이름>은 필수입니다.')`
  4. `insertedRows` → `create:<id>` 키가 Set 에 없으면 `await onCreate<Dom>(toPayload(row))` 후 Set 추가
  5. `updatedRows` → `update:<id>` 동일
  6. `deletedRows` → `new-<dom>-` 로 시작하면 **API 호출 안 함**, 아니면 `delete:<id>` 가드 후 `await onDelete<Dom>(String(row.id))`
  7. 변경이 하나라도 있었으면 `await on<Feat>Saved?.()` 후 `completedOperationsRef.current.clear()`
  8. `catch` → `onError?.(err instanceof Error ? err.message : '<한글명> 저장에 실패했습니다.')` 후 rethrow
  9. `saveInFlightRef.current = savePromise` 저장, 완료/실패 시 자기 자신이면 `undefined` 로 리셋
- `useImperativeHandle(ref, () => ({ saveCurrentChanges, deleteSelectedRows: () => gridRef.current?.deleteSelectedRows(), exportCurrentRows }), [...])`.
- dirty 추적: `filtered<Rows>` 변할 때 `gridRef.current.getChanges()` 로 재계산하는 `useEffect` + `<F1Grid onChangesChange>` 둘 다 `onDirtyChange?.(inserted>0 || updated>0 || deleted>0)`.
- 렌더: `<Box p><Card (hairline border, boxShadow:'none', flex column, overflow:hidden)><CardContent p:2.5>` → 제목 `<Typography variant="h6" sx={{ fontWeight: 700 }}>한글명</Typography>` → `<Box flex:1 overflow:hidden>` → `<F1Grid>`.

**`<F1Grid>` props (modules 가 쓰는 것):**
```tsx
<F1Grid
  key={<feat>GridKey}
  ref={gridRef}
  rows={filtered<Rows>}
  columns={columns}
  rowKey="id"
  ariaLabel="F1-GRID 한글명"
  height="100%" maxHeight="100%"
  rowHeight={32} minRowHeight={32} maxRowHeight={320}
  showCheckbox={false}
  createRow={create<Dom>Row}
  editorPlugins={[{ id: '<feat>-grid-editor', enabled: true, canEdit: () => true }]}
  beforeEdit={({ row, field }) => !(field === '<codeField>' && !canEdit<Dom>Code(row))}
  canExportExcel={canExportExcel}
  excelFileName="<feat>-management-export"
  loading={<feat>GridLoading}
  allowAddRowInContextMenu
  allowDuplicateRowInContextMenu={false}
  allowDeleteRowInContextMenu
  onChangesChange={(c) => onDirtyChange?.((c?.insertedRows?.length ?? 0) > 0 || (c?.updatedRows?.length ?? 0) > 0 || (c?.deletedRows?.length ?? 0) > 0)}
/>
```
import: `import { F1Grid, type F1GridChanges, type F1GridColumn, type F1GridRef } from '../../../../../shared/components/f1-grid';`
`F1GridChanges<T> = { insertedRows: T[]; updatedRows: T[]; deletedRows: T[] }`. `F1GridColumn.type`: `'text'|'number'|'decimal'|'currency'|'checkbox'|'date'|'datetime'|'time'|'select'|'autocomplete'|'code'|'rownumber'`.

## 7. Page 파일

- `export function <Dom>ManagementPage({ selectedModule, currentMenuName, content, breadcrumbItems, selectedMenuPermissions }: <Dom>ManagementPageProps)`
- props 타입:
  ```ts
  type <Dom>ManagementPageProps = {
    selectedModule: ModuleItem; currentMenuName: string; content: PageContent;
    breadcrumbItems?: string[];
    selectedMenuPermissions?: { read: boolean; create: boolean; update: boolean; delete: boolean; excel?: boolean };
  };
  ```
  (`ModuleItem`, `PageContent` from `../../../dashboard/types/dashboard`)
- 상태: `panelRef`, `rows`, `error`, `searchQuery`, `panelDirty`, `saving`, `pageLoading`, `<feat>GridKey`, `requestIdRef = useRef(0)`.
- `filtered<Rows>` `useMemo` — 검색어를 소문자화해 검색 대상 문자열 필드들을 `join(' ').toLowerCase().includes(query)`. **서버 호출/디바운스/페이지네이션 없음.**
- `pageActionPermissions = useMemo(() => ({ read: Boolean(sel?.read), write: Boolean(sel?.create || sel?.update), excel: Boolean(sel?.excel) }))`.
- `loadRows({ showSkeleton })` — `requestId = ++requestIdRef.current` stale 가드, 실패 시 `setRows([])` + `setError(err.message ?? '<한글명> 목록을 불러오지 못했습니다.')` 후 rethrow.
- 마운트 `useEffect` → `void loadRows({ showSkeleton: true }).catch(() => undefined)`.
- `handleSaved` → `await loadRows()` + `set<feat>GridKey((n) => n + 1)`.
- `handleSaveChanges` → `setSaving(true)` → `await panelRef.current?.saveCurrentChanges()` → `catch setError` → `finally setSaving(false)`.
- `pageActionGroups: PermissionActionGroupDefinition[]` — `read`→`{ label:'조회', icon: SearchIcon, visible: pageActionPermissions.read, onClick: () => void loadRows({ showSkeleton: true }) }`, `write`→`{ label:'저장', icon: SaveIcon, visible: pageActionPermissions.write, disabled: !panelDirty || saving, onClick: () => void handleSaveChanges() }`.
- 렌더:
  ```tsx
  <Box sx={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, height:'100%' }}>
    <PageHeader
      breadcrumbItems={breadcrumbItems && breadcrumbItems.length > 0 ? breadcrumbItems : [selectedModule.name, currentMenuName]}
      description={content.description}
      actionGroups={pageActionGroups}
    />
    <PageSearchArea>
      <TextField size="small" margin="none" placeholder="..." value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        slotProps={{ htmlInput: { 'aria-label': '...' },
          input: { startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} /> } }}
        sx={/* flex:'1 1 220px', minWidth {xs:'100%',sm:220}, maxWidth:360, height:40 */} />
    </PageSearchArea>
    <PageMessageArea message={error} onClose={() => setError('')} />
    <<Dom>ManagementPanel ref={panelRef} <feat>={filtered<Rows>} searchQuery={searchQuery}
      canExportExcel={pageActionPermissions.excel}
      onCreate<Dom>={create<Dom>} onUpdate<Dom>={update<Dom>} onDelete<Dom>={delete<Dom>}
      on<Feat>Saved={handleSaved} onDirtyChange={setPanelDirty} onError={setError}
      <feat>GridKey={<feat>GridKey} <feat>GridLoading={pageLoading} />
  </Box>
  ```
  import: `@mui/material`(`Box`,`TextField`), `@mui/icons-material/SearchIcon`·`SaveIcon`, `../../../../shared/components/{PageHeader,PermissionGroup,PageMessageArea,PageSearchArea}`, `../../../dashboard/types/dashboard`.

## 8. 디스패치 배선 (feature dir 밖 편집)

**필수 — `src/pages/dashboard/components/DashboardContent.tsx`:**
```tsx
import { <Dom>ManagementPage } from '../../settings/system/<Feat>/<Dom>ManagementPage';
// ...기존 'modules' 분기 옆에, sales/generic fallback 앞에:
if (selectedModule.id === '<moduleId>' && currentPageKey === '<Feat>') {
  return (
    <<Dom>ManagementPage
      selectedModule={selectedModule}
      currentMenuName={currentMenuName}
      content={content}
      breadcrumbItems={breadcrumbItems}
      selectedMenuPermissions={selectedMenuPermissions}
    />
  );
}
```

**권장 — `src/pages/dashboard/services/dashboardData.tsx`** `pageContentMap` 에:
```tsx
<Feat>: { title: '<한글명>', description: '...', kind: 'menus', cards: [], items: [] },
```
(누락돼도 컴파일됨 — `defaultPage` 로 폴백. 메뉴 노드가 `buildPageContent` 로 title/description 을 덮어씀.)

**프론트 밖 (이 스킬 범위 아님, 참고):** 백엔드 `/api/v1/system/<Feat>`(+`/{id}`) 엔드포인트가 표준 봉투 반환, DB 메뉴 row(`path` 가 `/<Feat>` 로 끝나고 `<moduleId>` 하위, 역할 권한 부여) 가 있어야 사이드바에 뜨고 화면 도달 가능.

## 9. 완료 체크리스트

- [ ] feature dir 4파일 생성, export 이름 규칙 준수, import 깊이 정확
- [ ] 3-타입 트라이어드 (`Row` 엄격 / `SavePayload` 백엔드 필드명 / `VO` 전부 `unknown`)
- [ ] 컬럼 `type` ↔ row 필드 타입 정합 (`number`/`checkbox`/`select`/text)
- [ ] `saveCurrentChanges` 의 검증·멱등(Set)·동시성(inFlight) 가드 포함
- [ ] `DashboardContent.tsx` import + if-branch 추가 (게이트 좌변 = 실제 `moduleId`)
- [ ] (권장) `pageContentMap` 항목
- [ ] i18n 없음 — 라벨은 한글 문자열 리터럴. toast 없음 — 오류는 `error` string → `PageMessageArea`.
- [ ] `cd frontend && npm install && npm run build` (`tsc -b && vite build`) TS 에러 0
- [ ] `cd frontend && npm run test` (`vitest run`) 통과 / (선택) `npm run lint` (`oxlint`)
- [ ] feature dir 밖은 `DashboardContent.tsx`(필수)·`dashboardData.tsx`(권장) 외 미변경

## 10. 주의 (레퍼런스 gotcha)

- 화면은 라우트가 아님 → `AppRouter.tsx` 손대지 않음. 도달성은 백엔드 메뉴 row 의 `path` 마지막 세그먼트 = `<Feat>` 로 결정.
- 모달/확인 다이얼로그 없음 (modules 기준). 행 추가·삭제는 그리드 우클릭 컨텍스트 메뉴. 저장은 페이지 헤더 "저장" 버튼(지연 배치).
- 코드 컬럼은 신규 행(`new-<dom>-*`)에서만 편집 가능 — `editable` 조건자 + `beforeEdit` 이중 잠금.
- 서비스 함수는 봉투를 벗긴 `result` 를 받음. 목록은 `result.resultList`.
- 페이지네이션·서버 검색·react-query·form 라이브러리·zod·axios 전부 없음. `fetch` + `apiClient` 뿐.
