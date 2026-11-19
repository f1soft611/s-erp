# Grid 문서 검색 선택 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 문서 검색 결과와 현재 문서의 불일치를 첫 commit 전에 보정하고 기존 검색·앵커·예제 상태를 보존한다.

**Architecture:** selectedId는 사용자 소유 state로 유지한다. 기존 effect의 순수 조건을 render의 guarded own-state 조정으로 옮기고 DOM/API anchor effect와 이벤트·JSX는 그대로 둔다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 대상

- 운영: `frontend\src\pages\f1-grid-docs\F1GridDocsPage.tsx`.
- 회귀: `frontend\tests\f1-grid-docs.test.tsx`.
- 계약: `frontend\src\pages\f1-grid-docs\F1-GRID.md`.

## 실행

- [x] Profiler 안의 실제 포털에서 API 전용 식별자 검색의 첫 commit에 API 참조 heading이 보이는지 회귀를 추가한다.

```tsx
const commits: boolean[] = [];
let observing = false;
render(
  <Profiler id="docs-search" onRender={() => {
    if (observing) commits.push(screen.queryByRole('heading', {
      name: getF1GridDoc('api-reference').title,
    }) !== null);
  }}>
    <F1GridDocsPage />
  </Profiler>,
);
observing = true;
fireEvent.change(screen.getByRole('textbox', { name: '문서 검색' }), {
  target: { value: 'F1GridUserOption.positionName' },
});
expect(commits[0]).toBe(true);
```

- [x] 현재 API 문서가 rowHeight 검색에 포함되면 유지되는 회귀와, Row Height 예제를 조절한 뒤 결과 0개/검색 해제에서 예제 상태를 유지하는 회귀를 추가한다.
- [x] 테스트만 검증 workspace에 복사해 첫 commit만 의도한 RED이고 기존·보존 회귀가 통과하는지 확인한다.
- [x] filteredDocs 다음, doc 계산 이전의 선택 effect를 다음 guard로 대체한다. setter 조건/선택값 이외의 동작은 바꾸지 않는다.

```tsx
if (
  filteredDocs.length > 0 &&
  !filteredDocs.some((item) => item.id === selectedId)
) {
  setSelectedId(filteredDocs[0].id);
}
```

- [x] UTC/worker 2로 docs와 render-performance 회귀를 실행한다. `tsc -b`, `vite build`, `oxlint --format=json`으로 대상 effect-state 1개만 제거됐는지 확인한다.
- [x] AST로 공개 props/JSX/문서 데이터 참조/전체 기존 state·helper·이벤트/앵커 effect·기존 test 보존과 frontend 890파일 byte parity를 확인한다.
- [x] 실제 포털 375/768/1280px에서 결과 선택/0개/해제/문서 메뉴/목차/API 검색·반복 앵커와 light/dark를 확인한다. local Playground만 사용하고 공유 서버를 변경하지 않는다.
- [x] F1-GRID/결과·스크린샷과 정확한 041 CI 증거를 구분해 보관한 뒤 별도 커밋·비강제 푸시한다.
