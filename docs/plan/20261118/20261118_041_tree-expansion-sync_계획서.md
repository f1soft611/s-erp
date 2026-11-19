# F1Tree 펼침 상태 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 현재 입력의 펼침 상태를 첫 commit에 맞추고 변경 콜백 의존성을 명확히 하여 F1Tree 경고 2개를 제거한다.

**Architecture:** expandedIds는 사용자 소유 state로 유지한다. 이전 allParentIds/defaultExpandAll을 state에 기록하고 정확한 기존 key 변경에서만 원래 Set 합집합 setter를 적용한다. onChangesChange는 다른 외부 콜백처럼 props에서 분리해 callback과 dependency가 같은 값을 참조한다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 대상과 근거

- 운영: `frontend\src\shared\components\f1-grid\tree\F1Tree.tsx`.
- 회귀: 기존 `frontend\tests\f1-tree.test.tsx`.
- 계약: `frontend\src\pages\f1-grid-docs\F1-GRID.md`.
- 기존 effect는 `[allParentIds, defaultExpandAll]` 변경 후 부모를 펼친다. 같은 rows의 flag 활성화 및 동일 내용 새 rows 참조가 사용자 접기 상태를 첫 commit에 남기는지 확인한다.
- gridProps 전체를 callback dependency로 추가하면 매번 생성되는 rest object 때문에 변경 콜백 identity가 불필요하게 바뀐다. callback만 구조 분해하고 JSX의 명시적 override는 유지한다.

## 실행

- [x] Profiler로 flag false→true와 동일 내용 새 rows 참조의 첫 commit에서 Child가 보이는지 it.each 회귀를 추가한다. 동일 입력 metadata 변경은 사용자 접기를 유지하고 실제 setCellValue는 최신 콜백에 전달되는 보존 회귀도 추가한다.

```tsx
it.each(['flag enabled', 'new rows reference'] as const)(
  'commits the current parent expansion when %s',
  (change) => {
    const commits: boolean[] = [];
    let observing = false;
    const tree = (nextRows: TreeRow[], expandAll: boolean) => (
      <Profiler id="tree-expansion" onRender={() => {
        if (observing) commits.push(screen.queryByText('Child') !== null);
      }}>
        <F1Tree rows={nextRows} columns={columns} rowKey="id" parentKey="parentId"
          treeColumn="name" defaultExpanded={[]} defaultExpandAll={expandAll} />
      </Profiler>
    );
    const { rerender } = render(tree(rows, change === 'new rows reference'));
    if (change === 'new rows reference') {
      fireEvent.click(screen.getByRole('button', { name: 'Root 접기' }));
    }
    expect(screen.queryByText('Child')).not.toBeInTheDocument();
    observing = true;
    rerender(tree(change === 'new rows reference' ? [...rows] : rows, true));
    expect(commits[0]).toBe(true);
    expect(screen.getByText('Child')).toBeInTheDocument();
  },
);
```

- [x] 테스트만 검증 workspace에 복사해 기존/보존 회귀는 통과하고 첫 commit 2개만 실패하는지 확인한다.
- [x] expandedIds 초기화 직후 이전 입력 state/guard를 추가하고 기존 effect를 제거한다. 원래 Set 합집합 본문을 유지한다.

```tsx
const [previousExpansionInputs, setPreviousExpansionInputs] = useState({
  allParentIds,
  defaultExpandAll,
});
if (
  previousExpansionInputs.allParentIds !== allParentIds ||
  previousExpansionInputs.defaultExpandAll !== defaultExpandAll
) {
  setPreviousExpansionInputs({ allParentIds, defaultExpandAll });
  if (defaultExpandAll && allParentIds.length > 0) {
    setExpandedIds((current) => {
      const next = new Set(current);
      allParentIds.forEach((rowId) => next.add(rowId));
      return next;
    });
  }
}
```

- [x] props 구조 분해에 `onChangesChange`를 추가하고 callback의 `gridProps.onChangesChange?.(changes)`/dependency만 `onChangesChange?.(changes)`/`onChangesChange`로 바꾼다.
- [x] UTC/worker 2로 tree, tree-projection, context-menu, form-modal, grid-docs, render-performance를 실행한다. `tsc -b`, `vite build`, `oxlint --format=json`으로 대상 2개만 제거됐는지 확인한다.
- [x] AST로 공개 props/JSX/기존 helper·state·다른 effect/기존 test를 비교하고 frontend 890파일 byte parity를 확인한다.
- [x] 실제 F1Tree/테마의 375/768/1280px에서 접기·metadata 보존·flag/rows 참조 재펼침, checkbox 전파·수정 콜백·하위 폼 취소/적용을 native로 확인한다. API/운영 데이터는 사용하지 않는다.
- [x] F1-GRID/결과·스크린샷과 정확한 040 CI 증거를 구분해 별도 커밋 단위로 정리한다. 비강제 푸시와 정확한 SHA의 CI는 Git/원격 실행 이력으로 확인한다.

별도 관찰: 최초 3단계 fixture의 손자 재노출은 변경하지 않은 기존 TreeProjection에서도 재현했다. 이 단위의 native 흐름은 부모/자식 2단계로 분리하고 기존 관찰·한계를 결과에 남겼으며 projection 수정으로 범위를 확대하지 않았다.
