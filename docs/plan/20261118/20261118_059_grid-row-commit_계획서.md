# F1Grid 행 commit 이벤트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 행의 대기 callback 노출을 막고 child 셀 등록은 현재 commit의 callback으로 유지한다.

**Architecture:** 이벤트 latestProps는 layout commit에 갱신한다. onCellRef/onEditingCellRef 두 wrapper만 제거해 이미 존재하는 raw props가 inner에 전달되게 한다. 기존 comparator와 이벤트 wrapper identity는 유지한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, Orca.

## 1. 근거와 RED

단순히 전체 wrapper를 layout으로 옮기면 child DOM ref 등록이 부모 effect보다 먼저 실행되어 이전 등록 callback을 읽는다. 전체 callback을 비교하면 기존 memo 격리를 깨므로 제외한다. render용 헤더 getter를 분리했던 것처럼 DOM commit callback과 사용자 이벤트를 분리한다.

**Modify:** `frontend/src/shared/components/f1-grid/core/GridRow.tsx`, `frontend/tests/f1-grid-render-performance.test.tsx`, `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

**Related:** `frontend/tests/f1-grid.test.tsx`, `frontend/tests/menu-management-f1-grid.test.tsx`.

- [x] 소스가 동일한 058의 3파일 276개를 기준선으로 확인한다.
- [x] 실제 GridRow helper를 추가한다. checkbox 컬럼 1개·행 1개·등록/이벤트 spy와 순수 getter를 기존 필수 props로 제공한다.
- [x] Suspense 회귀에서 pending render를 확인한 뒤 행 선택 checkbox를 클릭해 이전 callback만 호출하는 assertion이 기존 코드에서 실패하는지 확인한다.

```tsx
fireEvent.click(within(screen.getByLabelText('1 행 선택')).getByRole('checkbox'));
expect(next).not.toHaveBeenCalled();
expect(committed).toHaveBeenCalledExactlyOnceWith('1', true);
rerender(view(true));
fireEvent.click(within(screen.getByLabelText('1 행 선택')).getByRole('checkbox'));
expect(next).toHaveBeenCalledExactlyOnceWith('1', true);
```

- [x] 별도 보존 회귀에서 rowHeight와 등록 callbacks를 함께 바꾼다. 실제 child node가 새 callback으로 등록되고 편집 ref도 새 callback을 사용하며 unmount 후 같은 cache가 비워지는지 확인한다. 이 회귀는 기존 구현에서도 통과함을 기록한다.

## 2. 구현

- [x] 이벤트 ref 대입만 layout commit으로 옮긴다.

```tsx
const latestProps = useRef(props);
useLayoutEffect(() => {
  latestProps.current = props;
});
```

- [x] handlers의 onCellRef/onEditingCellRef 두 항목만 제거한다. `<MemoizedGridRow {...props} {...handlers} ... />`의 raw props 전달을 그대로 사용한다. comparator와 내부 JSX는 변경하지 않는다.
- [x] F1-GRID 문서에 행 이벤트 commit과 child DOM 등록 분리를 기록한다.

## 3. 검증

- [x] 같은 3파일 278개·typecheck/build/Oxc에서 새 진단 0, refs 1 → 0, 전체 83 → 82를 확인한다.
- [x] 단순 layout 이동만으로는 새 등록 보존 회귀가 실패함을 검증 workspace에서 확인한 뒤 올바른 소스로 복원한다. 모든 기존 테스트 byte와 frontend source 891파일 parity를 확인한다.
- [x] 새 탭의 실제 GridRow에서 375/768/1280px pending/commit 행 선택·checkbox 변경과 등록 cache/편집 ref, unmount cleanup을 native 흐름으로 확인한다. 모든 fetch/영구 저장소 접근은 차단한다. callback 12회·요청 0.
- [x] 결과/스크린샷·정확한 058 CI 근거를 보관하고 allowlist 커밋·비강제 푸시·원격 일치와 정확한 059 CI를 확인한다. `44e054cf219923692ca5527ae1a275512ebbbd46`, run `44364157785`: 227파일 2,693개와 네 job 성공.
