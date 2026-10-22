# community-archive-upload-f1tree 결과

관련 문서: [작업지시서](../../../directions/20261021/20261021_001_커뮤니티_자료실_업로드_및_F1Tree_개선_작업지시서.md), [계획서](../../../plan/20261021/20261021_001_community_archive_upload_f1tree_plan.md), [상세사양서](../../../spec/20261021/20261021_001_커뮤니티_자료실_업로드_F1Tree_상세사양서.md)

## 1) 원인과 수정

- 원인: `ArchiveBoardServiceImpl.uploadFile`이 게시글 INSERT 파라미터에 `writerId`/`writerName`을 넣지 않았고, `tb_board_post.writer_id`는 NOT NULL이라 DB 오류(`데이터 처리 중 오류가 발생했습니다...`)가 발생했다.
- 수정: 업로드 전용 insert map에 인증 사용자의 `writerId`/`writerName`을 추가했다. SQL/스키마/API 변경은 없다.
- 회귀 테스트: `ArchiveBoardServiceImplTest#directUploadCreatesArchivePostWithFileNameTitle`에 writer/최종 수정자 assertion을 추가했고, 수정 전 실패(writer 필드 누락)와 수정 후 통과를 확인했다.

## 2) 화면 변경

- 자료실 목록을 `F1Tree`로 전환했다. 루트 `폴더`(분류 자식), `파일`(파일 자식) 두 섹션이며 기본 펼침이다.
- `rowKey`/`parentId`: `section:folders`/`null`, `folder:<code>`/`section:folders`, `section:files`/`null`, `file:<id>`/`section:files`.
- 분류 클릭 시 폴더 필터 이동, 아이콘, 파일 컬럼/작업, 검색, 권한, 즉시 업로드는 유지했다. 폴더 안에서는 파일 섹션만 표시한다.

## 3) 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 백엔드 | `mvn "-Dtest=ArchiveBoardServiceImplTest,ArchiveBoardApiControllerTest,ArchiveBoardTenantScopeMapperTest" test` | PASS (34 tests) |
| 프론트 | `npm run test -- tests/archive-page.test.tsx tests/archive-board-service.test.ts` | PASS (20 tests) |
| 빌드 | `npm run build` | 성공 (chunk size 경고만 있음) |

- 프론트 회귀 테스트는 `폴더 접기`/`파일 접기` 트리 컨트롤을 먼저 추가해 실패를 확인한 뒤 통과시켰다.

## 4) DB MCP 근거

- `s-erp-postgresql-readonly`의 `list_tables`, `describe_table(tb_board_post)`, `describe_table(tb_common_file)` 메타데이터만 확인했다. 테넌트 데이터 행은 조회하지 않았다.

## 5) 미수행 항목

- 실브라우저 375/768/1280px 렌더링 및 스크린샷은 로그인이 필요한 화면이라 실계정/tenant 데이터를 사용하지 않기 위해 수행하지 않았다. 별도 확인이 필요하다.

## 6) 2026-10-21 우클릭 메뉴 후속 변경

- 자료실 F1Tree에만 `allowAddRootInContextMenu={false}`를 적용해 `루트 추가`를 숨기고 `canExportExcel`을 활성화했다. 행 추가/삭제/복제 메뉴와 공통 F1Tree 동작은 변경하지 않았다.
- 새 자료실 페이지 테스트는 구현 전 `루트 추가`가 실제 메뉴에 나타나 실패했고, 구현 후 루트 추가가 없고 엑셀 내보내기가 나타나는지 확인한다.
- `npx vitest run tests/archive-page.test.tsx`: PASS (12 tests).
- `npx vitest run tests/f1-grid-context-menu.test.tsx -t "shows the excel export item when canExportExcel is true and triggers a download"`: PASS (1 test; exporter 다운로드 실행 확인).
- `npm run build`: PASS. 기존 번들 크기 경고가 표시되었다.
- 전체 `tests/f1-grid-context-menu.test.tsx`도 실행했으며 30개 중 28개 통과, 2개 실패했다. 실패는 이번 변경과 무관한 `clears tree sorting from the shared context menu` 및 `clears tree filters from the shared context menu`이다. 기존 `F1Tree`가 `disableSorting`/`disableFiltering`을 고정 적용하는 구현과 해당 테스트의 정렬·필터 메뉴 기대가 어긋난 것으로 확인했다. 이 공통 동작은 작업 범위를 벗어나 수정하지 않았다.

## 7) 2026-10-21 컨텍스트 메뉴 구분선 수정

- 원인: 메뉴 행 작업이 숨겨진 경우에도 액션 그룹 앞 구분선과 마지막 초기화 메뉴 앞 구분선이 각각 항상 출력되어, 자료실 메뉴에 구분선이 연속으로 두 개 보였다.
- 수정: `F1Grid`에서 루트/행 추가·복제·삭제 액션 그룹 및 정렬/필터 액션 그룹의 표시 여부에 맞춰 그룹 경계 구분선을 출력한다. 자료실처럼 두 그룹이 모두 없으면 일반 메뉴와 기본 설정 복원 사이에 구분선 하나만 표시한다.
- TDD: `renders one separator when a tree context menu has no row actions` 테스트가 수정 전 2개 separator를 반환해 실패했고, 수정 후 1개를 확인해 통과했다.
- `npx vitest run tests/f1-grid-context-menu.test.tsx -t "renders one separator when a tree context menu has no row actions|omits the clear-action group divider|keeps the clear-action group divider"`: PASS (3 tests).
- `npx vitest run tests/archive-page.test.tsx`: PASS (12 tests).
- `npm run build`: PASS. The existing large-bundle warning remains.
