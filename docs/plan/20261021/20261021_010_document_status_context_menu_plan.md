# Document Status Context Menu Implementation Plan

> **For agentic workers:** Use executing-plans for inline execution. Steps use checkbox syntax for tracking.

**Goal:** 문서현황 우클릭 메뉴를 복구하고 우클릭 상세 열기 및 행 변경 메뉴를 차단한다.

**Architecture:** F1Grid에 기본값 true인 `selectRowOnContextMenu` 옵션을 추가한다. 문서현황만 false로 설정하며 기존 메뉴 항목별 허용 옵션으로 행 변경 메뉴를 숨긴다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Playwright.

---

## Task 1: 실패 회귀 테스트

**Files:**
- Modify: `frontend/tests/document-status-page.test.tsx`
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`

- [x] 문서현황에서 셀에 `mouseDown({ button: 2 })`, `contextMenu({ button: 2 })`, `mouseUp({ button: 2 })`를 발생시킨다.
- [x] 상세 overlay 부재, 메뉴 및 엑셀 내보내기 존재, 행 변경·필터 메뉴 부재를 검증한다. 메뉴를 닫고 왼쪽 클릭 시 상세가 열리는지 검증한다.
- [x] F1Grid 옵션 false에서 기존 선택을 유지하고 우클릭한 셀 포커스와 메뉴를 제공하는지 검증한다. 기본값 true 동작을 기존 테스트로 보존한다.
- [x] 아래 명령으로 수정 전 테스트 실패를 확인한다.

```powershell
Set-Location frontend
npm run test -- tests\document-status-page.test.tsx tests\f1-grid-context-menu.test.tsx
```

## Task 2: 최소 구현

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/types/grid.types.ts`
- Modify: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- Modify: `frontend/src/shared/components/f1-grid/core/GridRow.tsx`
- Modify: `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`

- [x] `F1GridProps`에 `selectRowOnContextMenu?: boolean`을 추가하고 F1Grid에서 기본값 true로 받는다.
- [x] `selectRow`의 우클릭 경로와 `openContextMenu`의 `applySelection`에서 옵션 false일 때 행 선택 상태를 갱신하지 않는다. 셀 포커스 및 메뉴 대상 행 식별은 유지한다.
- [x] GridRow에서 오른쪽 버튼의 포커스/선택 처리 후 반환하여 좌클릭 드래그 선택을 시작하지 않는다. 가운데 버튼도 드래그 선택을 시작하지 않는다.
- [x] 문서현황에서 `disableContextMenu`를 제거하고 아래 옵션을 적용한다.

```tsx
selectRowOnContextMenu={false}
allowAddRowInContextMenu={false}
allowDuplicateRowInContextMenu={false}
allowDeleteRowInContextMenu={false}
canExportExcel
```

- [x] 관련 테스트를 다시 실행해 신규 회귀 및 선택 검증 7개 성공을 확인한다. 기존 실패는 결과 문서에 구분한다.

## Task 3: 문서 및 검증

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261021/document-status-context-menu/20261021_010_document_status_context_menu_result.md`

- [x] F1Grid 옵션 기본값, 우클릭 선택/포커스 의미, 문서현황 적용 사례를 문서화한다.
- [x] 관련 context-menu, 문서현황, F1Grid 기존 회귀 테스트와 `npm run build`를 실행한다. 기존 실패는 HEAD 비교로 분리했다.
- [x] 4173 기존 서버를 재사용하고 합성 데이터로 375px·768px·1280px에서 우클릭 메뉴, 상세 미표시, 좌클릭 상세 및 메뉴 기능을 검증한다.
- [x] 스크린샷과 결과 문서를 저장하고 `git diff --check`로 최종 확인한다. 요청하지 않은 커밋은 생성하지 않는다.

검증 명령의 npm 인자 전달 문제를 피하기 위해 최종 선택 실행은 기존 `node .\node_modules\vitest\vitest.mjs run`을 직접 사용했다. 상세 수치 및 공유 브라우저 검증의 제한은 [결과 문서](../../result/20261021/document-status-context-menu/20261021_010_document_status_context_menu_result.md)에 기록했다.
