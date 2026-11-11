# 문서 결재 액션 더보기 메뉴 Implementation Plan

> **For agentic workers:** 이 계획은 현재 Copilot 세션에서 인라인으로 순차 실행한다. 작업 단계는 체크박스로 추적한다.

**Goal:** 문서 피드와 상세의 결재 액션을 기존 더보기 메뉴의 첫 그룹으로 옮긴다.

**Architecture:** `DocumentApprovalDetailFeed`가 기존 권한 판정과 핸들러를 유지하면서 결재 액션 목록을 `DocumentActionsMenu`에 전달한다. 메뉴 컴포넌트는 결재, 공유·참조, 수정·삭제 그룹을 순서대로 렌더링하고, 기존 액션을 선택하면 메뉴를 닫은 뒤 전달된 콜백을 실행한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Vite.

---

## 파일 구조

- `frontend/src/pages/groupware/documents/write/components/DocumentActionsMenu.tsx` — 액션 항목을 첫 그룹으로 수용하고 세 메뉴 그룹 사이 구분선을 렌더링한다.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx` — 승인, 반려, 보완요청, 최종확인, 참조확인, 상신 취소, 승인 취소를 현재 권한에 따라 메뉴 항목으로 전달한다. 툴바 결재 버튼은 제거한다.
- `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx` — 더 이상 사용하지 않는 결재 액션 슬롯을 제거한다.
- `frontend/tests/document-link-sharing.test.tsx` — 메뉴 그룹 순서, 구분선, 선택 후 닫힘을 검증한다.
- `frontend/tests/document-write-page.test.tsx` — 피드/상세의 버튼 비노출과 기존 결재 흐름을 메뉴 항목으로 검증한다.
- `docs/result/20261111/document-approval-actions-menu/` — 구현 결과, 검증 내역, 브라우저 화면을 기록한다.

## Task 1: 메뉴 계약 및 그룹 순서 테스트

**Files:**
- Modify: `frontend/tests/document-link-sharing.test.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentActionsMenu.tsx`

- [ ] **Step 1: 결재 항목을 포함한 메뉴 테스트 작성**

`DocumentActionsMenu` 테스트에서 `approvalActions`에 `승인`, `반려` 콜백을 전달하고 메뉴 항목 순서를 `승인`, `반려`, `문서 공유하기`, `참조자 추가하기`, `문서 수정`, `삭제`로 기대한다. 첫 번째 separator가 `반려`와 `문서 공유하기` 사이에 있고 두 번째 separator가 `참조자 추가하기`와 `문서 수정` 사이에 있는지 검증한다. 기존 결재 항목이 없을 때에는 이전 공유·참조, 수정·삭제 메뉴 순서와 separator 동작이 유지되는지도 확인한다.

- [ ] **Step 2: 테스트 실행 및 실패 확인**

Run: `cd frontend; npm run test -- tests/document-link-sharing.test.tsx`

Expected: `DocumentActionsMenu`에 `approvalActions`가 없어 타입 오류 또는 새 메뉴 순서 기대가 실패한다.

- [ ] **Step 3: 메뉴 액션 타입과 첫 그룹 구현**

`DocumentActionsMenu.tsx`에 `{ label: string; onSelect: () => void; disabled?: boolean }` 항목 타입과 `approvalActions?: ...[]` prop을 추가한다. 메뉴 최상단에서 각 항목을 `MenuItem`으로 렌더링하고 클릭 시 `setAnchor(null)` 후 `onSelect()`를 호출한다. 목록이 비어 있지 않을 때만 결재 그룹 뒤에 `Divider`를 렌더링한다. 기존 공유/참조 그룹과 수정/삭제 그룹 사이 separator 조건은 유지한다.

- [ ] **Step 4: 메뉴 테스트 통과 확인**

Run: `cd frontend; npm run test -- tests/document-link-sharing.test.tsx`

Expected: 새 메뉴 순서/구분선/기존 공유 동작 테스트가 통과한다.

## Task 2: 피드와 상세 결재 액션 이동

**Files:**
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- Modify: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalToolbar.tsx`
- Modify: `frontend/tests/document-write-page.test.tsx`

- [ ] **Step 1: 툴바 비노출과 메뉴 노출 회귀 검증 갱신**

피드 결재자 테스트와 상세 결재자 테스트가 툴바에서 승인·반려·보완요청 버튼이 없는지 확인하게 한다. 더보기 메뉴를 연 다음 결재 항목이 공유보다 먼저 나오고, 권한 없는 상신 취소/승인 취소는 메뉴에 없는지 확인한다. 승인, 반려/보완요청 사유 입력, 상신 취소/승인 취소 및 확인 처리 테스트의 진입 동작은 `문서 더보기` 버튼을 누른 뒤 해당 `menuitem`을 선택하도록 갱신한다.

- [ ] **Step 2: 집중 테스트 실행 및 실패 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx tests/document-link-sharing.test.tsx`

Expected: 기존 툴바 버튼을 메뉴로 옮기기 전이므로 비노출/메뉴 진입 기대가 실패한다.

- [ ] **Step 3: 권한별 메뉴 액션 구성**

`DocumentApprovalDetailFeed.tsx`에서 기존 툴바 액션의 순서와 권한 조건을 유지하며 다음 항목을 구성한다: `canProcess`일 때 `승인`, `반려`, `보완요청`; `canConfirmFinal`일 때 `최종확인`; `canConfirmReference`일 때 `확인`; `canCancelSubmission`일 때 `상신 취소`; `canCancelApproval`일 때 `승인 취소`. 각 항목의 `onSelect`는 기존 `handleAction`, `openReasonDialog`, `handleFinalConfirmation`, `handleReferenceConfirmation`, 취소 확인 다이얼로그 상태 변경을 그대로 호출하며 `disabled`는 `isActing`을 따른다.

- [ ] **Step 4: 메뉴로 전달하고 툴바 액션 슬롯 제거**

위 목록을 기존 `DocumentActionsMenu`에 전달한다. `DocumentApprovalToolbar` 사용처에서 `approvalActions` JSX를 제거하고 해당 컴포넌트에서 사용하지 않는 prop 및 렌더 슬롯을 삭제한다. 상태 배지, 문서 종류, 상단 고정, 처리 의견 입력은 유지한다.

- [ ] **Step 5: 집중 테스트 통과 확인**

Run: `cd frontend; npm run test -- tests/document-write-page.test.tsx tests/document-link-sharing.test.tsx`

Expected: 메뉴 진입 후 기존 처리 함수가 호출되고, 피드/상세 툴바에서 결재 액션 버튼이 노출되지 않으며 테스트가 통과한다.

## Task 3: 빌드, 브라우저 검증, 결과 기록

**Files:**
- Create: `docs/result/20261111/document-approval-actions-menu/20261111_001_문서결재액션_더보기메뉴_결과.md`
- Create: `docs/result/20261111/document-approval-actions-menu/screenshots/`의 비식별 화면 증거

- [ ] **Step 1: 프론트엔드 빌드 확인**

Run: `cd frontend; npm run build`

Expected: TypeScript 및 Vite 빌드가 오류 없이 끝난다.

- [ ] **Step 2: 375px, 768px, 1280px 브라우저 확인**

현재 4173 서버가 사용 중이면 iPlusMES 화면인지 확인하고 재사용한다. 그렇지 않으면 `npm run dev -- --strictPort`로 시작한다. 비식별/합성 문서를 사용해 피드와 상세에서 더보기 메뉴를 열고 그룹 순서, 구분선, 좁은 화면에서의 잘림/겹침을 세 너비에서 확인한다. 직접 시작한 개발 서버만 테스트 후 종료한다.

- [ ] **Step 3: 결과 문서 작성**

변경 파일, 액션 그룹 순서, 실행한 Vitest/빌드 결과, 세 뷰포트 검증 결과와 스크린샷 경로를 결과 문서에 기록한다. 커밋은 생성하지 않는다.

## Self-review

- 상세 사양의 첫 결재 액션 그룹, 현재 툴바 순서, 조건별 노출, 두 구분선, 메뉴 닫기 후 기존 콜백, 기존 액션 처리 유지가 Task 1과 Task 2에 반영됐다.
- 툴바 상태/종류 배지, 고정, 처리 의견 보존은 Task 2에 명시했다.
- 테스트, 빌드, 세 브라우저 너비, 결과 기록은 Task 3에 포함했다.
- 결과 문서 경로는 날짜별 결과 규칙을 따른다. 사용자 요청이 없어 commit 단계는 두지 않는다.
