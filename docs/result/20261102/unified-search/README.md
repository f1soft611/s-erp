# 통합검색 구현 결과

> 후속 변경: [상단 직접 검색·전용 결과 페이지 구현 결과](../unified-search-page/README.md). 이 문서는 초기 모달 구현 기록이며 현재 UI는 전용 페이지다.

근거: [작업지시서](../../../directions/20261102/20261102_004_통합검색_작업지시서.md), [계획서](../../../plan/20261102/20261102_004_통합검색_계획서.md), [상세사양서](../../../spec/20261102/20261102_004_통합검색_상세사양서.md).

## 구현 범위

- 우측 상단 알림 아이콘 앞에 통합검색 아이콘과 공통 검색 모달을 추가했다.
- 메뉴·전자결재 문서·공지를 전체 또는 유형별로 검색한다. 검색어는 trim 후 2~100자이며 Enter/조회로 제출한다.
- 전체는 유형별 5개, 개별 유형은 페이지당 10개를 표시한다. 더보기/이전/다음은 마지막 제출 검색어를 유지한다.
- 검색 전 안내, 로딩, 빈 결과, 오류/재시도를 구분한다. 새 요청·닫기·unmount 이후 이전 응답이 화면을 덮어쓰지 않는다.
- 결과는 평문으로 표시하고 내부 경로만 연다. 닫았다 다시 열면 빈 검색 상태로 시작한다.
- 메뉴는 기존 경로, 문서는 `approvalId`, 공지는 `dashboardPostId`로 기존 화면을 연다.
- 같은 공지 화면에서 다른 검색 결과를 선택해도 상세가 갱신된다. 기존 초기-state에만 의존하던 query 처리를 DashboardPage의 reactive location 파싱과 props 전달로 보완했다.

검색 기록, 쪽지/댓글/첨부파일 내용 검색, 별도 검색엔진, 웹 푸시는 포함하지 않았다.

## API 및 조회 경계

`GET /api/v1/search?keyword=...&type=ALL&offset=0&limit=5`

인증 principal의 tenant/user/역할을 사용하며 클라이언트 tenant 입력을 신뢰하지 않는다. 기존 ResultVO의 `result.item.groups`로 유형별 items/totalCount/offset/limit을 반환한다.

| 유형 | 기존 조회와 권한 |
|---|---|
| 메뉴 | SystemMenuService의 현재 사용자 메뉴 트리에서 READ leaf만 반환. 모듈/그룹/외부 경로 제외 |
| 문서 | 문서작성 메뉴 READ가 있을 때만 DocumentApprovalStatusService의 ALL 검색 재사용. 기존 tenant/삭제 제외/본인 기안 또는 비초안 결재선 관련자 조건 유지 |
| 공지 | 공지 메뉴 READ가 있을 때만 기존 NoticeBoardDAO의 NOTICE 목록/건수 조회. tenant/삭제 제외 조건 유지, 첨부·댓글 추가 조회 없음 |

권한 없는 유형은 빈 결과/0건이며 해당 도메인 조회를 호출하지 않는다. 조회 장애는 빈 성공으로 변환하지 않고 오류로 전달한다. 상세 화면의 기존 접근 검증은 그대로 유지한다.

## DB 확인 및 변경

구현 전 기본 읽기 전용 PostgreSQL MCP의 `list_tables` → `describe_table` 순서로 `tb_menu`, `tb_electronic_approval_main`, `tb_board_post` 메타데이터를 확인했다. 메뉴 경로/사용 여부, 문서 제목/문서번호/기안자/테넌트/삭제 여부, 공지 본문 텍스트/유형/테넌트/삭제 여부 컬럼을 확인했다.

행 데이터·자격 증명은 조회하거나 기록하지 않았다. 기존 서비스/DAO와 SQL을 재사용하며 **신규 테이블·컬럼·SQL 변경 및 DDL 적용이 없다.** 따라서 별도 migration/rollback 스크립트는 필요하지 않다.

## 검증

| 검증 | 결과 |
|---|---|
| 검색 서비스/컨트롤러 | 9개 통과: 인증, 잘못된 조건, READ leaf, 권한 없는 도메인 비호출, principal/tenant 전달, 페이지, 조회 실패 |
| 기존 문서 Mapper/현황 서비스/공지 tenant Mapper | 41개 통과 |
| 검색 UI 및 공지 링크 회귀 | 11개 통과: API 인자, 조건, 결과 이동, 잘못된 이동 경로 차단, 응답 역전, 닫기 초기화, 오류 재시도, 제출 검색어 페이지 이동, 같은 화면 공지 재선택 |
| 프런트 production build | 통과 |
| 변경 파일 lint | 오류 0. 기존 DashboardPage 경고 3개와 CommunityNoticePage 경고 1개 유지 |
| 실제 Chromium 375/768/1280px | 모달/유형별 더보기/다음 페이지/공지 결과 이동/재진입 초기화/새 검색/메뉴 이동 통과. 모달 및 페이지 가로 overflow 없음 |
| 코드 리뷰 | 이번 변경 범위에서 수정이 필요한 중요 문제 발견 없음 |
| diff whitespace 검사 | 통과 |

실행 명령:

```powershell
mvn -q -f backend\pom.xml '-Dtest=UnifiedSearchServiceTest,UnifiedSearchApiControllerTest,DocumentApprovalMapperTest,DocumentApprovalStatusServiceImplTest,NoticeBoardTenantScopeMapperTest' test
Set-Location frontend
npx vitest run tests\unified-search.test.tsx tests\notice-page-local-updates.test.tsx --testNamePattern='unified search|opens a different linked notice' --reporter=dot
npm run build
npm run lint -- src\shared\components\search\UnifiedSearch.tsx src\shared\services\unifiedSearchService.ts src\shared\types\unifiedSearch.types.ts src\pages\dashboard\DashboardPage.tsx src\pages\dashboard\components\DashboardContent.tsx src\pages\groupware\community\notice\CommunityNoticePage.tsx tests\unified-search.test.tsx tests\unified-search.browser.mjs tests\notice-page-local-updates.test.tsx
node tests\unified-search.browser.mjs
Set-Location ..
git diff --check
```

### 기존 공지 테스트 실패 구분

넓은 공지 회귀 실행에서 기존 테스트 19개가 실패했다. 작업 파일을 되돌리지 않고 임시 Vitest load plugin으로 CommunityNoticePage와 DashboardContent의 소스만 `git show HEAD` 원문으로 대체하여 기존 공지 두 테스트 파일을 비교했다. 신규 공지 링크 테스트는 기준 실행에서 제외했다.

**기준 코드도 50개 통과/19개 실패이며 실패 테스트 이름이 모두 동일했다.** 기존 skeleton 기대, 제목/요약의 중복 텍스트, 댓글/첨부 UI 기대 등에 관한 실패이며 이번 검색 변경으로 추가된 실패는 없었다. 전체 기존 공지 테스트가 통과했다고 판단하지 않으며, 무관한 기존 테스트/UI 변경은 하지 않았다. 신규 검색 및 공지 링크 회귀 11개는 별도로 통과했다.

### 브라우저 검증 범위

확인된 기존 S-ERP Vite 서버 `http://127.0.0.1:4173`을 재사용했다. 합성 인증값과 검색 API fixture로 실제 UnifiedSearch/CommonDialog 컴포넌트를 렌더링했다. 실제 사용자/테넌트 데이터는 사용하지 않았다. 이는 실제 브라우저 UI·라우팅 검증이며 운영 데이터에 대한 end-to-end 조회 검증은 아니다. 서버 조회 경계는 위 backend 타깃 테스트로 검증했다. 기존 개발 서버는 종료하지 않았다.

## 스크린샷

| 너비 | 전체 검색 | 공지 다음 페이지 |
|---|---|---|
| 375px | [전체](screenshots/unified-search-375px.png) | [공지](screenshots/unified-search-notice-375px.png) |
| 768px | [전체](screenshots/unified-search-768px.png) | [공지](screenshots/unified-search-notice-768px.png) |
| 1280px | [전체](screenshots/unified-search-1280px.png) | [공지](screenshots/unified-search-notice-1280px.png) |

## 영향 범위 및 종료 확인

검색 API/타입/서비스/공통 모달, Dashboard 헤더/링크 전달, 공지 링크 재선택과 해당 테스트·문서만 변경했다. 다른 작업의 종합현황·문서 피드·문서 테스트·로그 변경은 보존했다. 요청되지 않은 커밋이나 DB 변경은 하지 않았다.

작업지시서 → 계획서 → 상세사양서 → 구현 순서, 기존 패턴, 권한·테넌트 계약, 검증 결과, 결과 문서 및 스크린샷, DB 변경 불필요 여부를 확인했다.
