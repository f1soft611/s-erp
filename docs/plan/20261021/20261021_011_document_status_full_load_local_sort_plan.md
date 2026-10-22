# 문서현황 전체조회 및 로컬 그리드 정렬·필터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서현황은 검색조건에 맞는 전체 결과를 조회하고, 그리드 정렬·필터를 재조회 없이 로컬 처리한다.

**Architecture:** 문서현황 검색 API는 offset/limit이 있는 기존 호출에는 200건 페이징을 유지하고, 둘 다 없는 호출에는 동일한 권한·검색 조건으로 전체 목록을 반환한다. 프런트엔드는 문서현황 검색에 전체조회 서비스를 사용해 결과를 `F1Grid.rows`로 전달하고, F1Grid의 기존 로컬 정렬·필터를 사용한다.

**Tech Stack:** Java 17, Spring Boot/eGovFrame, MyBatis XML, PostgreSQL, React, TypeScript, F1Grid, Vitest, JUnit, Maven.

---

## 구현 파일과 책임

| 경로 | 변경 책임 |
|---|---|
| `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java` | 검색 요청의 페이징 여부에 따라 offset/limit 설정 및 검증 |
| `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml` | limit이 있는 호출에만 LIMIT/OFFSET SQL 적용 |
| `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java` | 전체조회 및 기존 페이징 서비스 계약 검증 |
| `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java` | 전체조회 SQL에 LIMIT/OFFSET 부재, 페이징 SQL에 유지 검증 |
| `frontend/src/pages/groupware/documents/status/services/documentStatus.service.ts` | offset/limit이 없는 전체조회 API 서비스 추가, 기존 데이터소스 보존 |
| `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx` | 전체 목록 요청·상태·취소·오류·재시도 연결 |
| `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx` | `rows`/`loading` 전달, 필터 비활성화 옵션 제거 |
| `frontend/tests/document-status-service.test.ts` | 전체조회 파라미터와 응답 검증 |
| `frontend/tests/document-status-page.test.tsx` | 전체 행 표시, 필터 메뉴, 정렬·필터 재조회 방지 검증 |
| `frontend/src/pages/f1-grid-docs/F1-GRID.md` | 문서현황의 전체조회 및 로컬 그리드 동작 설명 갱신 |
| `docs/result/20261021/document-status-full-load-local-grid/20261021_011_document_status_full_load_local_grid_result.md` | 구현, 검증, 결과 스크린샷 기록 |

## 사전 조건

- 백엔드 API 데이터 계약을 바꾸기 전에 `s-erp-postgresql-readonly` MCP의 `list_tables` 및 필요한 `describe_table`을 호출한다. 행 데이터는 읽지 않으며 스키마 변경은 하지 않는다.
- 구현 전 작업트리 상태를 확인하고, 기존 사용자 변경을 보존한다.
- 테스트가 현재 화면 동작과 충돌하는 경우 승인된 설계와 날짜별 상세사양을 기준으로 테스트를 갱신한다.

### Task 1: 전체조회와 기존 페이징 백엔드 계약

**Files:**
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`
- Modify: `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`

- [x] **Step 1: 전체조회 서비스 실패 테스트 추가**

`DocumentApprovalServiceImplTest`에 offset/limit 없이 날짜와 상세검색 조건만 전달하는 테스트를 추가한다. 현재 코드가 기본 `limit=200`, `offset=0`을 넣으므로 이 테스트는 그 값이 DAO 파라미터에 없는지 검증한다.

```java
@Test
void statusSearchWithoutPagingLoadsAllMatchingDocuments() throws Exception {
    DocumentApprovalListQueryVO query = new DocumentApprovalListQueryVO();
    query.setSubmittedAtFrom("2026-09-20");
    query.setSubmittedAtTo("2026-10-20");
    query.setDocumentStatus("COMPLETED");

    DocumentApprovalStatusListItemVO item = new DocumentApprovalStatusListItemVO();
    item.setElectronicApprovalId(77L);
    when(approvalDAO.selectRelatedDocumentPage(anyMap()))
            .thenReturn(Collections.singletonList(item));
    when(approvalDAO.countRelatedDocuments(anyMap())).thenReturn(1L);

    DocumentApprovalListPageVO page = (DocumentApprovalListPageVO) invokeApprovalMethod(
            "searchDocuments",
            new Class<?>[] { LoginVO.class, String.class, DocumentApprovalListQueryVO.class },
            author, "ALL", query);

    assertThat(page.getResultList()).containsExactly(item);
    assertThat(page.getTotalRowCount()).isEqualTo(1L);
    verify(approvalDAO).selectRelatedDocumentPage(argThat(params ->
            "2026-09-20".equals(params.get("submittedAtFrom"))
                    && "2026-10-20".equals(params.get("submittedAtTo"))
                    && "COMPLETED".equals(params.get("documentStatus"))
                    && !params.containsKey("limit")
                    && !params.containsKey("offset")));
}
```

- [x] **Step 2: 기존 페이징 계약 테스트를 먼저 실행**

Run: `Set-Location backend; mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test`

Expected: 새 전체조회 테스트가 현재 기본 `limit=200`/`offset=0` 때문에 실패하고, 기존 페이징 테스트는 통과한다.

- [x] **Step 3: 페이징 여부에 따라 서비스 파라미터 설정**

`searchDocuments`에서 offset 또는 limit 제공 여부를 확인한다. 둘 다 없는 요청은 limit/offset 파라미터를 넣지 않고, 둘 중 하나라도 있으면 누락된 값은 기존처럼 offset 0 또는 limit 200으로 보정한다. 페이징 요청의 범위 검증(`limit <= 200`, offset 0 이상)은 유지한다.

```java
boolean paged = query.getOffset() != null || query.getLimit() != null;
Integer offset = paged ? (query.getOffset() == null ? 0 : query.getOffset()) : null;
Integer limit = paged ? (query.getLimit() == null ? 200 : query.getLimit()) : null;
if (paged && (offset < 0 || limit < 1 || limit > 200)) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문서 조회 범위가 올바르지 않습니다.");
}
```

DAO 파라미터에는 `paged`인 경우에만 `offset`, `limit`을 추가한다. 그 외 검색조건, 기본 정렬, 인증 및 tenant 범위 처리는 변경하지 않는다.

- [x] **Step 4: Mapper에 조건부 페이징 추가**

`selectRelatedDocumentPage`의 마지막 SQL을 아래처럼 바꾼다. 서비스는 페이징 요청에 두 값을 함께 설정하므로 전체조회 SQL에는 LIMIT/OFFSET이 생성되지 않는다.

```xml
        <if test="limit != null and offset != null">
            LIMIT #{limit} OFFSET #{offset}
        </if>
```

- [x] **Step 5: Mapper 모드별 SQL 테스트 추가**

기존 `documentStatusPageUsesActorScopedBoundFiltersAndMatchingCount`는 `LIMIT ? OFFSET ?` 확인을 유지한다. 같은 Mapper 테스트에 limit/offset 키가 없는 매개변수로 SQL을 생성해 검색조건 및 정렬은 유지되고 `LIMIT`/`OFFSET`은 없는지 검사한다.

```java
Map<String, Object> allRowsParams = new HashMap<>(params);
allRowsParams.remove("limit");
allRowsParams.remove("offset");
String allRowsSql = configuration
        .getMappedStatement("DocumentApprovalDAO.selectRelatedDocumentPage")
        .getBoundSql(allRowsParams).getSql().replaceAll("\\s+", " ");
assertThat(allRowsSql).contains("ORDER BY m.submitted_at DESC")
        .doesNotContain("LIMIT", "OFFSET");
```

- [x] **Step 6: 타깃 백엔드 테스트를 재실행**

Run: `Set-Location backend; mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test`

Expected: 기존 페이징 SQL 및 새 전체조회 SQL 검증을 포함해 모든 타깃 테스트 통과.

### Task 2: 프런트엔드 전체조회 서비스

**Files:**
- Modify: `frontend/tests/document-status-service.test.ts`
- Modify: `frontend/src/pages/groupware/documents/status/services/documentStatus.service.ts`

- [x] **Step 1: offset/limit 없는 전체조회 서비스 테스트 추가**

API 응답의 행 검증을 유지하면서 검색조건만 query string에 포함하고, `offset`, `limit`, `sortField`, `sortDirection`은 보내지 않는 새 메서드 `searchDocumentStatus`의 테스트를 추가한다.

```ts
it('loads all matching status rows without paging parameters', async () => {
  api.get.mockResolvedValue({ resultList: [row], totalRowCount: 1 });
  const controller = new AbortController();

  await expect(
    searchDocumentStatus(
      { documentStatus: 'COMPLETED', submittedAtFrom: '2026-09-20' },
      controller.signal,
    ),
  ).resolves.toEqual({ rows: [row], totalRowCount: 1 });

  const [path, signal] = api.get.mock.calls[0] as [string, AbortSignal];
  const request = new URL(path, 'http://localhost');
  expect(request.searchParams.get('documentStatus')).toBe('COMPLETED');
  expect(request.searchParams.get('submittedAtFrom')).toBe('2026-09-20');
  expect(request.searchParams.has('offset')).toBe(false);
  expect(request.searchParams.has('limit')).toBe(false);
  expect(request.searchParams.has('sortField')).toBe(false);
  expect(request.searchParams.has('sortDirection')).toBe(false);
  expect(signal).toBe(controller.signal);
});
```

- [x] **Step 2: 서비스 테스트를 실행해 신규 동작 실패 확인**

Run: `Set-Location frontend; npm run test -- tests/document-status-service.test.ts`

Expected: 테스트가 `searchDocumentStatus` 미구현으로 실패한다.

- [x] **Step 3: 공통 응답 검증을 재사용해 전체조회 서비스 추가**

`searchDocumentStatus(filters, signal)`은 기존 문서검색 URL 및 필터 직렬화를 재사용하되 F1Grid query의 offset/limit/sorts는 받지 않는다. `validatePageResponse`를 사용해 전체 행의 타입과 `totalRowCount`를 검증한다. `createDocumentStatusDataSource`의 기존 offset/limit/정렬 동작은 삭제하거나 변경하지 않는다.

- [x] **Step 4: 프런트엔드 서비스 테스트 재실행**

Run: `Set-Location frontend; npm run test -- tests/document-status-service.test.ts`

Expected: 전체조회 및 기존 데이터소스 페이징/정렬 테스트 통과.

### Task 3: 전체 행을 로컬 F1Grid에 연결

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`

- [x] **Step 1: 화면이 페이지 파라미터 없이 전체조회하는 테스트 추가**

페이지 초기 진입 및 상세검색 실행에서 API query가 검색조건만 포함하고 `offset`/`limit`을 포함하지 않는지 확인한다. 200행보다 많은 응답을 반환해 전체 목록의 `aria-rowcount`가 응답 행 수와 일치하는지 검증한다.

```tsx
it('loads the full matching result into the grid without paging', async () => {
  const allRows = Array.from({ length: 205 }, (_, index) => ({
    ...row,
    electronicApprovalId: index + 1,
    title: `Document ${index + 1}`,
  }));
  api.get.mockImplementation((path: string) =>
    path.includes('/common/system-date')
      ? Promise.resolve({ today: SYSTEM_TODAY })
      : path.includes('/documents/search?')
        ? Promise.resolve({ resultList: allRows, totalRowCount: 205 })
        : Promise.resolve({}),
  );

  renderDocumentStatusPage();
  const grid = await screen.findByRole('grid', { name: '문서현황' });

  expect(grid).toHaveAttribute('aria-rowcount', '205');
  expect(getListRequest().has('offset')).toBe(false);
  expect(getListRequest().has('limit')).toBe(false);
});
```

- [x] **Step 2: 그리드에서 정렬과 필터가 요청을 재호출하지 않는 테스트 추가**

기존 F1Grid 헤더 메뉴 접근 패턴을 사용해 문서번호 헤더에서 정렬을 실행하고, 제목 헤더에서 필터 메뉴를 열어 값 적용/해제를 검증한다. 각 동작 전후 `getListRequests()`의 값이 동일해야 한다.

```tsx
const initialRequests = getListRequests();
fireEvent.click(screen.getByRole('button', { name: '문서번호 컬럼 메뉴' }));
fireEvent.click(screen.getByRole('menuitem', { name: '오름차순 정렬' }));
expect(getListRequests()).toBe(initialRequests);

fireEvent.click(screen.getByRole('button', { name: '제목 컬럼 메뉴' }));
fireEvent.click(screen.getByRole('menuitem', { name: '필터' }));
expect(screen.getByLabelText('제목 필터 값')).toBeInTheDocument();
```

- [x] **Step 3: 화면 테스트를 실행해 신규 요구 실패 확인**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx`

Expected: 현재 화면의 offset/limit 요청, 200행 제한 결과, 숨겨진 필터 메뉴 때문에 새 테스트가 실패한다.

- [x] **Step 4: 페이지 상태를 전체조회 로딩으로 전환**

`DocumentStatusPage`는 `rows`, `loading`, `totalRowCount`, `hasLoaded`, `error` 상태를 관리한다. `appliedFilters`/재시도 token 변경 시 `AbortController`로 이전 요청을 취소하고 `searchDocumentStatus`를 실행한다. 성공 시 전체 행과 count를 저장하고, 실패 시 기존 `PageMessageArea`에 오류를 표시한다. 검색조건 변경에 따른 선택 행 초기화, 상세 작업 완료 후 재조회, retry 동작을 유지한다.

- [x] **Step 5: 그리드 입력을 rows로 바꾸고 필터링 활성화**

`DocumentStatusGrid`는 `rows`와 `loading`을 `F1Grid`에 전달한다. `dataSource`, `onDataSourceError`, `disableFiltering` prop을 제거한다. `showCheckbox`, 선택 콜백, 행 컨텍스트 메뉴 설정, 엑셀 내보내기, 높이 및 기존 상세 연결은 유지한다.

- [x] **Step 6: 화면 회귀 테스트 실행**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts`

Expected: 전체조회, 필터/정렬 재조회 없음, 상세검색, 세션 복원, 날짜 기본값, 초기화, 상세 패널 및 오류/재시도 관련 테스트 통과.

### Task 4: 문서화 및 최종 검증

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261021/document-status-full-load-local-grid/20261021_011_document_status_full_load_local_grid_result.md`
- Create: `docs/result/20261021/document-status-full-load-local-grid/screenshots/` (브라우저 검증 이미지)

- [x] **Step 1: F1-GRID 문서의 문서현황 설명 갱신**

문서현황 관련 설명에서 원격 페이지 로딩을 전체조회+로컬 그리드 동작으로 바꾼다. 상세검색/날짜 세션 설명과 페이지의 읽기 전용 컨텍스트 메뉴 및 엑셀 동작은 유지한다.

- [x] **Step 2: 타깃 프런트엔드 테스트와 빌드 실행**

Run: `Set-Location frontend; npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts; npm run build`

Expected: 선택한 테스트와 TypeScript/Vite 빌드 통과.

- [x] **Step 3: 타깃 백엔드 테스트 실행**

Run: `Set-Location backend; mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test`

Expected: 전체조회/페이징 및 기존 문서현황 검색 테스트 통과.

- [x] **Step 4: 브라우저에서 반응형 및 상호작용 검증**

`npm run dev -- --strictPort`로 4173 서버를 띄우고, 375px/768px/1280px에서 문서현황 페이지를 열어 필터 메뉴 노출, 로컬 정렬·필터, 조회 완료까지 로딩, 전체 row count를 확인한다. 스크린샷은 영문 경로 `docs/result/20261021/document-status-full-load-local-grid/screenshots/`에 저장한다. 테스트 종료 후 직접 시작한 서버를 종료한다.

- [x] **Step 5: 결과 문서와 diff 검증**

결과 문서에 원인, API 전체조회/기존 페이징 병행 방식, 로컬 정렬·필터, MCP 메타데이터 확인 사실, 테스트 결과, 브라우저 검증 및 스크린샷을 기록한다. Run: `git --no-pager diff --check`.

Expected: 공백 오류가 없고 요구 범위의 프런트엔드/백엔드/문서만 변경된다.

## 설계 및 작업 근거

- 승인 설계: `docs/superpowers/specs/2026-10-21-document-status-full-load-local-grid-design.md`
- 작업지시서: `docs/directions/20261021/20261021_011_document_status_full_load_local_grid_work_instruction.md`
- 상세사양: `docs/spec/20261021/20261021_011_document_status_full_load_local_sort_spec.md`
