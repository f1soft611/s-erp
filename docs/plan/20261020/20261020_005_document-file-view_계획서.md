# 문서작성 공통 파일형 보기 Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task. Preserve existing uncommitted changes. Steps use checkbox syntax for tracking.

**Goal:** 문서·댓글 첨부를 최신순 20개씩 자동 로딩하는 공통 파일형 보기를 문서작성에 추가한다.

**Architecture:** 파일 기준 서버 커서 페이지를 신설하고 문서 읽기 권한 SQL과 기존 다운로드 경로를 재사용한다. 공통 UI는 파일 행과 로딩·오류·교차 감지를 담당하며 문서 페이지의 서비스·상태가 조회 조건과 다운로드를 연결한다. 다른 공통 보기 소비자는 명시적으로 활성화하지 않는 한 피드·리스트 동작을 유지한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

## 근거

- [작업지시서](../../directions/20261020/20261020_005_document-file-view_작업지시서.md)
- 구현 전 사용자 검토 대상: [상세 사양서](../../spec/20261020/20261020_005_document-file-view_상세사양서.md)

## 1. 기존 계약과 영향 범위

- [ ] 문서 읽기 SQL `documentReadAccess`, 문서 scope 필터, 댓글 삭제 검사, 업로더 표시 이름 조인 패턴을 확인한다.
- [x] 기본 읽기 전용 MCP `list_tables` 후 관련 4개 테이블 `describe_table`을 호출한다.
- [ ] 업로더 이름 조회에 필요한 사용자 메타데이터만 추가 확인한다. 데이터 행은 조회하지 않는다.
- [ ] 기존 미커밋 변경과 충돌하는 부분이 있으면 해당 변경을 덮어쓰지 않고 통합한다.

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

- [ ] Mapper 테스트에 문서/댓글 소유 유형, ATTACHMENT 제한, 삭제·tenant·문서 읽기 권한, 파일 시각/ID 내림차순, 커서 조건, 21개 조회를 검증한다.
- [ ] 서비스 테스트에 21개→20개 응답과 마지막 노출 항목의 커서, 20개 이하 종료, 입력 오류 400, 사용자 식별값 전달을 검증한다.
- [ ] 컨트롤러 테스트에 인증 사용자 전달과 기존 ResultVO envelope를 검증한다.
- [ ] `mvn -Dtest=DocumentApprovalMapperTest,DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest test`를 backend에서 실행해 신규 계약의 실패를 확인한다.
- [ ] 사양서의 공개 필드만 가진 VO와 쿼리를 추가한다. 스토리지 내부 필드는 반환하지 않는다.
- [ ] 고정 20개 페이지를 위해 21개만 조회하고 여분 항목으로 hasNext를 계산한다. 파일 ID를 이용해 DB의 원본 정밀도 시각을 조회하는 커서로 날짜 직렬화 정밀도 손실을 피한다.
- [ ] 동일 명령으로 테스트 통과를 확인한다.

## 3. 공통 파일형 UI

대상:

- `frontend/src/shared/components/view-mode/FileView.tsx` 신규.
- `frontend/src/shared/components/view-mode/commonViewTypes.ts`.
- `frontend/src/shared/components/view-mode/ViewModeToggle.tsx`.
- `frontend/src/shared/components/view-mode/PinnedViewToolbar.tsx`.
- `frontend/tests/file-view.test.tsx` 신규.

순서:

- [ ] 공통 파일 행, 소유자/날짜/크기, 다운로드/원문 동작, 초기/추가 로딩, 오류 재시도, 빈 목록, 마지막 종료 테스트를 추가한다.
- [ ] 교차 감지 반복 시 로딩 중 중복 요청이 발생하지 않는 테스트를 추가한다.
- [ ] 기존 보기 토글에는 파일형이 없고 명시적 활성화 시만 표시되는 테스트를 추가한다.
- [ ] frontend에서 `npm run test -- tests/file-view.test.tsx`로 실패를 확인한다.
- [ ] 사양서에 따라 FileView를 구현한다. 공통 UI에 문서 API나 문서 권한 로직을 넣지 않는다.
- [ ] 같은 테스트 명령으로 통과를 확인한다.

## 4. 문서작성 연결

대상:

- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`.
- `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`.
- 필요 시 같은 hooks 폴더 `useDocumentFiles.ts`: 파일 페이지 상태 분리.
- `frontend/tests/document-write-page.test.tsx`와 관련 서비스 테스트.

순서:

- [ ] 최초 20개 요청, 다음 20개 연결, scope/업무구분/문서 선택 변경 시 초기화, 이전 응답 무시를 검증한다.
- [ ] 파일형 진입 시 문서 전체 피드나 댓글 전체를 요청하지 않는지 검증한다.
- [ ] 직접 첨부/댓글 첨부의 기존 다운로드 함수 분기와 원문 상세 ID를 검증한다.
- [ ] `npm run test -- tests/document-write-page.test.tsx tests/file-view.test.tsx`로 실패를 확인한다.
- [ ] 서비스 응답의 필수 필드·목록·커서를 검사하고 오류는 화면의 재시도로 전달한다.
- [ ] 페이지 로딩 중 재요청을 차단하고 필터/새로고침/언마운트 이후 늦은 응답은 무시한다.
- [ ] 상세 액션·문서 작성 완료 시 파일 목록도 최신 상태로 초기화한다.
- [ ] 같은 테스트 명령으로 회귀를 확인한다.

## 5. 통합 검증과 결과

- [ ] frontend에서 `npm run build`를 실행한다.
- [ ] 위 백엔드 3개 테스트와 공통 보기 관련 프론트엔드 테스트를 함께 실행한다.
- [ ] 기존 4173 서버는 용도를 확인하고 재사용한다. 신규 테스트 서버가 필요하면 `npm run dev -- --strictPort`로 실행하고 검증 후 종료한다.
- [ ] 합성 파일 데이터로 375px, 768px, 1280px 렌더링·하단 추가 로딩·에러 재시도를 브라우저에서 검증한다.
- [ ] `docs/result/20261020/document-file-view`에 결과와 screenshots를 기록한다.
- [ ] DB DDL이 없으면 스키마 변경 없음으로 기록한다. 추가 인덱스 등이 필요해지면 양쪽 날짜별 스키마 폴더와 누적 스키마 문서를 함께 관리한다.
- [ ] 최종 diff에서 미커밋 선행 작업 보존 및 범위 밖 변경이 없는지 확인한다.
