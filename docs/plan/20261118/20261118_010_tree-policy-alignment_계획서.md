# Tree policy alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최신 사양에 따라 트리 정렬·필터 비활성화를 검증하고 운영 변경 없이 구형 회귀 두 개를 정정한다.

**Architecture:** F1Tree와 F1Grid 운영 코드를 그대로 유지한다. 기본 props와 명시적 false props에서 헤더·본문 메뉴가 모두 계층 보호 정책을 지키는지 같은 회귀를 실행한다. 기존 일반 F1Grid 해제 테스트는 유지한다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

## 근거와 범위

- [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)의 재개 지시.
- [20261014 공통 Grid 사양 §6](../../spec/20261014/20261014_002_f1_grid_docs_overhaul_사양서.md): Tree는 기본 Grid 정렬·필터를 비활성화한다.
- 20260909 사양만 근거로 운영 회귀라고 판정했던 사양 006의 판단을 최신 문서에 따라 정정한다. 과거 실패 실행 증거는 변경하지 않는다.
- 새 정렬·필터 API, 계층 query, 의존성 변경, 스크린샷용 운영 변경은 하지 않는다.

### Task 1: 계약 정정과 실패 증거

**Files:**
- Modify: `docs/spec/20261118/20261118_006_grid-context-recovery_상세사양서.md`
- Create: `docs/spec/20261118/20261118_010_tree-policy-alignment_상세사양서.md`
- Modify: `frontend/tests/f1-grid-context-menu.test.tsx`

- [x] 원래 두 실패가 전체 실행에서 실제 정렬/필터 메뉴 탐색 실패였음을 기존 `final-frontend-locked.json`으로 확인한다.
- [x] 사양 010에 최신 사양 우선, 기본·명시적 false 모두 비활성, 데이터·펼침 상태 보존을 기록한다.
- [x] 기존 두 구형 테스트를 다음 두 정책으로 실행되는 계층 보호 테스트로 대체한다. 기본 케이스와 명시적 false 케이스를 모두 검증하며 일반 Grid 해제 회귀는 삭제하지 않는다.

```tsx
it.each([
  { policy: 'default props', props: {} },
  {
    policy: 'explicit false props',
    props: { disableSorting: false, disableFiltering: false },
  },
])('preserves tree query protection with $policy', ({ props }) => {
  render(
    <F1Tree
      {...props}
      rows={[
        { id: 'root', parentId: null, name: 'Zulu', order: 1 },
        { id: 'alpha', parentId: 'root', name: 'Alpha', order: 2 },
        { id: 'beta', parentId: 'root', name: 'Beta', order: 1 },
      ]}
      columns={treeColumns}
      rowKey="id"
      parentKey="parentId"
      treeColumn="name"
      getRowOrder={(row) => row.order}
      ariaLabel="계층 보호 테스트 트리"
    />,
  );
  const grid = screen.getByRole('grid', { name: '계층 보호 테스트 트리' });
  const names = () =>
    within(grid).getAllByRole('gridcell').map((cell) => cell.textContent);
  expect(names()).toEqual(['Zulu', 'Beta', 'Alpha']);
  fireEvent.click(screen.getByRole('button', { name: '이름 컬럼 메뉴' }));
  expect(screen.getByRole('menu')).toBeVisible();
  for (const name of ['오름차순 정렬', '내림차순 정렬', '필터']) {
    expect(screen.queryByRole('menuitem', { name })).not.toBeInTheDocument();
  }
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  fireEvent.contextMenu(getGridBody('계층 보호 테스트 트리'));
  expect(screen.getByRole('menu')).toBeVisible();
  for (const name of ['정렬 해제', '필터 해제']) {
    expect(screen.queryByRole('menuitem', { name })).not.toBeInTheDocument();
  }
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  expect(names()).toEqual(['Zulu', 'Beta', 'Alpha']);
});
```

### Task 2: 최소 검증과 결과

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/result/20261118/repository-remediation/20261118_010_tree-policy-alignment_결과.md`

- [x] 사용 문서의 “미해결 회귀 2개” 설명을 최신 사양의 계층 보호 계약으로 정정하고 후속 사양에 연결한다.
- [x] 소유 검증 worktree에 변경 테스트·사용 문서만 복사한다. 패키지 설치와 공유 서버는 변경하지 않는다.
- [x] 검증 worktree의 `frontend`에서 아래 명령을 실행한다. 결과: 63/63 통과, 제외 없음.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\f1-grid-context-menu.test.tsx tests\f1-tree.test.tsx tests\f1-tree-projection.test.ts --pool=threads --maxWorkers=1 --reporter=default --no-color
```

- [x] F1Tree/F1Grid 소스의 root·검증 worktree hash 일치와 운영 무변경을 확인한다.
- [x] 결과에 과거 2개 실패 원인, 최신 사양 근거, 새 검증 수와 운영·UI 무변경을 기록한다. 테스트·문서 전용이므로 신규 스크린샷은 해당 없음이다.
- [x] 커밋·푸시하지 않는다. 다음 독립 단계인 문서작성 지연 테스트를 조사한다.
