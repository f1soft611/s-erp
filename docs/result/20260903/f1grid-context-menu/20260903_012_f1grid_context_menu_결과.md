# F1-Grid 우클릭 컨텍스트 메뉴 플러그인 구현 결과

## 관련 문서

- 작업지시서: [20260903*012_f1grid_context_menu*작업지시서.md](../../../directions/20260903/20260903_012_f1grid_context_menu_작업지시서.md)
- 계획서: [20260903*012_f1grid_context_menu*계획서.md](../../../plan/20260903/20260903_012_f1grid_context_menu_계획서.md)
- 사양서: [20260903*012_f1grid_context_menu*사양서.md](../../../spec/20260903/20260903_012_f1grid_context_menu_사양서.md)
- 가이드 문서 갱신: [frontend/src/pages/f1-grid-docs/F1-GRID.md](../../../frontend/src/pages/f1-grid-docs/F1-GRID.md) 25번 섹션

## 요약

F1-Grid 바디 영역 우클릭 시 커서 위치에 컨텍스트 메뉴를 표시하는 플러그인을 신규 구현했다. 엑셀 내보내기(.xlsx), 컬럼 길이 자동 조정, (F1Tree 전용) 루트 추가, 행 추가/복사/삭제, 필터/정렬 해제, 설정을 기본값으로 복원 항목을 제공한다. 메뉴관리 화면(F1Tree)의 그리드 바깥 `루트 메뉴 추가`/`하위 메뉴 추가` 툴바 버튼은 제거하고 동일 기능을 컨텍스트 메뉴로 대체했다.

## 주요 변경 사항

### 프론트엔드 — F1-Grid 코어

- `frontend/src/shared/components/f1-grid/types/grid.types.ts`: `F1GridProps`에 `canExportExcel`, `excelFileName`, `treeContextMenu` 추가, `F1GridContextMenuTreeConfig` 타입 신설.
- `frontend/src/shared/components/f1-grid/export/GridExcelExport.ts` (신규): `exceljs`를 클릭 시점에 동적 로딩해 `.xlsx` 파일을 생성/다운로드하는 `exportGridRowsToExcel` 유틸.
- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 바디 영역 `onContextMenu` 핸들러, MUI `Menu` 기반 컨텍스트 메뉴 렌더링, 각 메뉴 항목 동작(엑셀 내보내기/컬럼 자동조정/행 추가·복사·삭제/필터·정렬 해제/설정 기본값 복원) 구현.
- `frontend/src/shared/components/f1-grid/core/GridRow.tsx`: 행 wrapper에 `data-f1-grid-row-id` 속성 추가(컨텍스트 대상 행 판별용).
- `frontend/src/shared/components/f1-grid/tree/F1Tree.tsx`: `treeContextMenu`(`onAddRoot`, `onAddChild`)를 내부적으로 구성해 `F1Grid`에 전달.
- `frontend/package.json`: `exceljs` 의존성 추가.

### 프론트엔드 — 메뉴관리 화면

- `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx`: `루트 메뉴 추가`/`하위 메뉴 추가` 툴바 버튼, `addChildMenu`, `hasSelectedTreeRow` 상태 제거. `canExportExcel`/`excelFileName`을 `F1Tree`에 연결.
- `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`: 페이지 레벨 `pageActionPermissions.excel`을 `MenuManagementPanel`의 `canExportExcel`로 전달.

### 문서

- `frontend/src/pages/f1-grid-docs/F1-GRID.md` 25번 "Grid Context Menu" 섹션을 실제 구현 내용으로 갱신하고 "⚠️ 아직 미구현" 표시를 제거(단, 화면별 Custom Menu 확장은 계속 미구현으로 표시).

### 보안 관련 의사결정

- 사양서 초안에는 npm `xlsx`(SheetJS) 채택이 명시되어 있었으나, 구현 단계에서 해당 패키지가 npm 배포판 기준 미패치 상태의 **High 심각도** 취약점(Prototype Pollution `GHSA-4r6h-8v6p-xvw6`, ReDoS `GHSA-5pgg-2g8v-p4x9`)을 가진 것을 확인했다. OWASP 보안 요구사항에 따라 해당 패키지를 채택하지 않고, 동일 목적을 수행하며 취약점이 없는 `exceljs`로 대체했다(계획서/사양서도 함께 갱신).

## 테스트

- 신규: `frontend/tests/f1-grid-context-menu.test.tsx` (11개 테스트) — 바디/헤더 우클릭 동작, 엑셀 항목 노출 조건, 트리 전용 루트 추가, 행 추가(자식/루트) 대상 판별, 행 삭제 대상 선택, 필터/정렬 해제 비활성화 조건, 설정 기본값 복원.
- 갱신: `frontend/tests/menu-management-f1-grid.test.tsx` — 제거된 툴바 버튼 참조를 컨텍스트 메뉴 흐름(우클릭 + 메뉴 클릭)으로 교체.
- 실행 결과: `npm run test -- tests/f1-grid-context-menu.test.tsx` 11/11 통과, `npm run test -- tests/menu-management-f1-grid.test.tsx` 43/45 통과(나머지 2건은 이번 작업과 무관한 기존 결함, 아래 "회귀 검증" 참고).
- `npm run build` 성공(TypeScript 컴파일 + Vite 빌드).

## 회귀 검증(기존 결함 확인)

전체 프론트엔드 테스트(`npm run test`)를 이번 작업 전/후로 비교했다.

- 작업 전(기존 작업공간 상태, git stash로 확인): 6개 파일 실패, 36개 테스트 실패, 207개 통과.
- 작업 후: 7개 파일 실패(신규 테스트 파일 1개 추가로 카운트 증가), 29~30개 테스트 실패, 213~214개 통과.

`frontend/tests/menu-management-f1-grid.test.tsx`의 다음 2개 테스트는 `git stash`로 이번 작업 변경분을 모두 되돌린 원본 상태에서도 동일하게 실패함을 확인했다(이번 작업과 무관한 기존 결함):

- `resets dirty cell state and removes unsaved rows when the module is reloaded`
- `shows a menu reload error while retaining local visible changes`

`f1-grid.test.tsx`, `f1-tree.test.tsx`, `dashboard-sidebar.test.tsx`, `f1-grid-test-page.test.tsx`, `menu-permissions.test.ts`, `theme-settings.test.tsx`의 실패 역시 이번 작업 범위 밖의 기존 실패로, 변경 전/후 실패 파일 목록이 동일함을 확인했다.

## 스크린샷

- [f1grid-context-menu-tree-row.png](screenshots/f1grid-context-menu-tree-row.png): 메뉴관리 화면(F1Tree)에서 `메뉴관리` 행을 우클릭했을 때 표시되는 컨텍스트 메뉴(`루트 추가`, `행 추가`, `행 복사`(비활성화), `행 삭제`, `설정을 기본값으로 복원`). 캡처 시 사용한 목업 데이터의 활성 권한 카탈로그에는 `EXCEL`이 포함되어 있으나, 대시보드 실사용자 메뉴 트리(`/api/v1/menus/my`)를 모킹하지 않아 페이지 레벨 `canExportExcel` 계산 결과가 `false`로 떨어져 `엑셀 내보내기` 항목은 이 캡처에서 보이지 않는다. `canExportExcel`에 따른 표시/숨김 동작 자체는 `frontend/tests/f1-grid-context-menu.test.tsx`의 단위 테스트로 검증했다.

## 남은 작업 / 제외 범위

- 화면별 Context Menu Custom 확장(사용자 정의 메뉴 항목 추가)은 이번 범위에서 제외했다(문서에도 `⚠️ 아직 미구현`으로 표시).
- `그룹 해제`는 F1-Grid에 Grouping 기능이 없어 제외했다.
- `resets dirty cell state...`, `shows a menu reload error...` 2건의 기존 결함은 이번 작업 범위 밖이므로 별도 작업지시서로 분리해 처리가 필요하다.

