# F1-Grid 컨텍스트 메뉴 외부 클릭 재오픈 버그 수정 결과

## 작업 배경

`docs/directions/20260903/20260903_012_f1grid_context_menu_작업지시서.md` 범위의 연장 작업으로, 실제 브라우저에서 다음 문제가 재현되었다.

- 그리드 셀을 우클릭해 컨텍스트 메뉴를 연 뒤, 그리드 밖(검색 조건 영역, 브레드크럼, 다른 카드 등)을 다시 우클릭하면 메뉴가 닫히지 않고 클릭한 위치에 다시 열렸다.
- 요청 사항: 메뉴가 열려 있으면 항상 먼저 닫고, 클릭 위치가 실제 그리드 영역일 때만 메뉴를 열며, 셀 영역이면 해당 셀이 선택된 뒤 메뉴가 열려야 한다.

## 원인 분석 (systematic-debugging)

Playwright로 실제 개발 서버(`http://127.0.0.1:4174`)에 로그인한 뒤 권한관리 화면에서 재현했다.

1. 셀 우클릭 → 메뉴 정상 오픈 확인.
2. 메뉴가 열린 상태에서 그리드 바깥의 빈 영역(좌표 900,110)을 우클릭 → 새로운 메뉴가 그 위치에 다시 열리는 것을 확인(버그 재현).
3. `document.addEventListener('contextmenu', ..., true)`로 실제 이벤트 타깃을 로깅한 결과, 두 번째 클릭의 `event.target`이 `DIV.MuiBackdrop-root MuiBackdrop-invisible MuiModal-backdrop`으로 나타났다.
4. MUI `Menu`(Popover/Modal 기반)는 열려 있는 동안 전체 화면을 덮는 투명 백드롭을 렌더링한다. 이 백드롭은 실제 DOM에서는 `document.body`에 포탈되지만, **React 이벤트 버블링은 실제 DOM이 아니라 React 컴포넌트(파이버) 트리를 따른다.** `<Menu>`가 JSX 상 그리드 `<Box role="grid" onContextMenu={openContextMenu}>`의 자식이므로, 백드롭에서 발생한 `contextmenu` 이벤트가 그리드의 `onContextMenu` 핸들러까지 버블링되어 그리드 바깥 클릭임에도 `openContextMenu`가 다시 호출됐다.
5. `jsdom` 기반 Vitest 테스트는 실제 레이아웃/버블링(포탈, z-index, hit-testing)을 재현하지 않아 기존 자동화 테스트에서는 이 문제가 드러나지 않았다(`fireEvent.contextMenu`가 지정한 엘리먼트에 직접 이벤트를 디스패치하기 때문).

## 수정 내용

파일: `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`

1. `openContextMenu`에 그리드 컨테이너의 `getBoundingClientRect()`와 클릭 좌표(`event.clientX/clientY`)를 비교하는 기하학적 경계 검사를 추가했다. 클릭 좌표가 그리드 영역 밖이면 즉시 `closeContextMenu()`만 호출하고 새 메뉴를 열지 않는다.
2. `<Menu>`의 `slotProps={{ backdrop: { sx: { pointerEvents: 'none' } } }}`를 추가해, 메뉴가 열려 있는 동안에도 클릭이 백드롭이 아닌 실제 화면 요소(그리드 내부 셀 또는 그리드 바깥 요소)에 도달하도록 했다. 외부 클릭 감지는 기존에 추가된 `document`의 `mousedown` 리스너가 담당한다.

이 두 가지 수정으로:

- 그리드 바깥을 좌/우클릭하면 열려 있던 메뉴가 항상 닫히고 새로 열리지 않는다.
- 그리드 내부(바디 여백 또는 셀)를 다시 우클릭하면 기존 메뉴가 닫히고, 새로 클릭한 대상이 먼저 선택된 뒤 그 위치에 메뉴가 다시 열린다(기존 rebind 동작 유지).

## 문서 갱신

- `frontend/src/pages/f1-grid-docs/F1-GRID.md`의 "25. Grid Context Menu" 절에 컨텍스트 메뉴 닫힘/재오픈 규칙과 백드롭 이벤트 버블링 원인을 추가했다.

## 검증

### 실제 브라우저(Playwright, 개발 서버) 재현 및 검증

- 로그인 → 환경설정 → 권한관리 화면 진입 후 우클릭 시나리오를 직접 재현했다.
- 수정 전: 그리드 밖 우클릭 시 새 메뉴가 그 위치에 다시 열림(버그 재현, `countAfterOutsideRightClick: 1`, 백드롭 타깃 로그 확인).
- 수정 후:
  - 셀 우클릭 → 메뉴 오픈(`step1_visible: true`)
  - 그리드 밖 우클릭 → 메뉴 닫힘, 재오픈 없음(`step2_visible: false`)
  - 다른 셀 우클릭 → 새 위치에 메뉴 재오픈(`step3_visible: true`, 해당 셀 위치와 일치)
  - 그리드 밖 좌클릭 → 메뉴 닫힘(`step4_visible: false`)

### 자동화 테스트

```
cd frontend
npm run test -- tests/f1-grid-context-menu.test.tsx
```

결과: 1 test file passed, 13/13 tests passed.

```
npm run test -- tests/menu-management-f1-grid.test.tsx
```

결과: 47개 중 4개 실패. `git stash`로 `F1Grid.tsx` 변경분만 제외하고 동일 명령을 재실행해도 동일하게 4개가 실패해, 이번 수정과 무관한 기존(pre-existing) 실패임을 확인했다(테넌트/권한 관련 화면 로직 이슈로 별도 범위).

```
npm run test -- tests/role-management-notification.test.tsx
```

결과: 17개 중 3개 실패(`RoleManagementPage.tsx`의 `selectedModuleId is not defined` 참조 오류로 인한 기존 결함). 동일하게 `F1Grid.tsx` 변경분을 제외하고 재실행해도 동일하게 3개가 실패해, 이번 수정과 무관함을 확인했다.

## 범위 및 후속 과제

- 이번 수정은 F1-Grid 공용 컴포넌트(`F1Grid.tsx`)에만 적용되며, 이를 사용하는 모든 화면(권한관리, 메뉴관리 등)에 동일하게 적용된다.
- `menu-management-f1-grid.test.tsx`의 4건, `role-management-notification.test.tsx`의 3건 실패는 이번 작업 범위 밖의 기존 결함으로, 별도 작업지시서로 다뤄야 한다.
