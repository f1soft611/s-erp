# F1Grid 셀 commit 이벤트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Suspense 대기 render의 callback을 기존 셀 DOM에 노출하지 않고 commit 후 최신 이벤트를 사용한다.

**Architecture:** GridCell outer의 latestProps 대입만 useLayoutEffect로 옮긴다. DOM callback ref는 wrapper에 포함되지 않아 그대로 두며, 일반 편집 이벤트와 user anchor state는 변경하지 않는다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, Orca.

## 1. 근거와 RED

이벤트 wrapper를 제거하면 callback identity 변화가 memo 성능을 깨거나 이전 closure를 유지할 수 있어 제외한다. Cell과 달리 Row에는 child DOM 등록 callback이 포함되어 있으므로 함께 이동하지 않는다. 현재 표시·등록·memo를 보존하는 layout commit 갱신을 선택한다.

**Modify:** `frontend/src/shared/components/f1-grid/core/GridCell.tsx`, `frontend/tests/f1-grid-render-performance.test.tsx`, `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

**Related:** `frontend/tests/f1-grid.test.tsx`, `frontend/tests/menu-management-f1-grid.test.tsx`.

- [x] 소스가 동일한 057의 3파일 275개를 기준선으로 확인한다.
- [x] 실제 checkbox GridCell 뒤 sibling이 suspend하는 회귀를 추가한다. transition의 대기 render 시도를 확인한 뒤 기존 DOM checkbox를 클릭해 이전 callback만 호출하는지 assertion한다.

```tsx
await act(async () => { startTransition(() => rerender(view(true, true))); });
expect(attempted).toHaveBeenCalled();
expect(screen.queryByText('Updating cell')).not.toBeInTheDocument();
fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled 1' }));
expect(next).not.toHaveBeenCalled();
expect(committed).toHaveBeenCalledExactlyOnceWith(true);
rerender(view(true));
fireEvent.click(screen.getByRole('checkbox', { name: 'Enabled 1' }));
expect(next).toHaveBeenCalledExactlyOnceWith(true);
```

- [x] 기대 assertion의 실제 실패(next 0 기대/1 호출)를 확인한다. prop callback만 바꾼 commit에서는 기존 memo를 유지하면서 새 callback을 사용하는지도 같은 테스트에서 확인한다.

## 2. 구현

- [x] 필요한 import와 outer 대입만 변경한다.

```tsx
const latestProps = useRef(props);
useLayoutEffect(() => {
  latestProps.current = props;
});
```

- [x] F1-GRID 문서의 commit 이벤트 계약에 셀을 추가한다. inner JSX/CSS·memo·DOM callback·사용자 anchor와 다른 운영 코드는 유지한다.

## 3. 검증

- [x] basename selector의 같은 3파일 276개, typecheck/build/Oxc에서 새 진단 0과 ref 1개 제거(84 → 83)를 확인한다.
- [x] 기존 테스트 byte 보존·source/검증 workspace 891파일 parity와 직접 작은 diff 리뷰를 수행한다.
- [x] 실제 GridCell checkbox/텍스트 편집 fixture에서 대기 중 revision 0과 commit 후 revision 1의 native checkbox/입력 callback을 375/768/1280px로 확인한다. 네트워크/영구 저장소는 차단한다. callback 12회·요청 0.
- [x] 결과/스크린샷과 정확한 057 CI 근거를 보관한 뒤 allowlist 별도 커밋·비강제 푸시·원격 일치, 정확한 058 CI를 확인한다. `b32f93914629d088a223bdf93f89b3218b99ee86` / run `44362686887`, 227파일·2,691개, 4 job 성공.
