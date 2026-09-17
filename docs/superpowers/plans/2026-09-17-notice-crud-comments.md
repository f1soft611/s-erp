# 공지사항 통합 조회 및 댓글 기능 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공지사항 게시글·첨부·댓글을 통합 조회하고, 댓글/답글 에디터·첨부 및 부분 상태 갱신을 제공한다.

**Architecture:** 백엔드는 공지 상세 응답을 조합하는 서비스와 공통 댓글 페이징/첨부 계약을 확장한다. 프론트는 상세 응답을 한 번만 사용하고 CRUD 응답을 해당 피드/댓글 트리에 반영한다. 댓글 첨부는 `NOTICE_COMMENT`와 댓글 ID를 소유 키로 사용한다.

**Tech Stack:** Spring Boot/eGovFrame, MyBatis, PostgreSQL, React, TypeScript, MUI, Tiptap, Vitest.

---

### Task 1: 백엔드 API 계약 테스트 고정

**Files:**

- Modify: `backend/src/test/**`의 기존 공지/공통 댓글 테스트 위치를 우선 사용
- Test: 공지 상세 응답, 댓글 페이지 파라미터, `NOTICE_COMMENT` 파일 소유 계약

- [ ] **Step 1: 기존 테스트 위치와 컨트롤러 생성자 의존성을 확인한다.**
- [ ] **Step 2: 공지 상세 응답에 댓글 배열과 댓글 수가 포함되어야 하는 실패 테스트를 작성한다.**
- [ ] **Step 3: 댓글 조회 `limit=3` 및 `beforeCommentId`가 서비스/DAO까지 전달되어야 하는 실패 테스트를 작성한다.**
- [ ] **Step 4: 테스트를 실행해 새 계약 부재로 실패하는지 확인한다.**
  - Run: `cd backend; mvn -q -Dtest=<관련 테스트 클래스> test`

### Task 2: 백엔드 공지 상세 통합 조회

**Files:**

- Modify: `backend/src/main/java/egovframework/let/groupware/notice/domain/model/NoticeBoardPostVO.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/notice/service/impl/NoticeBoardServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/let/groupware/notice/service/NoticeBoardService.java` if signatures require it
- Modify: `backend/src/main/resources/egovframework/mapper/let/groupware/notice/NoticeBoard_SQL_postgresql.xml` only if count/list SQL is required

- [ ] **Step 1: `NoticeBoardPostVO`에 `comments`, `commentCount`, 댓글 페이지 메타 필드를 추가한다.**
- [ ] **Step 2: `getPost()`에서 게시글·첨부·댓글을 동일 서비스 호출 결과로 조합한다.**
- [ ] **Step 3: 댓글 트리 변환은 서버 응답의 parent ID를 보존하고, 삭제 댓글은 기존 정책에 맞춰 제외한다.**
- [ ] **Step 4: Task 1의 상세 조회 테스트를 실행해 통과시킨다.**
- [ ] **Step 5: `cd backend; mvn -q -DskipTests compile`으로 백엔드 컴파일을 확인한다.**

### Task 3: 댓글 최근 목록 및 이전 댓글 조회

**Files:**

- Modify: `backend/src/main/java/egovframework/com/common/controller/CommonCommentApiController.java`
- Modify: `backend/src/main/java/egovframework/com/common/service/CommonCommentService.java`
- Modify: `backend/src/main/java/egovframework/com/common/service/impl/CommonCommentServiceImpl.java`
- Modify: `backend/src/main/java/egovframework/com/common/domain/repository/CommonCommentDAO.java`
- Modify: `backend/src/main/resources/egovframework/mapper/com/common/CommonComment_SQL_postgresql.xml`

- [ ] **Step 1: `limit` 기본값 3과 `beforeCommentId` 파라미터를 컨트롤러 요청에 추가한다.**
- [ ] **Step 2: 루트 댓글과 답글의 계층을 깨지 않도록 조회 범위를 계산한다.**
- [ ] **Step 3: 이전 댓글 응답에 `hasPrevious` 또는 다음 cursor를 포함한다.**
- [ ] **Step 4: 댓글 페이지 테스트를 실행해 통과시킨다.**

### Task 4: 댓글 첨부파일 계약

**Files:**

- Modify: `backend/src/main/java/egovframework/com/common/controller/CommonFileApiController.java` only if owner type validation is needed
- Modify: `frontend/src/shared/services/commonContentApi.ts`
- Test: 공통 파일 owner type 계약 테스트

- [ ] **Step 1: `NOTICE_COMMENT`가 공통 파일 업로드/조회/다운로드/삭제에서 허용되는지 확인한다.**
- [ ] **Step 2: 댓글 생성 후 반환된 `commentId`로 파일을 업로드하도록 서비스 타입을 확장한다.**
- [ ] **Step 3: 댓글 응답에 첨부 목록을 포함하거나 댓글 ID 기준으로 필요한 파일만 조회하는 계약을 고정한다.**
- [ ] **Step 4: 파일 계약 테스트를 실행한다.**

### Task 5: 프론트 공지 조회와 부분 상태 갱신

**Files:**

- Modify: `frontend/src/pages/groupware/community/notice/services/noticeBoardService.ts`
- Modify: `frontend/src/pages/groupware/community/notice/data/noticeData.ts`
- Modify: `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- Test: `frontend/tests/**`의 공지사항 관련 테스트 위치

- [ ] **Step 1: 통합 상세 응답 타입을 추가하고 `hydrateNoticePost`의 상세/댓글 이중 호출을 제거한다.**
- [ ] **Step 2: 공지 생성/수정 시 서버 반환값과 업로드 결과를 해당 피드 항목에만 반영한다.**
- [ ] **Step 3: 공지 삭제 시 삭제 API 성공 후 해당 ID만 제거하고 목록 재조회는 하지 않는다.**
- [ ] **Step 4: 댓글 생성/수정/삭제 핸들러가 서버 반환값 또는 대상 ID만 로컬 트리에 반영하도록 수정한다.**
- [ ] **Step 5: 테스트에서 초기 조회 API 호출 수와 CRUD 후 불필요한 목록/상세 재호출이 없는지 검증한다.**
- [ ] **Step 6: 관련 Vitest를 실행한다.**
  - Run: `cd frontend; npm run test -- tests/<공지사항 테스트 파일>`

### Task 6: 댓글/답글 에디터 및 첨부 UI

**Files:**

- Modify: `frontend/src/shared/components/feed/CommentThread.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- Modify: `frontend/src/pages/groupware/community/notice/data/noticeData.ts`
- Reuse: `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`의 Tiptap 설정

- [ ] **Step 1: 댓글·답글 작성과 수정을 Tiptap 에디터 입력으로 교체한다.**
- [ ] **Step 2: 본문 HTML을 공통 댓글 API의 `content`로 전달한다.**
- [ ] **Step 3: `NOTICE_COMMENT` 첨부 선택/업로드/다운로드 표시를 추가한다.**
- [ ] **Step 4: 최근 댓글 3건만 표시하고 이전 댓글 버튼으로 cursor 조회 후 기존 트리에 병합한다.**
- [ ] **Step 5: 게시글·댓글·답글 수정/삭제 액션을 `MoreVert` 메뉴 안으로 이동한다.**
- [ ] **Step 6: 좁은 화면에서 에디터, 첨부 목록, 메뉴가 겹치지 않는지 375px/768px/1280px 기준으로 확인한다.**
- [ ] **Step 7: 관련 Vitest를 실행하고 타입 오류를 수정한다.**

### Task 7: 문서화 및 최종 검증

**Files:**

- Create: `docs/result/20260917/notice-crud-comments/README.md`
- Create: `docs/result/20260917/notice-crud-comments/screenshots/` when browser screenshots are available
- Modify: relevant `docs/spec/20260917` document if API contract changed

- [ ] **Step 1: `cd frontend; npm run build`를 실행한다.**
- [ ] **Step 2: `cd frontend; npm run test`를 실행한다.**
- [ ] **Step 3: `cd backend; mvn test`를 실행한다.**
- [ ] **Step 4: 공지 CRUD, 댓글/답글 CRUD, 첨부 표시, 이전 댓글 조회 시나리오와 API 호출 수를 결과 문서에 기록한다.**
- [ ] **Step 5: 실패한 검증은 원인과 미해결 범위를 결과 문서에 명시한다.**
