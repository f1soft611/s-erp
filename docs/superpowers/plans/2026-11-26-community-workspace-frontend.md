# 협업공간 프론트엔드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 그룹웨어 > 커뮤니티에 "협업공간" 화면을 만든다. 방 1개를 칸반/피드로 보고, 글·댓글·권한 그룹·개인 보기 설정을 가짜 데이터로 실제처럼 동작시킨다.

**Architecture:** 화면은 `services/workspace.service.ts`만 호출하고, 서비스는 localStorage 기반 저장소(샘플 데이터로 초기화)를 Promise로 감싸 반환한다. 권한 판정과 개인 설정 보정은 `data/`의 순수 함수로 분리해 단위 테스트한다. 드래그는 새 의존성 없이 브라우저 기본 드래그앤드롭을 쓰고, 키보드용 "이동" 메뉴를 함께 제공한다.

**Tech Stack:** React 19, TypeScript, MUI 9, Vitest + Testing Library (`frontend/tests/*.test.ts(x)`), 기존 `CommonDialog`/`useCommonConfirmDialog`/`PageHeader`/`useNotification`.

**Spec:** `docs/superpowers/specs/2026-11-26-community-workspace-frontend-design.md`

## Global Constraints

- 수정 범위는 `frontend/src`, `frontend/tests`, `docs`뿐이다. 백엔드·DB는 건드리지 않는다.
- 새 파일 위치: `frontend/src/pages/groupware/community/workspace/` (page key `workspace`, 메뉴명 "협업공간").
- 모달은 `CommonDialog`, 확인은 `useCommonConfirmDialog`. `window.alert/confirm/prompt` 금지.
- 새 npm 의존성을 추가하지 않는다.
- 커밋은 사용자가 요청하기 전에는 만들지 않는다(프로젝트 규칙). 각 Task 끝의 "기록" 단계는 결과 문서에 커밋 제목 후보를 적는 것이다. 이 규칙이 스킬의 기본 커밋 단계보다 우선한다.
- 결과 문서·스크린샷 경로는 영문 소문자·숫자·하이픈만 쓴다: `docs/result/20261126/community-workspace/`.
- 브라우저 검증은 `http://127.0.0.1:4173`, `npm run dev -- --strictPort`로 띄우고, 직접 띄웠다면 끝나고 종료한다.
- 375/768/1280px에서 가로 스크롤·겹침이 없어야 한다.

## Review Focus

1. localStorage 값이 깨진 JSON이거나 접근이 막힌 경우: 샘플 데이터로 시작하고 화면은 죽지 않는다 → Task 3.
2. 방 설정 권한 그룹을 마지막 1개까지 지우거나 권한을 낮추려는 경우: 거부하고 이유를 보여준다 → Task 3.
3. 개인 설정이 이미 삭제된 컬럼 ID를 가리키는 경우: 무시하고 새 컬럼은 맨 뒤에 보이게 한다 → Task 2.
4. 저장 권한이 없는 사용자가 카드를 드래그하거나 작성 버튼을 누르려는 경우: 드래그 불가, 버튼 숨김/비활성과 안내 → Task 5, 7.
5. 아주 긴 제목·본문·댓글 수십 개·컬럼 6개 이상일 때 375px에서 잘림/가로 스크롤: 칸반은 보드 내부 가로 스크롤, 텍스트는 줄바꿈·말줄임 → Task 5, 7.

## File Structure

```text
frontend/src/pages/groupware/community/workspace/
  WorkspacePage.tsx                 화면 조립, 보기 전환, 사용자 전환
  types/workspace.types.ts          모든 타입
  data/workspaceSamples.ts          샘플 사용자·방·글·댓글
  data/workspacePermissions.ts      resolveLevel, can
  data/workspacePrefs.ts            reconcilePrefs, 기본값
  services/workspace.service.ts     저장소 + CRUD (Promise 반환)
  hooks/useWorkspaceRooms.ts, useWorkspacePosts.ts, useWorkspaceViewPrefs.ts
  components/RoomList.tsx, KanbanBoard.tsx, KanbanColumn.tsx, PostCard.tsx,
             FeedList.tsx, CommentThread.tsx, PostComposerDialog.tsx,
             RoomSettingsDialog.tsx, PermissionGroupTable.tsx, ViewToolbar.tsx
frontend/tests/workspace-permissions.test.ts, workspace-prefs.test.ts,
               workspace-service.test.ts, workspace-page.test.tsx
```

---

### Task 1: 프로젝트 문서(작업지시서·계획서·사양서)

**Files:**
- Create: `docs/directions/20261126/20261126_NNN_협업공간_프론트엔드_작업지시서.md`, `docs/plan/20261126/…_계획서.md`, `docs/spec/20261126/…_상세사양서.md` (NNN은 각 폴더에서 미사용인 다음 번호; `002`는 대시보드 청크분할이 사용 중)

**Interfaces:** Produces: 이후 Task가 참조할 사양 경로.

- [ ] **Step 1:** 위 설계 문서에서 각 문서를 한국어로 만든다. 작업지시서는 요청과 완료 조건, 계획서는 Task 2~8 요약, 사양서는 설계 문서 5~8장(필드, 권한, 개인 설정, 검증 기준)과 기준 화면(공지·자료실)을 옮긴다. 새 결정은 추가하지 않는다.
- [ ] **Step 2:** 문서 간 상대 링크가 `docs/` 날짜 폴더 기준으로 열리는지 확인한다.
- [ ] **Step 3 (기록):** 결과 문서 초안(`docs/result/20261126/community-workspace/`)에 이 Task의 커밋 제목 후보 `docs(groupware): 협업공간 작업지시·계획·사양 추가`를 적는다.

### Task 2: 타입, 샘플 데이터, 권한·개인 설정 순수 함수

**Files:**
- Create: `types/workspace.types.ts`, `data/workspaceSamples.ts`, `data/workspacePermissions.ts`, `data/workspacePrefs.ts`
- Test: `frontend/tests/workspace-permissions.test.ts`, `frontend/tests/workspace-prefs.test.ts`

**Interfaces:**
- Produces (types): `WorkspaceLevel = 'read'|'write'|'admin'`(누적: admin ⊃ write ⊃ read, 이 계획의 결정); `WorkspaceUser {id,name}`; `WorkspaceColumn {id,name}`(배열 순서가 곧 순서); `WorkspaceMember {kind:'user'; userId}`; `WorkspaceGroup {id,name,members:WorkspaceMember[],level}`; `WorkspaceRoom {id,name,defaultView:'kanban'|'feed',columns,groups}`; `WorkspaceAttachment {name,size,type}`; `WorkspaceComment {id,authorId,body,createdAt,replies}`; `WorkspacePost {id,roomId,title,body,authorId,createdAt,columnId:string|null,attachments,comments}`; `WorkspaceViewPrefs {hiddenColumnIds,collapsedColumnIds,columnOrder,onlyMine,keyword}`.
- Produces (functions): `resolveLevel(room: WorkspaceRoom, userId: string): WorkspaceLevel | null`(속한 그룹 중 최고 수준, 없으면 null); `can(level: WorkspaceLevel|null, need: WorkspaceLevel): boolean`; `defaultPrefs(columns: WorkspaceColumn[]): WorkspaceViewPrefs`; `reconcilePrefs(prefs: WorkspaceViewPrefs, columns: WorkspaceColumn[]): WorkspaceViewPrefs`.
- Samples: 사용자 3명 이상, 방 3개(영업팀 협업=칸반+컬럼 요청/진행중/완료, 설계도면 공유=피드, 전사 자유게시=피드), 방마다 권한 그룹(관리자·저장·읽기 전용 포함).

- [ ] **Step 1: 실패하는 테스트.** `workspace-permissions.test.ts`: `resolveLevel`이 여러 그룹에 속하면 최고 수준을 반환, 어느 그룹에도 없으면 `null`; `can('write','read') === true`, `can('read','write') === false`, `can(null,'read') === false`. `workspace-prefs.test.ts`: 삭제된 컬럼 ID가 `hiddenColumnIds`·`columnOrder`에서 제거됨, 새 컬럼은 `columnOrder` 맨 뒤에 붙고 숨김이 아님, 이미 일치하면 입력과 같은 내용 반환.
- [ ] **Step 2:** `npm run test -- tests/workspace-permissions.test.ts tests/workspace-prefs.test.ts` → FAIL(모듈 없음).
- [ ] **Step 3:** 위 시그니처대로 구현. 샘플은 고정 ID 문자열을 쓴다.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5 (기록):** 커밋 제목 후보 `feat(workspace): 타입과 권한·개인 설정 규칙 추가`.

### Task 3: 가짜 저장소 서비스

**Files:**
- Create: `services/workspace.service.ts`
- Test: `frontend/tests/workspace-service.test.ts`

**Interfaces:**
- Consumes: Task 2의 타입·샘플·`resolveLevel`·`can`·`reconcilePrefs`·`defaultPrefs`.
- Produces: 모두 `Promise` 반환.
  - `listRooms(userId: string): Promise<WorkspaceRoom[]>`(읽기 권한이 있는 방만)
  - `saveRoom(room: WorkspaceRoom, actorId: string): Promise<WorkspaceRoom>`(없는 id면 생성; `admin` 아니면 reject; 규칙 위반은 `Error` 메시지로 reject)
  - `listPosts(roomId: string): Promise<WorkspacePost[]>`
  - `createPost(input: Omit<WorkspacePost,'id'|'createdAt'|'comments'>, actorId: string): Promise<WorkspacePost>`(`write` 필요)
  - `movePost(postId: string, columnId: string|null, actorId: string): Promise<WorkspacePost>`(`write` 필요)
  - `addComment(postId: string, parentCommentId: string|null, body: string, actorId: string): Promise<WorkspaceComment>`(`write` 필요, 답글 깊이는 공지 댓글 트리와 동일하게 중첩 허용)
  - `loadPrefs(userId: string, room: WorkspaceRoom): WorkspaceViewPrefs`, `savePrefs(userId: string, roomId: string, prefs: WorkspaceViewPrefs): void`
  - `resetWorkspaceStore(): void`(테스트용)
- 저장 키: 데이터 `s-erp:workspace:data`, 개인 설정 `s-erp:workspace:<userId>:prefs:<roomId>`. 모든 localStorage 접근은 try/catch로 감싸 실패하면 샘플 데이터를 메모리에 두고 동작한다.
- 규칙: 카드가 있는 컬럼 삭제 시 reject(`'카드가 있는 컬럼은 삭제할 수 없습니다.'`); `admin` 그룹이 0개가 되는 저장 reject(`'방 설정 권한 그룹은 최소 1개 필요합니다.'`); 컬럼이 0개인 방은 `defaultView`가 `feed`로 강제됨.

- [ ] **Step 1: 실패하는 테스트.** `createPost`는 `read`만 가진 사용자에게 reject; `movePost` 후 `listPosts`에 새 `columnId`가 반영되고 다른 사용자 ID로 조회해도 같은 값; 카드가 있는 컬럼을 뺀 `saveRoom`은 위 메시지로 reject; `admin` 그룹을 모두 지우는 `saveRoom` reject; `localStorage.setItem('s-erp:workspace:data','{깨진')` 후 `listRooms`가 샘플 방 3개를 반환(Review Focus 1); `localStorage` 접근이 throw해도 `listRooms`가 반환; `loadPrefs`가 삭제된 컬럼 ID가 든 저장값을 보정해 반환(Review Focus 3).
- [ ] **Step 2:** `npm run test -- tests/workspace-service.test.ts` → FAIL.
- [ ] **Step 3:** 구현. 저장소는 모듈 내부 단일 객체를 읽고 쓸 때마다 JSON으로 동기화하는 단순 방식을 쓴다.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5 (기록):** `feat(workspace): 협업공간 가짜 저장소 서비스 추가`.

### Task 4: 훅

**Files:**
- Create: `hooks/useWorkspaceRooms.ts`, `hooks/useWorkspacePosts.ts`, `hooks/useWorkspaceViewPrefs.ts`

**Interfaces:**
- Consumes: Task 3 서비스, Task 2 타입.
- Produces:
  - `useWorkspaceRooms(userId)` → `{ rooms, loading, error, reload, saveRoom }`
  - `useWorkspacePosts(roomId, userId)` → `{ posts, loading, error, createPost, movePost, addComment }` (변경 후 목록 갱신, 실패 시 `error` 문자열)
  - `useWorkspaceViewPrefs(userId, room)` → `{ prefs, update(partial) }` (변경 즉시 `savePrefs`)
- 화면 동작 규칙은 여기서 표시용 상태(`loading`, `error`)로만 노출하고, 성공·실패 알림은 Task 7에서 `useNotification`으로 처리한다.

- [ ] **Step 1:** 훅은 서비스 위의 얇은 상태 래퍼이므로 별도 테스트 없이 Task 7의 페이지 테스트로 검증한다.
- [ ] **Step 2:** 위 시그니처대로 구현한다. 사용자·방이 바뀌면 이전 요청 결과는 무시한다.
- [ ] **Step 3 (기록):** `feat(workspace): 협업공간 상태 훅 추가`.

### Task 5: 칸반·피드·댓글 컴포넌트

**Files:**
- Create: `components/KanbanBoard.tsx`, `KanbanColumn.tsx`, `PostCard.tsx`, `FeedList.tsx`, `CommentThread.tsx`, `ViewToolbar.tsx`
- Test: `frontend/tests/workspace-page.test.tsx` (Task 7에서 완성, 여기서는 컴포넌트 단위 케이스부터 추가)

**Interfaces:**
- Consumes: Task 2 타입, `WorkspaceViewPrefs`.
- Produces:
  - `KanbanBoard({ room, posts, prefs, canWrite, onMovePost(postId, columnId), onOpenPost(postId) })`
  - `FeedList({ room, posts, canWrite, onAddComment(postId, parentId|null, body) })`
  - `CommentThread({ comments, canWrite, onSubmit(parentId|null, body) })`
  - `ViewToolbar({ view, onViewChange, prefs, columns, onPrefsChange, canWrite, onNewPost })` (보기 전환 탭, 컬럼 표시/접기/순서 메뉴, "내가 쓴 글", 검색어)
- 동작: 숨긴 컬럼은 그리지 않고 드롭 불가; 접은 컬럼은 폭이 줄고 개수만 표시; `canWrite=false`면 `draggable` 해제와 "이동" 메뉴 숨김; 카드마다 "이동" 메뉴(키보드·모바일용)로 다른 컬럼으로 옮길 수 있음; 드래그 중 놓을 위치 강조, 빈 컬럼은 "카드를 여기로 끌어 놓으세요" 안내; 칸반은 보드 영역만 가로 스크롤하고 페이지는 스크롤되지 않음; 제목은 2줄 말줄임, 본문은 줄바꿈.

- [ ] **Step 1: 실패하는 테스트.** 숨긴 컬럼 이름이 렌더되지 않음; `canWrite=false`일 때 카드에 `draggable="true"`가 없고 "이동" 버튼이 없음(Review Focus 4); 카드의 "이동" 메뉴에서 컬럼을 고르면 `onMovePost(postId, columnId)` 호출; 컬럼에 카드가 없으면 빈 안내 문구가 보임; 댓글 "답글"을 눌러 제출하면 `onSubmit(parentId, body)` 호출; 빈 본문은 제출 불가.
- [ ] **Step 2:** `npm run test -- tests/workspace-page.test.tsx` → FAIL.
- [ ] **Step 3:** 구현. 기존 공지 화면(`NoticeFeedList`)의 카드·댓글 시각 패턴과 MUI 테마 토큰을 재사용하고 임의 색상을 쓰지 않는다.
- [ ] **Step 4:** 같은 명령 → PASS.
- [ ] **Step 5 (기록):** `feat(workspace): 칸반·피드·댓글 컴포넌트 추가`.

### Task 6: 작성·방 설정·권한 그룹 다이얼로그

**Files:**
- Create: `components/PostComposerDialog.tsx`, `RoomSettingsDialog.tsx`, `PermissionGroupTable.tsx`, `RoomList.tsx`
- Test: `frontend/tests/workspace-page.test.tsx`에 추가

**Interfaces:**
- Consumes: Task 2 타입, `CommonDialog`, `useCommonConfirmDialog`.
- Produces:
  - `PostComposerDialog({ open, room, onClose, onSubmit(input: {title,body,columnId,attachments}) })` — 제목 필수, 컬럼이 있는 방은 상태 선택, 첨부는 파일명·크기·형식만 목록에 표시
  - `RoomSettingsDialog({ open, room, users: WorkspaceUser[], onClose, onSave(room: WorkspaceRoom) })` — 이름, 기본 보기, 컬럼 추가·이름 변경·순서 변경·삭제, 권한 그룹 표
  - `PermissionGroupTable({ groups, users, onChange(groups) })` — 그룹 추가·삭제·이름 변경, 구성원(개별 사용자) 선택, 수준(읽기/저장/방 설정) 선택
  - `RoomList({ rooms, selectedRoomId, onSelect, onCreate, canCreate })`
- 변경이 있는 채로 닫으면 확인창을 띄운다. 저장 중에는 버튼 비활성과 진행 표시, 서비스 reject 메시지는 다이얼로그 안 `Alert`로 보여준다(Review Focus 2).

- [ ] **Step 1: 실패하는 테스트.** 제목이 비면 저장 불가; 마지막 `admin` 그룹을 삭제하려 하면 서비스 메시지가 `Alert`로 표시됨; 변경 후 닫기에서 확인창이 뜨고 취소하면 다이얼로그가 남음; 컬럼이 없는 방을 설정하면 기본 보기가 피드로 고정됨.
- [ ] **Step 2:** 테스트 실행 → FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 테스트 실행 → PASS.
- [ ] **Step 5 (기록):** `feat(workspace): 글 작성·방 설정·권한 그룹 UI 추가`.

### Task 7: 페이지 조립과 메뉴 연결

**Files:**
- Create: `WorkspacePage.tsx`
- Modify: `frontend/src/pages/dashboard/components/dashboardPages.ts`(`WorkspacePage` lazy 등록), `frontend/src/pages/dashboard/components/DashboardContent.tsx`(`groupware` + `workspace` 분기, archive 분기 바로 아래), `frontend/src/pages/dashboard/services/dashboardData.ts`(`workspace` 페이지 콘텐츠: 제목 '협업공간', 설명 한 줄, `cards: []`)
- Test: `frontend/tests/workspace-page.test.tsx`

**Interfaces:**
- Consumes: Task 4 훅, Task 5·6 컴포넌트. Props는 `ArchiveBoardPage`와 같은 `{ selectedModule, currentMenuName, content, selectedMenuPermissions }`.
- 화면: `PageHeader` + 좌측 `RoomList` + 우측 `ViewToolbar`/`KanbanBoard`|`FeedList`. 좁은 화면에서는 방 목록이 위로 접힌다. 개발용 "사용자 전환" 선택기는 헤더 영역에 두고 샘플 사용자 이름으로 구분한다(백엔드 연동 시 제거). 성공/실패는 `useNotification`, 로딩·오류·빈 상태(읽을 수 있는 방이 없음, 글이 없음)를 각각 표시한다.
- 메뉴 항목 등록: 먼저 메뉴가 서버 데이터인지 확인한다. `workspace` 메뉴 행이 없으면 DB를 바꾸지 말고 사용자에게 알린다(설계 문서 6장).

- [ ] **Step 1: 실패하는 테스트.** `DashboardContent`에 `groupware`/`workspace`를 주면 협업공간 화면이 렌더됨(archive-page 테스트의 `preloadDashboardPages` 패턴 사용); 방 선택 → 칸반/피드 전환; 카드 "이동"으로 컬럼 이동 후 사용자 전환해도 같은 컬럼; 읽기만 가능한 사용자는 "새 글" 버튼이 없음; 읽을 수 있는 방이 없는 사용자는 빈 안내가 보임.
- [ ] **Step 2:** `npm run test -- tests/workspace-page.test.tsx` → FAIL.
- [ ] **Step 3:** 구현.
- [ ] **Step 4:** 같은 명령 → PASS. 이어서 `npm run test`(전체)와 `npm run build`가 통과해야 한다.
- [ ] **Step 5 (기록):** `feat(groupware): 협업공간 화면과 메뉴 연결 추가`.

### Task 8: 실제 브라우저 검증과 결과 문서

**Files:**
- Create: `docs/result/20261126/community-workspace/20261126_NNN_협업공간_프론트엔드_결과.md`, `docs/result/20261126/community-workspace/screenshots/*.png`

- [ ] **Step 1:** `cd frontend && npm run dev -- --strictPort`로 4173에서 띄운다(이미 떠 있으면 iPlusMES인지 확인 후 재사용).
- [ ] **Step 2:** 375/768/1280px에서 칸반·피드·방 설정 화면을 확인한다: 가로 스크롤 없음, 겹침·잘림 없음, 드래그 시 놓을 위치 표시, 키보드로 "이동" 메뉴 사용, 사용자 전환별 권한 표시, 컬럼 숨김·접기·순서가 새로고침 후 유지. 공지·자료실과 헤더·여백·버튼 위치를 나란히 비교한다.
- [ ] **Step 3:** 스크린샷을 `screenshots/`에 저장하고 위 확인 결과, 기준 화면과의 차이, 미확인 사항(메뉴 행 존재 여부 등)을 결과 문서에 쓴다. 직접 띄운 서버는 종료하고 포트 해제를 확인한다.
- [ ] **Step 4 (기록):** 결과 문서에 Task별 커밋 제목 후보 목록을 모아 둔다. 커밋은 만들지 않는다.

---

## Self-Review 메모

- 설계 5~8장, 5.1(UI/UX), 5.2(구성원) 항목은 Task 2~7에 모두 대응한다. 파일 보기·백엔드·부서 구성원은 비목표다.
- 이 계획의 결정(설계 문서에 없던 것): 권한 수준을 누적(admin ⊃ write ⊃ read)으로 저장, 드래그는 기본 HTML5 + "이동" 메뉴, 서비스는 Promise 반환. 검토 시 알려 준다.
