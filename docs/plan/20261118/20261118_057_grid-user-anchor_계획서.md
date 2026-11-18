# F1Grid 사용자 편집 anchor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 사용자 편집 셀의 연결된 DOM을 명시적인 state 입력으로 게시하여 render ref 읽기를 제거하고 최초 편집 mount의 셀 기준 inset을 반영한다.

**Architecture:** GridCellInner의 기존 callback ref에서 user 편집일 때만 DOM state를 게시한다. 그 state를 기존 CellEditor prop에 전달한다. 일반 셀에는 state 게시를 추가하지 않으며 outer 이벤트 wrapper와 DOM 등록 호출은 보존한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, MUI, Orca.

## 1. 근거와 선택

이벤트 ref 전체를 layout effect로 일괄 이동하면 child DOM 등록 순서가 바뀔 수 있어 제외한다. 지연 DOM getter는 UserSelectEditor가 render에서 위치를 읽으므로 단순한 ref 읽기 은닉이 되어 제외한다. callback ref의 DOM state 게시를 선택하고 user 편집에만 제한한다.

**Modify:** `frontend/src/shared/components/f1-grid/core/GridCell.tsx`, `frontend/tests/f1-grid-render-performance.test.tsx`, `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

**Related:** `frontend/tests/f1-grid.test.tsx`, `frontend/tests/menu-management-f1-grid.test.tsx`.

- [x] 같은 3파일 기준선을 확인한다. 소스가 동일한 056 기준 274개다.
- [x] 실제 GridCell을 처음부터 user editing으로 mount하는 회귀를 추가한다. 테스트에서만 viewport 375/셀 left 100/입력 left 104의 DOM 측정값을 제공하고 실제 MUI popup의 셀 기준 x=100과 사용자 선택 callback을 확인한다. UserSelectEditor를 mock하지 않는다.
- [x] 기존 구현의 popup 위치 assertion 실패(expected 100 / actual 104)를 확인하고 lint ref 읽기 1개도 기록한다. MUI가 실제 폭을 inline 지정하므로 최초 jsdom 폭 0 assertion은 유효한 RED로 사용하지 않는다.

## 2. 구현

- [x] local anchor ref를 DOM state로 교체한다.

```tsx
const [userAnchorEl, setUserAnchorEl] = useState<HTMLElement | null>(null);
const handleCellRef = useCallback(
  (node: HTMLElement | null) => {
    if (column.type === 'user' && editing) setUserAnchorEl(node);
    onCellRef(node);
  },
  [column.type, editing, onCellRef],
);
```

- [x] `userAnchorEl={userAnchorEl}`로 전달한다. 다른 JSX/CSS, editor props/API, outer latestProps와 콜백 등록 호출은 변경하지 않는다.
- [x] F1-GRID 문서에 최초 편집 mount에서도 연결된 셀 기준 inset을 계산하며 일반 셀 render에는 DOM state 게시를 추가하지 않음을 기록한다.

## 3. 검증과 동기화

- [x] 같은 3파일 275개, typecheck/build/Oxc에서 새 진단 0과 ref 읽기 1개 제거(85 → 84)를 확인한다. 최초 tests/ 경로 selector는 2파일 220개만 포함하여 basename selector로 같은 3파일 전체를 다시 확인했다.
- [x] 일반 셀 성능과 키보드/선택 회귀를 보존하고 검증 workspace와 source 891파일 byte parity를 확인한다.
- [x] 새 소유 탭에서 실제 GridCell/UserSelectEditor의 최초 편집·선택·재진입을 375/768/1280px native 동작으로 확인한다. 모든 fetch와 영구 저장소를 차단한다. 초기/재진입 popup과 셀 x가 모두 일치, 선택 6회·요청 0.
- [ ] 결과와 스크린샷을 보관하고 정확한 056 CI 성공 후 allowlist 별도 커밋·비강제 푸시·원격 일치와 057 CI를 확인한다.
