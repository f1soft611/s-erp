# 문서작성 결재선 및 에디터 사용성 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문서작성 모달에서 결재자/참조자 선택과 결재 단계 공간을 개선하고, 에디터 본문 높이를 내용에 맞춰 늘리면서 모달 콘텐츠 스크롤을 사용한다.

**Architecture:** 기존 `UserSelectEditor`에 기본값이 기존 동작을 유지하는 선택 옵션 숨김·선택 순서 보존 속성을 추가하고 문서작성 화면에서만 사용한다. 결재 단계 생성은 `useDocumentComposer`, 결재선/참조선 표현은 `DocumentApprovalFields`에서 조정한다. 공통 에디터는 변경하지 않고, 모달 콘텐츠가 스크롤을 소유하도록 작성 모달 안의 고정 높이와 편집기 내부 스크롤을 제거한다.

**Tech Stack:** React, TypeScript, MUI Autocomplete, Tiptap shared RichTextEditor, Vitest, React Testing Library, Vite.

---

## 근거 문서

- 승인 설계: [2026-10-07-document-write-approval-editor-usability-design](../specs/2026-10-07-document-write-approval-editor-usability-design.md)
- 작업지시서: [20261007_001 문서작성 결재선 및 에디터 사용성 개선](../../directions/20261007/20261007_001_문서작성_결재선_에디터_사용성_개선_작업지시서.md)
- 이전 기안서 필드 사양: [20261006_005 문서작성 기안서 탭 필드 재정의](../../spec/20261006/20261006_005_문서작성_기안서탭_필드재정의_사양서.md)

## 파일 지도

- `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`: 선택된 후보를 드롭다운에서 숨기고, opt-in 시 선택값 입력 순서를 chip 순서로 보존한다. 두 동작의 기본값은 비활성으로 둬 기존 호출부를 보존한다.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`: 선택된 사용자 순서를 사용해 결재자 1명당 순차 결재 단계를 생성한다. 합의는 기존과 같이 선택된 사용자를 하나의 합의 단계로 추가한다.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`: 이미 결재/합의된 사용자를 결재 후보에서 제외하고, 액션을 입력 우측에 배치하며, 선택 미리보기 중복을 제거하고, 단계 카드를 번호/화살표가 있는 가로 스트립으로 표시한다. 참조 필드도 후보 숨김을 적용하고 아래 요약을 제거한다.
- `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`: 본문 편집기와 기안서 필드의 내부 세로 스크롤/고정 높이를 제거해 자연 높이와 공통 모달 콘텐츠 스크롤을 사용한다.
- `frontend/tests/user-select-editor.test.tsx`: 공통 선택기의 opt-in 숨김 및 선택 순서 보존을 직접 검증한다.
- `frontend/tests/document-write-page.test.tsx`: 다중 순차 결재, 결재 후보 중복 방지, 합의 묶음 불변, 참조 미리보기 제거, 모달 스크롤 컨테이너 및 본문 자동 높이를 검증한다.
- `docs/directions/20261007/20261007_001_문서작성_결재선_에디터_사용성_개선_작업지시서.md`, `docs/plan/20261007/20261007_001_문서작성_결재선_에디터_사용성_개선_계획서.md`, `docs/spec/20261007/20261007_001_문서작성_결재선_에디터_사용성_개선_사양서.md`: 날짜별 변경 근거 및 구현/검증 문서.
- `docs/result/20261007/document-write-approval-editor-usability/`: 결과 보고서와 375px/768px/1280px 목록/모달 스크린샷.

## Task 1: 공통 선택기 opt-in 동작 잠금

**Files:**
- Create: `frontend/tests/user-select-editor.test.tsx`
- Modify: `frontend/src/shared/components/f1-grid/editing/UserSelectEditor.tsx`

- [x] **Step 1: 선택된 항목 숨김 실패 테스트 작성**

여러 선택 입력에 `value={['user-1']}`, 두 명 이상을 포함한 `options`, `hideSelectedOptions`를 전달한다. 입력을 열어 선택된 사용자는 후보 `option`으로 보이지 않고 다른 사용자는 보이는지, 선택된 사용자는 입력 내부 chip으로 계속 표시되는지 검증한다.

```tsx
render(
  <UserSelectEditor
    value={['user-1']}
    options={options}
    multiple
    label="사용자"
    hideSelectedOptions
    onChange={vi.fn()}
  />,
);

fireEvent.click(screen.getByRole('combobox', { name: '사용자' }));
expect(screen.queryByRole('option', { name: /user 1/i })).not.toBeInTheDocument();
expect(screen.getByRole('option', { name: /user 2/i })).toBeInTheDocument();
expect(screen.getByText('User 1')).toBeInTheDocument();
```

- [x] **Step 2: 테스트를 실행해 신규 prop 부재로 실패하는지 확인**

Run: `cd frontend; npm run test -- tests/user-select-editor.test.tsx`

Expected: 새 selector 테스트가 `hideSelectedOptions` prop이 없어서 타입 검사 또는 동작 기대에서 실패한다.

- [x] **Step 3: 순서 보존 실패 테스트 작성**

`preserveSelectionOrder`를 켠 다중 선택기에 역순 `value={['user-2', 'user-1']}`와 원래 사용자 목록 순서인 options를 전달하고, 입력 내부 chip이 `User 2`, `User 1` 순으로 렌더링되는지 확인한다.

- [x] **Step 4: `UserSelectEditor`에 선택적 props 구현**

`hideSelectedOptions?: boolean`과 `preserveSelectionOrder?: boolean`을 추가한다. 기본은 둘 다 `false`다. 선택값 순서를 보존할 때는 선택 ID 순으로 옵션을 찾고, 그렇지 않을 때는 기존 `options.filter` 결과를 유지한다. MUI Autocomplete의 `filterSelectedOptions`에는 `hideSelectedOptions`를 전달한다. 선택값이 options에 없을 수 있는 일반적인 오류 상태를 임의로 대체하지 않는다.

- [x] **Step 5: selector 테스트 검증**

Run: `cd frontend; npm run test -- tests/user-select-editor.test.tsx`

Expected: 선택값은 입력 안에 남고 선택 후보는 숨겨지며, 역순 값은 같은 순서의 chip으로 표시된다. 새 prop을 사용하지 않는 테스트/호출부는 기존 동작을 유지한다.

## Task 2: 결재/참조 선택 및 가로 단계 동작 변경

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalFields.tsx`

- [x] **Step 1: 기존 한 명 제한을 대체하는 다중 결재 실패 테스트 작성**

두 사용자를 지정 순서(예: 김민수, 홍길동)로 결재선에 선택한다. 각 선택 직후 선택된 사용자가 선택 후보 option에서 사라지고 selector 안 chip은 유지되는지 확인한다. `결재 추가`를 누른 후 두 단계가 선택한 순서대로 생성되고 결재 선택값이 비워지는지 확인한다. 추가된 두 사용자가 다시 결재 후보로 나타나지 않아야 한다.

- [x] **Step 2: 참조선 중복 미리보기 제거 및 선택 숨김 실패 테스트 작성**

참조 사용자 다중 선택 후 selector 내부 chip이 보이는지 확인한다. 선택된 사용자는 열린 후보 목록에서 제외되고 `document-reference-list` 별도 요약은 렌더링되지 않아야 한다. 참조 선택은 결재 단계 생성과 독립적이어야 한다.

- [x] **Step 3: 회귀 테스트를 실행해 새 UX assertion 실패를 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: 기존 테스트 중 참조 아래의 요약을 기대하는 assertion 및 신규 다중 결재 assertion이 실패한다. 기존 합의 단일 단계 테스트는 계속 통과한다.

- [x] **Step 4: `addApproval`을 선택 순서대로 단계 생성하도록 수정**

`selectedApprovalUsers`는 `selectedApprovalUserIds.map(id => userOptions.find(...))`에서 나온 순서를 그대로 사용한다. 비어 있으면 종료한다. 각 선택 사용자에 대해 새 `id`를 발급해 `kind: 'approval'`, `users: [user]`인 단계를 한 번의 `setApprovalStages` 업데이트로 기존 끝에 순서대로 추가하고, 마지막에 선택 ID를 비운다. `addAgreement`는 기존 단일 그룹 단계 semantics를 유지하고 성공 뒤 선택 ID를 비운다.

- [x] **Step 5: 결재 후보와 필드 레이아웃 수정**

`DocumentApprovalFields`에서 모든 단계 사용자 ID를 모아 결재 후보 옵션에서 제외한다. 결재/참조 `UserSelectEditor`에 `hideSelectedOptions`와 `preserveSelectionOrder`를 켠다. 선택한 사용자 아래 `RecipientSummary`는 제거한다. 결재 사용자 입력과 가로 배치된 결재/합의 버튼을 한 행에 둔다. 단계 strip은 `display:flex`, `overflowX:auto`, `minWidth:0`를 사용하고 각 단계는 줄어들지 않는 카드로 유지한다. 단계 사이에 접근성 장식 표식 `>`를 넣고 단계 번호/삭제 이름은 현재의 연속 번호를 계속 사용한다. 참조 아래의 `document-reference-list`/`RecipientSummary`는 제거한다.

- [x] **Step 6: 결재/참조 테스트를 실행해 통과 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: 다중 결재 순서, 추가된 결재자 후보 제외, 참조 선택 chip 및 후보 숨김, 미리보기 제거, 기존 단일 합의 단계와 삭제 후 재번호가 모두 통과한다.

## Task 3: 본문 자동 확장 및 모달 스크롤

**Files:**
- Modify: `frontend/tests/document-write-page.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`

- [x] **Step 1: 스크롤 책임 회귀 assertion 추가**

본문 요소가 기존 최소 높이를 유지하면서 제한 최대 높이/내부 세로 스크롤을 갖지 않는지 확인한다. 본문 요소의 조상인 `.MuiDialogContent-root`는 세로 스크롤을 담당해야 한다. 테스트는 역할 dialog 내부의 실제 에디터 DOM과 MUI content 영역을 기준으로 하고, 에디터 인스턴스 구현을 mock하지 않는다.

- [x] **Step 2: 스크롤 테스트를 실행해 현재 동작을 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: 기존 editor `maxHeight: 100%`/`overflowY: auto` 스타일과 wrapper 제약 때문에 기대된 natural-growth 스타일 assertion이 실패한다.

- [x] **Step 3: 본문 레이아웃을 내용 높이 기반으로 조정**

기안서 본문까지 감싸는 composer body에서 고정 `height: '100%'`와 내부 `overflowY: 'auto'`를 제거하고 자연 높이 및 `minWidth: 0`를 유지한다. 에디터/ProseMirror의 `flex: 1`, 고정 `maxHeight: '100%'`, `overflowY: 'auto'`, 넘치는 부모 `overflow: 'hidden'` 제약을 제거한다. `minHeight: 180`과 가로축 overflow 보호는 유지하고, 본문 surface는 document 길이에 따라 세로로 확장되게 한다. 양식 필드와 본문을 포함한 세로 스크롤은 기존 CommonDialog `DialogContent`에 맡긴다.

- [x] **Step 4: 모달 스크롤 테스트 통과 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx`

Expected: 편집기 안쪽 세로 스크롤 대신 `DialogContent`가 세로 overflow를 담당하는 DOM/CSS 조건이 통과하고 기존 템플릿 적용/교체 동작은 유지된다.

## Task 4: 통합 검증 및 결과 기록

**Files:**
- Create: `docs/result/20261007/document-write-approval-editor-usability/20261007_001_문서작성_결재선_에디터_사용성_개선_결과보고서.md`
- Create: `docs/result/20261007/document-write-approval-editor-usability/screenshots/`
- Review: all changed source/test/doc files

- [x] **Step 1: Run focused regression tests**

Run: `cd frontend; npm run test -- tests/user-select-editor.test.tsx tests/document-write-page.test.tsx`

Expected: both files pass, including opt-in selector defaults, multi-approval order, agreement grouping, reference behavior, and editor scroll structure.

- [x] **Step 2: Build the frontend**

Run: `cd frontend; npm run build`

Expected: TypeScript project build and Vite production build exit successfully.

- [x] **Step 3: Verify actual browser layouts and save captures**

Start `npm run dev` from `frontend` only if no reusable dev server is already available. Inspect the document composer at 375px, 768px, and 1280px. Select two users in a known reverse order, confirm candidates disappear from the active picker, confirm ordered approval cards and the local horizontal stage-strip scroll at the narrow viewport, and verify reference chips have no duplicate summary. Insert sufficient multiline editor content to exceed the modal viewport; confirm the editor surface expands and the modal content scrolls while the header/footer remain available. Capture list/composer screenshots under the result screenshots directory. Stop only a server started for this verification and confirm its port is released.

브라우저 데이터에 추가 선택 후보가 없어 다중 사용자 조작은 수행하지 못했다. 다중 결재 순서, 후보 제거, 스트립 overflow 스타일은 자동 회귀 테스트로 확인했다. 375px/768px/1280px 반응형 렌더링, 긴 본문 확장, 모달 스크롤 및 캡처는 브라우저에서 확인했다.

- [x] **Step 4: Update the dated spec and write the result report**

The detailed spec is written before implementation at `docs/spec/20261007/20261007_001_문서작성_결재선_에디터_사용성_개선_사양서.md`. After implementation, update it only if observed behavior or an approved scope decision requires it. Create `docs/result/20261007/document-write-approval-editor-usability/20261007_001_문서작성_결재선_에디터_사용성_개선_결과보고서.md` with changed files, actual test/build output, measured browser viewport and scroll observations, screenshot links, and any deviations. Do not claim an unmeasured scroll/no-overflow result.

- [x] **Step 5: Review final changes**

Run `git diff --check`, inspect `git status --short`, and ensure only the user selector, document-write composer, focused tests, and dated task/design/result docs changed. Do not change approval APIs, routes, backend, or database.
