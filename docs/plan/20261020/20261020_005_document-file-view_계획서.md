# 문서작성 공통 파일형 보기 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Preserve existing uncommitted changes. Steps use checkbox syntax for tracking.

**Goal:** 문서·댓글 첨부를 최신순 20개씩 자동 로딩하는 공통 파일형 보기를 문서작성에 추가한다.

**Architecture:** 파일 기준 서버 커서 페이지를 신설하고 문서 읽기 권한 SQL과 기존 다운로드 경로를 재사용한다. 공통 UI는 파일 행과 로딩·오류·교차 감지를 담당하며 문서 페이지의 서비스·상태가 조회 조건과 다운로드를 연결한다. 다른 공통 보기 소비자는 명시적으로 활성화하지 않는 한 피드·리스트 동작을 유지한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

## 근거

- [작업지시서](../../directions/20261020/20261020_005_document-file-view_작업지시서.md)
- 구현 전 사용자 검토 대상: [상세 사양서](../../spec/20261020/20261020_005_document-file-view_상세사양서.md)

## 1. 기존 계약과 영향 범위

- [x] 문서 읽기 SQL `documentReadAccess`, 문서 scope 필터, 댓글 삭제 검사, 업로더 표시 이름 조인 패턴을 확인한다.
- [x] 기본 읽기 전용 MCP `list_tables` 후 관련 4개 테이블 `describe_table`을 호출한다.
- [x] 업로더 이름 조회에 필요한 사용자 메타데이터만 추가 확인한다. 데이터 행은 조회하지 않는다.
- [x] 기존 미커밋 변경과 충돌하는 부분이 있으면 해당 변경을 덮어쓰지 않고 통합한다.

## 2. 백엔드 파일 페이지

대상:

- `backend/src/main/java/egovframework/let/groupware/approval/domain/model/DocumentApprovalFileItemVO.java` 신규: 공개 파일 항목.
- 같은 폴더의 `DocumentApprovalFilePageVO.java` 신규: 목록·다음 커서.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`: 파일 조회.
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: 관련 문서 파일 조회.
- `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java` 및 `impl/DocumentApprovalServiceImpl.java`: 입력 검사·커서·페이지 구성.
- `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`: GET files.
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`.
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`.
- `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`.

순서:

- [x] Mapper 테스트에 문서/댓글 소유 유형, ATTACHMENT 제한, 삭제·tenant·문서 읽기 권한, 파일 시각/ID 내림차순, 커서 조건, 21개 조회를 검증한다.
- [x] 서비스 테스트에 21개→20개 응답과 마지막 노출 항목의 커서, 20개 이하 종료, 입력 오류 400, 사용자 식별값 전달을 검증한다.
- [x] 컨트롤러 테스트에 인증 사용자 전달과 기존 ResultVO envelope를 검증한다.
- [x] 신규 Mapper 및 서비스/컨트롤러 테스트를 먼저 실행해 쿼리/메서드 부재로 실패함을 확인한다.
- [x] 사양서의 공개 필드만 가진 VO와 쿼리를 추가한다. 스토리지 내부 필드는 반환하지 않는다.
- [x] 고정 20개 페이지를 위해 21개만 조회하고 여분 항목으로 hasNext를 계산한다. 파일 ID를 이용해 DB의 원본 정밀도 시각을 조회하는 커서로 날짜 직렬화 정밀도 손실을 피한다.
- [x] 관련 백엔드 3개 테스트 클래스 총 95개 통과를 확인한다.

## 3. 공통 파일형 UI

대상:

- `frontend/src/shared/components/view-mode/FileView.tsx` 신규.
- `frontend/src/shared/components/view-mode/commonViewTypes.ts`.
- `frontend/src/shared/components/view-mode/ViewModeToggle.tsx`.
- `frontend/src/shared/components/view-mode/PinnedViewToolbar.tsx`.
- `frontend/tests/file-view.test.tsx` 신규.

순서:

- [x] 공통 파일 행, 소유자/날짜/크기, 다운로드/원문 동작, 초기/추가 로딩, 오류 재시도, 빈 목록, 마지막 종료 테스트를 추가한다.
- [x] 교차 감지 반복 시 로딩 중 중복 요청이 발생하지 않는 테스트를 추가한다.
- [x] 기존 보기 토글에는 파일형이 없고 명시적 활성화 시만 표시되는 테스트를 추가한다.
- [x] frontend에서 `npm run test -- tests/file-view.test.tsx`로 실패를 확인한다.
- [x] 사양서에 따라 FileView를 구현한다. 공통 UI에 문서 API나 문서 권한 로직을 넣지 않는다.
- [x] 같은 테스트 명령으로 통과를 확인한다.

## 4. 문서작성 연결

대상:

- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`.
- `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`.
- 필요 시 같은 hooks 폴더 `useDocumentFiles.ts`: 파일 페이지 상태 분리.
- `frontend/tests/document-file-page.test.tsx`, `document-files-hook.test.tsx`, `document-file-service.test.ts`: 동시 작업 중인 기존 대형 테스트와 분리한다.
- 기존 `frontend/tests/document-write-page.test.tsx`는 피드·리스트·필터 선별 회귀에 사용한다.

순서:

- [x] 최초 20개 요청, 다음 20개 연결, scope/업무구분/문서 선택 변경 시 초기화, 이전 응답 무시를 검증한다.
- [x] 파일형 진입 시 문서 전체 피드나 댓글 전체를 요청하지 않는지 검증한다.
- [x] 직접 첨부/댓글 첨부의 기존 다운로드 함수 분기와 원문 상세 ID를 검증한다.
- [x] 신규 파일형 페이지/서비스/훅 테스트를 먼저 실행해 미구현 실패를 확인한다.
- [x] 서비스 응답의 필수 필드·목록·커서를 검사하고 오류는 화면의 재시도로 전달한다.
- [x] 페이지 로딩 중 재요청을 차단하고 필터/새로고침/언마운트 이후 늦은 응답은 무시한다.
- [x] 상세 액션·문서 작성 완료 시 파일 목록도 최신 상태로 초기화한다.
- [x] 신규/인접 테스트 42개 통과 및 기존 선별 회귀 9개 통과·기존 실패 1개를 구분해 기록한다.

## 5. 통합 검증과 결과

- [x] frontend에서 `npm run build`를 실행한다.
- [x] 위 백엔드 3개 테스트와 공통 보기 관련 프론트엔드 테스트를 함께 실행한다.
- [x] 기존 4173 서버는 용도를 확인하고 재사용한다. 신규 테스트 서버가 필요하면 `npm run dev -- --strictPort`로 실행하고 검증 후 종료한다.
- [x] 합성 파일 데이터로 375px, 768px, 1280px 렌더링·하단 추가 로딩·에러 재시도를 브라우저에서 검증한다.
- [x] `docs/result/20261020/document-file-view`에 결과와 screenshots를 기록한다.
- [x] DB DDL이 없으면 스키마 변경 없음으로 기록한다. 추가 인덱스 등이 필요해지면 양쪽 날짜별 스키마 폴더와 누적 스키마 문서를 함께 관리한다.
- [x] 최종 diff에서 미커밋 선행 작업 보존 및 범위 밖 변경이 없는지 확인한다.

## 검증 한계

기존 문서작성 전체 테스트는 작업 시작 시 55개 실패가 있었다. 사용자 승인에 따라 범위 밖 실패를 수정하지 않았다. 후속 선별 회귀에서도 기존 모달 취소 버튼 관련 1개 실패가 남아 있으므로 전체 문서작성 테스트 통과나 병합 가능 상태를 주장하지 않는다. 결과 및 스크린샷은 [결과서](../../result/20261020/document-file-view/20261020_005_document-file-view_결과서.md)를 따른다.

## 후속 누락 수정 계획

1. 기존 피드의 문서/댓글 일반 첨부와 파일형 응답을 개수로 비교한다.
2. `actorParams`가 추가하는 `documentStatus=DRAFT`와 파일 SQL의 공통 상태 필터 결합을 재현한다.
3. 서비스 테스트에서 파일 조회/커서 파라미터에 documentStatus가 없음을 검증하고 수정 전 실패를 확인한다.
4. 파일 조회 메서드에서만 documentStatus를 제거한다. 공통 actorParams와 다른 문서 경로는 변경하지 않는다.
5. 대상 백엔드 회귀와 실서버 파일 API를 재확인한다. 재시작이 필요하면 기존 서버를 임의 종료하지 않는다.

## 파일형 표시 보완 계획

1. `frontend/tests/file-view.test.tsx`에서 마지막 페이지 문구 부재와 목록 배경 `rgb(255, 255, 255)`를 검증하고 실패를 확인한다.
2. `frontend/src/shared/components/view-mode/FileView.tsx`의 목록 루트에 `bgcolor: 'common.white'`를 지정하고 마지막 페이지 안내 Typography만 제거한다.
3. `npm run test -- tests/file-view.test.tsx tests/document-file-page.test.tsx tests/document-files-hook.test.tsx` 및 `npm run build`로 회귀를 확인한다.
4. 합성 데이터로 375px·768px·1280px 실제 렌더링, 흰색 배경, 종료 문구 부재를 검증하고 결과/스크린샷을 갱신한다.

## 파일형 스켈레톤 로딩 계획

1. `frontend/tests/file-view.test.tsx`에서 초기 로딩 중 status와 스켈레톤 행 8개를 검증하고, 기존 파일 행이 있는 다음 페이지 로딩 중 파일 행 유지와 하단 진행 표시를 검증한다.
2. 신규 초기 스켈레톤 단언이 현재 구현에서 실패하는지 확인한다.
3. `frontend/src/shared/components/view-mode/FileView.tsx`에서 파일이 아직 없는 초기 로딩에만 스켈레톤 행을 표시하고, 추가 페이지 로딩은 기존 진행 표시를 유지한다.
4. `npm run test -- tests/file-view.test.tsx tests/document-file-page.test.tsx` 및 `npm run build`를 실행한다.
5. 합성 데이터로 375px·768px·1280px 실제 렌더링과 페이지 가로 넘침 여부를 확인하고 결과서 및 스크린샷을 갱신한다.

## 파일 페이지 스피너 및 다크테마 계획

1. `frontend/tests/file-view.test.tsx`에서 다음 페이지 로딩 중 파일 행 유지, 안내 텍스트 부재, 접근성 status와 progressbar를 검증하고 라이트/다크 테마 배경 및 다크 스피너 색상을 확인한다.
2. 해당 테스트를 현재 구현에서 실행해 페이징 안내 텍스트와 고정 흰 배경으로 실패하는지 확인한다.
3. `frontend/src/shared/components/view-mode/FileView.tsx`에서 라이트는 흰 배경을 유지하고 다크는 `background.paper`를 사용하며, 다음 페이지 로딩은 안내 문구 없이 theme primary 색 스피너만 렌더한다.
4. `npm run test -- tests/file-view.test.tsx tests/document-file-page.test.tsx`와 `npm run build`를 실행한다.
5. 합성 데이터로 라이트/다크 테마에서 375px·768px·1280px 화면의 대비, 스피너, 페이지 가로 넘침을 브라우저에서 확인하고 결과서와 대표 스크린샷을 갱신한다.
