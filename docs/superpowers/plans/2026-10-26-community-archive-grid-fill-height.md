# 자료실 그리드 전체 높이 구현 계획

> **For agentic workers:** Follow this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자료실의 파일/폴더 그리드가 헤더·검색·경로 아래 남은 세로 공간을 채운다.

**Architecture:** `ArchiveBoardPage`의 페이지 수준 세로 flex 구조를 마지막 그리드 영역까지 이어 준다. 기존 `ArchiveFileGrid`와 `F1Tree(height="100%")`의 높이 계약을 사용하며, 공통 그리드·API·자료실 로딩 로직은 바꾸지 않는다.

**Tech Stack:** React, TypeScript, MUI `Box`, Vitest, Vite, Playwright.

---

## 변경 파일 및 책임

- `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`: 페이지 내 그리드 잔여 높이 배분을 연결한다. 같은 파일에 이미 존재하는 자료실 로딩 변경은 그대로 보존한다.
- `frontend/tests/archive-page.test.tsx`: 자료실 그리드 호스트가 세로 flex 컨테이너임을 검사한다. 실제 잔여 높이 계산은 브라우저에서 검증한다.
- `docs/result/20261026/community-archive-grid-fill-height/`: 원인, 수정, 테스트/브라우저 검증 및 캡처를 보관한다.

## Task 1: 기존 동작 기준 확인

**Files:**
- Test: `frontend/tests/archive-page.test.tsx`
- Reference: `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`
- Reference: `frontend/src/pages/groupware/community/archive/components/ArchiveFileGrid.tsx`

- [ ] **Step 1: 관련 자료실 회귀 테스트 실행**

Run from `frontend`:

```powershell
npm run test -- tests/archive-page.test.tsx
```

Expected: 자료실 테스트가 모두 통과한다. 실패하면 먼저 기존 워크트리 변경과 실패 원인을 구분하고, 이 레이아웃 작업과 무관한 동작은 수정하지 않는다.

- [ ] **Step 2: 높이 전달 경로 확인**

`ArchiveBoardPage`의 마지막 그리드 호스트가 페이지의 flex 자식이며, `ArchiveFileGrid`가 `F1Tree`에 `height="100%"`를 제공함을 확인한다. `DocumentStatusPage`의 유사한 grid wrapper를 기준으로 비교한다.

## Task 2: 그리드 영역에 잔여 높이 전달

**Files:**
- Modify: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`

- [ ] **Step 1: 마지막 그리드 호스트에 세로 flex 레이아웃 적용**

먼저 `Archive dashboard page` 테스트 그룹에 다음 회귀 테스트를 추가한다.

```tsx
it('uses a flex column to pass remaining height to the file tree', async () => {
  renderArchive();
  await screen.findByRole('grid', { name: '자료실' });

  const gridContainer = screen.getByTestId('archive-grid-container');

  expect(getComputedStyle(gridContainer).display).toBe('flex');
  expect(getComputedStyle(gridContainer).flexDirection).toBe('column');
});
```

- [ ] **Step 2: 회귀 테스트가 레이아웃 부재로 실패하는지 확인**

Run from `frontend`:

```powershell
npx vitest run tests/archive-page.test.tsx -t "uses a flex column to pass remaining height to the file tree"
```

Expected: `archive-grid-container`가 아직 없어 테스트가 실패한다.

- [ ] **Step 3: 실패 테스트를 통과시키는 최소 레이아웃 수정**

현재 마지막 그리드 호스트:

```tsx
<Box
  sx={{ flex: 1, minHeight: 0, minWidth: 0, px: { xs: 1, sm: 2 }, pb: 2 }}
>
```

`data-testid`와 세로 flex 스타일을 추가해 자식 `ArchiveFileGrid`가 flex item으로 가용 높이를 받게 한다.

```tsx
<Box
  data-testid="archive-grid-container"
  sx={{
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    px: { xs: 1, sm: 2 },
    pb: 2,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }}
>
```

같은 호스트 내 기존 `ArchiveFileGrid` props는 바꾸지 않는다. `ArchiveBoardPage`의 다른 로딩, 오류, 폴더 경로 및 파일 작업 코드는 유지한다.

- [ ] **Step 4: 회귀 테스트 통과 확인**

Run from `frontend`:

```powershell
npm run test -- tests/archive-page.test.tsx
```

Expected: 모든 테스트가 통과한다.

- [ ] **Step 5: TypeScript 및 프로덕션 빌드 확인**

Run from `frontend`:

```powershell
npm run build
```

Expected: TypeScript 검사와 Vite 프로덕션 빌드가 통과한다.

## Task 3: 실제 브라우저에서 반응형 높이 검증

**Files:**
- Inspect: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`
- Output: `docs/result/20261026/community-archive-grid-fill-height/`

- [ ] **Step 1: 개발 서버 사용 가능 여부 확인**

`http://127.0.0.1:4173`의 기존 프로세스가 S-ERP인지 확인한다. 해당 서버가 없으면 `frontend`에서 `npm run dev -- --strictPort`로 실행한다. 다른 서버이거나 용도를 알 수 없는 프로세스가 있으면 다른 포트로 우회하지 말고 브라우저 검증 제한을 결과에 기록한다.

- [ ] **Step 2: 자료실 페이지에서 뷰포트 폭별 레이아웃 측정**

인증된 브라우저에서 자료실을 열고 375px, 768px, 1280px 너비를 각각 확인한다. 각 폭에서 페이지 헤더·검색·경로 아래 그리드 컨테이너의 사각형이 남은 높이를 차지하고, 그리드 내부 스크롤 외에 의도하지 않은 수평 오버플로가 없는지 검사한다. 화면 높이 또는 컨텐츠 상태를 바꿔도 그리드가 콘텐츠 높이에 고정되지 않는지 확인한다.

- [ ] **Step 3: 실제 화면 캡처**

가능한 경우 375px, 768px, 1280px 스크린샷을 `docs/result/20261026/community-archive-grid-fill-height/`에 저장한다. 인증을 얻지 못하거나 기존 서버를 안전하게 재사용할 수 없어 검증이 불가능하면 스크린샷을 만들지 말고 제한과 확인하지 못한 항목을 결과 문서에 명시한다.

## Task 4: 결과 문서 및 변경 점검

**Files:**
- Create: `docs/result/20261026/community-archive-grid-fill-height/20261026_005_커뮤니티_자료실_그리드_전체높이_결과.md`
- Inspect: `git diff --check`

- [ ] **Step 1: 결과 문서 작성**

재현된 레이아웃 원인, flex 높이 전달 변경, 보존한 기존 동작, 테스트/빌드 결과, 세 뷰포트별 브라우저 결과 및 캡처 경로를 적는다. 브라우저 접근이 제한되면 제약을 사실대로 기록한다.

- [ ] **Step 2: 공백 오류 점검**

Run from repository root:

```powershell
git diff --check
```

Expected: 출력이 없고 종료 코드 0이다. 작업 대상이 아닌 기존 변경은 수정하거나 스테이징하지 않는다.
