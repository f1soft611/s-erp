# F1Grid 헤더 commit 이벤트 바인딩 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 헤더는 commit된 이벤트만 사용하고 checkbox 표시는 현재 render 입력으로 계산하며 기존 memo 격리를 보존한다.

**Architecture:** GridHeader의 latestProps 대입은 useLayoutEffect로 옮긴다. getColumnCheckboxState는 지연 이벤트 wrapper에서 제외하고 현재 prop을 전달한다. memo comparator는 기존 shallow 비교와 같되 기존에도 안정적 wrapper였던 getter identity만 제외한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, 실제 GridHeader/F1Grid, Orca.

---

[작업지시서](../../directions/20261118/20261118_056_grid-header-commit_작업지시서.md)에 따라 현재 세션에서 직접 진행한다.

## 1. 기준선과 RED

**Modify:** `frontend/src/shared/components/f1-grid/core/GridHeader.tsx`, `frontend/tests/f1-grid-render-performance.test.tsx`, `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

**Related:** `frontend/tests/f1-grid.test.tsx`, `frontend/tests/menu-management-f1-grid.test.tsx`.

- [x] UTC/threads/maxWorkers 2에서 기존 성능/통합을 실행한다. 기존 basename selector가 메뉴관리 통합도 포함해 실제 기준선은 3파일·272개이며 같은 3파일을 후속 검증한다.
- [x] 기존 성능 파일에 실제 GridHeader를 직접 구성하는 helper를 추가한다. checkbox 컬럼 1개·행 1개·multiSelect와 기존 필수 props를 제공하며 표시 입력 객체들은 재렌더 간 재사용한다.
- [x] Suspense 회귀를 추가하고 수정 전에 확인한다.

```tsx
const pending = new Promise<void>(() => undefined);
function SuspendUpdate({ blocked }: { blocked: boolean }) {
  if (blocked) {
    attempted();
    throw pending;
  }
  return null;
}
const view = (useNext = false, blocked = false) => (
  <Suspense fallback={<span>Updating header</span>}>
    <GridHeader {...props} onToggleAllRows={useNext ? next : committed} />
    <SuspendUpdate blocked={blocked} />
  </Suspense>
);
const { rerender } = render(view());
await act(async () => { startTransition(() => rerender(view(true, true))); });
expect(attempted).toHaveBeenCalled();
expect(screen.queryByText('Updating header')).not.toBeInTheDocument();
fireEvent.click(within(screen.getByLabelText('전체 행 선택')).getByRole('checkbox'));
expect(next).not.toHaveBeenCalled();
expect(committed).toHaveBeenCalledTimes(1);
rerender(view(true));
fireEvent.click(within(screen.getByLabelText('전체 행 선택')).getByRole('checkbox'));
expect(next).toHaveBeenCalledTimes(1);
```

- [x] 별도 보존 회귀에서 callback/getter identity만 바꿀 때 checkbox getter를 다시 계산하지 않고, rows가 바뀐 render에서는 새 getter 결과를 바로 표시하는지 확인한다. 기존 구현에서 통과함을 명시한다.
- [x] Header ref lint 진단 0 assertion이 기존 1개로 실패하는 RED를 보관한다.

## 2. 구현

- [x] useLayoutEffect를 import하고 outer GridHeader의 대입만 옮긴다.

```tsx
const latestProps = useRef(props);
useLayoutEffect(() => {
  latestProps.current = props;
});
```

- [x] handlers 객체에서 getColumnCheckboxState wrapper 1개만 제거한다. 나머지 이벤트 wrapper와 optional onReorderColumn 존재 조건은 유지한다.
- [x] 기존 memo 호출에 아래 comparator를 적용한다. 키 존재 여부까지 비교해 기본 shallow 비교 의미를 유지한다.

```tsx
function areGridHeaderPropsEqual<T extends object>(
  previous: Readonly<GridHeaderProps<T>>,
  next: Readonly<GridHeaderProps<T>>,
) {
  const keys = Object.keys(previous) as Array<keyof GridHeaderProps<T>>;
  return keys.length === Object.keys(next).length &&
    keys.every((key) =>
      Object.prototype.hasOwnProperty.call(next, key) &&
      (key === 'getColumnCheckboxState' || Object.is(previous[key], next[key])),
    );
}
const MemoizedGridHeader = memo(GridHeaderInner, areGridHeaderPropsEqual) as typeof GridHeaderInner;
```

getter는 F1Grid의 현재 visibleRows/column으로 계산되는 순수 render 함수다. rows/columns는 그대로 비교하므로 값 변경은 표시되고, 함수 identity만 바뀐 편집 draft는 이전처럼 헤더를 다시 만들지 않는다.

- [x] F1-GRID 문서의 성능 계약에 commit된 헤더 이벤트와 현재 render용 getter의 분리를 기록한다. 헤더 내부 JSX/CSS·메뉴 상태/표시 및 공개 props는 변경하지 않는다.

## 3. 검증·동기화

- [x] 같은 3파일·typecheck/build/Oxc에서 대상 ref 1개 제거·새 진단 0을 확인한다.
- [x] source/AST 대조로 헤더 내부 JSX/CSS/필터·메뉴·리사이즈 본문 및 GridRow/GridCell 불변, 기존 테스트 byte 보존과 frontend byte 차이 0을 확인한다.
- [x] 새 소유 탭에서 실제 헤더 checkbox 값을 확인하고, transition이 대기 중이면 기존 callback·commit 후에는 새 callback을 사용하는지 375/768/1280px native 동작으로 검증한다. 영구 저장소/네트워크를 차단하고 결과·스크린샷을 저장한다.
- [x] 결과를 작성한다. 055 정확한 SHA 전체 CI 완료 뒤 allowlist 커밋·비강제 푸시·원격 일치를 확인한다. 056 전체 CI도 정확한 SHA로 별도 확인한다. `58a933bb11918d7374978ffa906a36db8a976403` / run `44358784437`, 227파일·2,689개, 4 job 성공.
