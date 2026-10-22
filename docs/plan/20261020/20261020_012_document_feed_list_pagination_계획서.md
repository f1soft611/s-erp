# 문서작성 피드형·리스트형 서버 페이징 계획서

## 목표

선행 개인별 문서 고정 기능을 완료한 뒤, 문서작성의 피드형·리스트형 일반 목록에 서버 기반 20건 자동 페이징을 적용하고 피드 상세 데이터도 페이지 단위로 제한한다.

## 아키텍처

승인된 [통합 설계 문서](../../superpowers/specs/2026-10-20-document-pin-and-feed-list-pagination-design.md)와 [작업지시서](../../directions/20261020/20261020_012_document_feed_list_pagination_work_instruction.md)를 따른다. 선행 개인별 고정 기능이 제공하는 전체 고정 문서 결과는 별도 상태로 유지하고 일반 문서 API 페이지에서 제외한다. 문서작성 전용 `/documents`와 기간·필터 기반 문서 현황 `/documents/search`를 분리해 양쪽 API 계약을 보존한다. 문서작성 훅이 scope·업무구분·문서 필터별 페이지 상태를 보유하고, 공통 피드·리스트 렌더러는 선택적으로 sentinel 자동 조회와 다음 페이지 스피너를 제공한다.

## 기술 스택

React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

## 변경 파일과 책임

### 프론트엔드

- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: 페이지 요청/응답 타입을 정의한다.
- `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: offset/limit 요청과 `resultList`/`totalRowCount` 응답 검증을 담당한다.
- `frontend/src/pages/groupware/documents/status/services/documentStatus.service.ts`: 문서 현황 검색을 전용 `/documents/search` 경로로 호출한다.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: 첫 페이지/추가 페이지 로드, append, 필터 초기화, stale 응답 무시, 재시도 상태를 소유한다.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: 실제 스크롤 컨테이너와 피드·리스트 페이징 콜백을 연결한다.
- `frontend/src/shared/components/view-mode/FeedView.tsx`: 옵션형 sentinel 및 추가 로딩 스피너를 제공한다.
- `frontend/src/shared/components/view-mode/ListView.tsx`: 옵션형 sentinel 및 추가 로딩 스피너를 제공한다.
- `frontend/tests/document-approval-service.test.ts`: 페이지 파라미터와 응답 검증을 검사한다.
- `frontend/tests/document-status-service.test.ts`: 기존 기간·필터 검색이 분리된 API 경로를 사용하는지 검사한다.
- `frontend/tests/use-document-write-page-pagination.test.tsx`: 첫/추가 페이지, 필터·새로고침 리셋, 오류·재시도, stale 응답 및 중복 요청을 검사한다.
- `frontend/tests/view-mode-pagination.test.tsx`: 공통 피드·리스트의 sentinel, scroll root, 접근성 스피너와 기본 비페이징 회귀를 검사한다.
- `frontend/tests/document-write-page.test.tsx`: 문서 화면 피드·리스트 모드와 초기 스켈레톤 회귀를 확인한다.

### 백엔드

- `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`: 페이지 요청을 피드형·리스트형 분기 모두에 전달하고 `totalRowCount`를 응답한다.
- `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`: 페이지 조회 및 페이지 내 feed detail 구성 인터페이스를 정의한다.
- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`: 인증 사용자, scope/문서 유형 필터, 고정 limit 검증과 페이지별 피드 상세 조회를 구현한다.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`: 관련 문서 페이지 조회와 총 건수 조회를 제공한다.
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: 사용자 접근권한·scope 조건을 유지하며 최신 수정일/문서 ID 순서의 limit/offset 쿼리를 제공한다.
- `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`: 페이지 envelope와 includeDetails 분기를 검사한다.
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`: 입력 범위, count, 필터 전달, 페이지 단위 feed enrichment를 검사한다.
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`: 정렬, 페이지 경계, 권한 및 scope SQL을 검사한다.

선행 조건:

- 별도 개인별 고정 하위 작업의 상세 사양을 승인받고 구현한다.
- 선행 작업에서 추가된 사용자별 고정 테이블/API와 현재 DB MCP 메타데이터를 재확인한다.
- 이 계획은 개인별 pin/unpin 기능이나 DB 스키마 변경을 포함하지 않는다.

## 구현 순서 (TDD)

### 1. 선행 고정 기능 확인 및 사양 고정

- [ ] 선행 pin 하위 작업의 사용자별 목록 API가 전체 접근 가능한 고정 문서와 scope·업무분류 필터를 제공하는지 확인한다.
- [ ] 기본 읽기 전용 DB MCP에서 `list_tables`를 실행하고 선행 pin 테이블과 문서·결재선 테이블을 `describe_table`로 확인한다. 민감한 행 데이터는 조회하지 않는다.
- [ ] 현재 API의 `DocumentApprovalStatusListItemVO`, `DocumentApprovalListItemVO`, 페이지 쿼리와 사용자 필터 조건을 대조해 리스트·피드 양쪽 응답 타입을 확정한다.
- [ ] [상세 사양서](../../spec/20261020/20261020_012_document_feed_list_pagination_상세사양서.md)를 작성하고 사용자 검토를 받는다.

### 2. 백엔드 페이지 조회 테스트 및 구현

- [ ] 문서 현황 검색 라우트 `/documents/search`를 추가하고 현행 검색 서비스·응답 envelope를 유지한다. `/documents`는 문서작성 목록 조회로 분리한다.
- [ ] 컨트롤러 테스트에서 현황 검색과 문서작성 페이지가 서로 다른 라우트·서비스 흐름을 사용하는지 검증한다.
- [ ] Mapper 테스트에 최신 수정일 및 문서 ID 보조 정렬, LIMIT/OFFSET, scope·문서 유형·선택 문서 조건, 접근권한 필터 유지 검증을 추가한다.
- [ ] 서비스·컨트롤러 테스트에 20개 limit, 음수 offset·비정상 limit 거부, `totalRowCount`, 사용자 인증 전달, 기존 응답 envelope를 추가한다.
- [ ] includeDetails 페이지 테스트에 현재 페이지 ID만 상세·결재선·첨부·최근 댓글 조회에 전달되는 것을 추가한다.
- [ ] 위 테스트를 실행해 구현 전 실패를 확인한다.
- [ ] 기존 페이지 검색 경로를 재사용하거나 목록 API에 필요한 페이지 메서드를 추가한다. 최대 페이지 크기를 20으로 제한하고 기존 tenant·권한·scope·업무구분 조건을 보존한다.
- [ ] 피드형은 기본 문서 페이지 조회 후 그 페이지 ID만 feed enrichment에 전달한다. 레거시 전체 조회 경로가 다른 소비자에 쓰이면 기존 요청 동작을 유지한다.
- [ ] 대상 세 테스트 클래스의 Maven 실행으로 백엔드 회귀를 검증한다.

### 3. 프론트엔드 API와 페이지 상태 테스트 및 구현

- [ ] 문서 현황 데이터소스 테스트에서 기존 검색 조건·응답 처리와 `/documents/search` 경로를 검증한다.
- [ ] API 서비스 테스트에서 offset·limit·scope·업무구분·선택 문서 쿼리와 유효하지 않은 page 응답 거부를 확인한다.
- [ ] 일반 페이지 조회 결과가 고정 문서 ID를 제외하고 정확히 20개를 채우며, pinned 결과는 별도 목록에 유지되는지 검증한다.
- [ ] 페이지 훅 테스트에서 첫 20건, 다음 offset 20, append, `totalRowCount` 기반 종료, 필터/새로고침 초기화를 검증한다.
- [ ] 훅 테스트에서 중복 loadMore 차단, 페이지 요청 오류 뒤 재시도, 필터 전환 후 이전 응답 무시를 추가한다.
- [ ] 위 프론트엔드 테스트를 먼저 실행해 페이지 기능이 없어 실패함을 확인한다.
- [ ] 서비스가 페이지 요청을 전달하고 타입 가드로 결과 목록과 건수를 확인하도록 구현한다.
- [ ] 문서 현황 데이터소스의 기존 검색 파라미터·응답 검증을 보존하면서 전용 경로로 전환한다.
- [ ] 문서작성 훅에 페이징 상태를 추가한다. 첫 페이지 교체, 다음 페이지 append, 실패 offset 재시도, 새 요청 generation 무효화, 인플라이트 중복 차단을 적용한다.
- [ ] 피드와 리스트 전환은 해당 모드의 올바른 목록 데이터를 요청하며, pinned 문서는 일반 페이지와 분리한다. 파일형은 기존 `useDocumentFiles` 로직을 유지한다.
- [ ] 신규 서비스·훅 테스트를 실행해 통과를 확인한다.

### 4. 공통 보기 자동 로딩 및 화면 연결

- [ ] 공유 보기 테스트에 페이지 전용 props가 없을 때 기존 렌더 결과가 유지되는 회귀를 추가한다.
- [ ] 피드·리스트 테스트에 제공된 `scrollRoot` 아래 sentinel 교차 시 한 번만 요청되고, 다음 페이지 스피너가 표시되며 오류 중 재요청이 일어나지 않는 동작을 추가한다.
- [ ] 테스트를 먼저 실행해 실패를 확인한다.
- [ ] `FeedView`와 `ListView`에 선택형 paging props를 추가한다. sentinel 관찰은 `IntersectionObserver`를 사용하고 실제 스크롤 root를 지정한다. 요청 상태에서는 현재 항목을 유지하고 접근성 status 라벨과 스피너만 표시한다.
- [ ] `DocumentWritePage`에서 공통 스크롤 컨테이너를 연결하고 페이지 크기 경계, list/feed 항목 렌더, 재시도 및 마지막 페이지를 전달한다.
- [ ] 피드형과 리스트형에서 문서가 20건 초과할 때 두 번째 페이지가 누락·중복 없이 추가되는 화면 테스트를 실행한다.

### 5. 통합 검증 및 결과 문서

- [ ] 백엔드에서 `mvn -Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest test`를 실행한다.
- [ ] 프론트엔드에서 `npm run test -- tests/document-approval-service.test.ts tests/use-document-write-page-pagination.test.tsx tests/view-mode-pagination.test.tsx tests/document-write-page.test.tsx`를 실행한다.
- [ ] 프론트엔드에서 `npm run build`를 실행한다.
- [ ] 기존 4173 개발 서버가 S-ERP인지 확인하고 재사용해 375px, 768px, 1280px에서 스크롤 자동 로딩, 기존 행 유지, 다크/라이트 스피너, 가로 넘침을 확인한다.
- [ ] `docs/result/20261020/document-feed-list-pagination/screenshots`에 검증 스크린샷을 저장하고 같은 폴더에 결과서를 작성한다.
- [ ] DB 스키마 변경이 없음을 기록한다. MCP 호출 실패 시 미확인 상태와 Mapper/도메인 코드 대체 근거를 분리해 기록한다.
- [ ] `git status`와 변경 파일 diff를 확인해 이 작업에서 추가한 변경만 결과에 포함하고, 기존 미커밋 변경을 보존한다.

## 완료 조건

- 피드형·리스트형은 각 필터 조건에 맞는 서버 데이터 20건만 최초 조회한다.
- 스크롤 sentinel 도달 시 다음 페이지를 중복 없이 append하고, 요청 도중 기존 콘텐츠를 유지한다.
- 마지막 페이지에서 더 이상 요청하지 않고 실패 시 명시적으로 재시도할 수 있다.
- 피드의 상세 enrich가 페이지 범위를 넘지 않으며 기존 상세·필터·요약·상단고정 UI를 유지한다.
- 지정 테스트, 프론트엔드 빌드 및 세 브라우저 크기 검증이 결과서에 기록된다.
