# 댓글 이미지 순서 및 테마 안전 확대 뷰어 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 댓글 이미지 미리보기를 첨부파일 목록 위로 옮기고, 밝은/다크 테마 모두에서 확대 이미지의 색과 비율을 보존한다.

**Architecture:** `TiptapCommentThread`에서 미리보기와 파일 목록의 렌더 순서만 변경한다. 공유 `ImageViewerDialog`는 기존 페이지의 이미지 URL 콜백과 URL 수명 관리를 유지하면서, 테마 기반 모달 UI 및 이미지 변형이 없는 중립 체크무늬 캔버스를 제공한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Vite, Playwright 브라우저 확인

---

## 파일 구성

- 수정 `frontend/src/shared/components/feed/TiptapCommentThread.tsx`: 댓글 본문 아래 미리보기 영역과 파일 목록의 순서를 변경한다.
- 수정 `frontend/src/shared/components/ImageViewerDialog.tsx`: 고정 다크 색상을 테마 색으로 바꾸고 체크무늬 캔버스와 원본 비율 표시를 설정한다.
- 수정 `frontend/tests/feed-components.test.tsx`: 이미지 미리보기가 일반 파일 첨부보다 먼저 렌더링되는지 검증한다.
- 생성 `frontend/tests/image-viewer-dialog.test.tsx`: 테마별 배경, 이미지 src 보존, 이미지 필터 미적용을 검증한다.
- 생성 `docs/directions/20261020/20261020_011_comment_attachment_order_theme_safe_viewer_작업지시서.md`: 승인 요구와 완료 조건을 추적한다.
- 생성 `docs/spec/20261020/20261020_011_comment_attachment_order_theme_safe_viewer_상세사양서.md`: UI, 테마, 테스트 기준을 구체화한다.
- 생성 `docs/result/20261020/comment-attachment-order-theme-safe-viewer/result.md` 및 `screenshots/`: 실제 검증 결과를 기록한다.

## Task 1: 순서와 이미지 뷰어 회귀 테스트 작성

**Files:**
- Modify: `frontend/tests/feed-components.test.tsx`
- Create: `frontend/tests/image-viewer-dialog.test.tsx`

- [ ] **Step 1: 댓글 이미지 순서 테스트를 먼저 실패하도록 추가**

기존 댓글 이미지 테스트의 “미리보기가 파일 첨부 아래” 기대를 교체한다. 댓글 fixture의 미리보기와 파일 목록을 잡아 DOM 순서를 검증한다.

```tsx
const imagePreviews = screen.getByTestId('comment-image-previews-31');
const attachmentList = screen.getByTestId('notice-attachment-list');

expect(
  imagePreviews.compareDocumentPosition(attachmentList) &
    Node.DOCUMENT_POSITION_FOLLOWING,
).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
```

또한 목록 내 이미지가 여전히 없고 두 첨부 파일명이 보이며 이미지 클릭 콜백이 기존 src/alt로 호출되는 단언은 유지한다.

- [ ] **Step 2: 순서 테스트를 실행해 현재 코드에서 실패하는지 확인**

Run: `cd frontend; npx vitest run tests/feed-components.test.tsx -t "comment image previews"`

Expected: 현재 DOM은 파일 목록을 먼저 렌더링하므로 순서 단언에서 실패한다.

- [ ] **Step 3: 공유 뷰어의 원본 보존/테마 회귀 테스트 추가**

`frontend/tests/image-viewer-dialog.test.tsx`에서 MUI `ThemeProvider`와 `createAppTheme(mode)`를 사용해 `light`, `dark` 각각 렌더링한다. 원본 URL은 `blob:viewer-image`로 고정한다. `screen.getByRole('img', { name: 'stamp.png' })`의 `src`가 그대로 유지되고, 이미지 요소의 CSS `filter`가 없거나 `none`이며, 해당 부모 캔버스에 체크무늬 배경이 설정되는지 확인한다. 다이얼로그의 테마 표면/텍스트 색은 각 테마 palette에 대응해야 한다.

- [ ] **Step 4: 뷰어 테스트를 현 코드에서 실행해 테마/캔버스 기대가 실패하는지 확인**

Run: `cd frontend; npx vitest run tests/image-viewer-dialog.test.tsx`

Expected: 고정 다크 배경과 캔버스가 없는 현재 뷰어 때문에 테마별 표시 단언이 실패한다. 이미지 src 보존 단언은 통과할 수 있다.

## Task 2: 댓글 순서 및 공유 뷰어 표시 구현

**Files:**
- Modify: `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- Modify: `frontend/src/shared/components/ImageViewerDialog.tsx`

- [ ] **Step 1: 댓글 첨부 JSX에서 이미지 미리보기 블록을 첨부 목록 블록 앞으로 이동**

댓글 영역의 순서를 본문 → `comment-image-previews-${comment.id}` → `AttachmentList`로 만든다. 각 블록의 props, 목록 내 다운로드/삭제 callback, 기존 CSS 간격을 유지한다.

- [ ] **Step 2: 뷰어의 고정 색상 대신 MUI 테마 palette 사용**

`ImageViewerDialog`의 Dialog paper, 제목/닫기 버튼, 캔버스 배경을 각각 theme의 `background.paper`, `text.primary`, `divider` 등의 색으로 설정한다. 밝은/다크에서 컨트롤의 대비가 유지되어야 한다.

- [ ] **Step 3: 캔버스에 체크무늬를 적용하고 이미지 픽셀 스타일은 보존**

이미지 뒤의 부모 `Box`에만 반복형 체크무늬를 설정한다. `<img>` 자체에는 `filter`, 밝기, 블렌드 모드를 주지 않는다. 이미지 너비/높이는 뷰포트 내 최대 크기를 제한하고 `objectFit: 'contain'`으로 전체 이미지와 종횡비를 유지한다.

## Task 3: 자동 검증

**Files:**
- Test: `frontend/tests/feed-components.test.tsx`
- Test: `frontend/tests/image-viewer-dialog.test.tsx`
- Test: `frontend/tests/document-write-page.test.tsx`
- Test: `frontend/tests/notice-page-local-updates.test.tsx`

- [ ] **Step 1: 댓글 및 이미지 뷰어 집중 테스트 실행**

Run: `cd frontend; npx vitest run tests/feed-components.test.tsx tests/image-viewer-dialog.test.tsx`

Expected: 모두 통과하며 순서, 이미지 src, 테마별 캔버스와 필터 미적용을 확인한다.

- [ ] **Step 2: 기존 문서/공지 댓글 이미지 연결 회귀 테스트 실행**

Run: `cd frontend; npx vitest run tests/document-write-page.test.tsx tests/notice-page-local-updates.test.tsx -t "comment image"`

Expected: 확대 뷰어 연결, Blob 오류 표시, 다운로드 유지 테스트가 통과한다.

- [ ] **Step 3: 프론트엔드 빌드 실행**

Run: `cd frontend; npm run build`

Expected: TypeScript 검사와 Vite 빌드가 성공한다.

## Task 4: 실제 브라우저 및 결과 문서 검증

**Files:**
- Create: `docs/result/20261020/comment-attachment-order-theme-safe-viewer/result.md`
- Create: `docs/result/20261020/comment-attachment-order-theme-safe-viewer/screenshots/`

- [ ] **Step 1: 합성 댓글로 375px, 768px, 1280px에서 미리보기/첨부 순서 확인**

개인정보나 실제 tenant 데이터를 사용하지 않는다. 세 너비 모두에서 미리보기 영역이 첨부 목록보다 위이고 페이지 가로 overflow가 없음을 확인한다.

- [ ] **Step 2: 동일 합성 이미지로 라이트/다크 뷰어 확인**

각 테마에서 PNG 투명 영역의 체크무늬가 보이고 이미지 색상/명암이 원본과 동일한지 확인한다. 이미지 전체가 잘리지 않고 표시되는지 확인한다. 결과 폴더에 너비별 대표 스크린샷(375/768/1280px)과 각 테마 뷰어 스크린샷을 저장한다.

- [ ] **Step 3: 결과 문서에 근거 기록**

재현 조건, 고정 배경/레이아웃 원인, 변경된 렌더 순서 및 테마 처리, 실행 명령과 실제 테스트 결과, 라이트/다크·세 너비별 확인 결과, 스크린샷 링크를 작성한다. API/DB 변경 없음과 합성 데이터 사용을 기록한다.

## 작업지시서 및 상세 사양

- 작업지시서: `docs/directions/20261020/20261020_011_comment_attachment_order_theme_safe_viewer_작업지시서.md`
- 승인 설계: `docs/superpowers/specs/2026-10-20-comment-attachment-order-theme-safe-viewer-design.md`
- 상세 사양: `docs/spec/20261020/20261020_011_comment_attachment_order_theme_safe_viewer_상세사양서.md`
