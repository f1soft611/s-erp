# Router DOM stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실제 전체 CI에서 확인한 dashboard alias 전환 중 분리 heading 단언을 제품 변경 없이 안정화한다.

**Architecture:** 실제 AppRouter·Dashboard·메뉴 응답·탐색 경로를 그대로 둔다. findByRole이 반환한 노드를 await 경계 너머에서 단언하지 않고 waitFor callback마다 현재 heading을 재조회하여 표시를 함께 검사한다.

**Tech Stack:** React Router, Testing Library, Vitest, GitHub Actions.

---

### Task 1: RED와 소유 책임 확인

- [x] d7e5e233의 원격 run 44248961094는 2,640/2,641 통과, app-router-not-found의 dashboard root 한 사례만 실패했다. lint/typecheck/build는 성공했다.
- [x] 오류는 heading이 document에서 제거되어 toBeVisible이 실패한 것이다. DashboardPage의 root alias effect는 메뉴 도착 후 첫 메뉴로 navigate한다. 같은 파일의 quality 사례는 이미 현재 DOM을 callback마다 조회한다.

### Task 2: 최소 수정

**Files:** `frontend/tests/app-router-not-found.test.tsx`.

- [x] 마지막 heading 대기만 다음으로 바꿨다. 원래 timeout 5초와 모든 단언·실제 메뉴 fetch·라우터를 보존한다.

```tsx
await waitFor(
  () => expect(screen.getByRole('heading', { name: '종합현황' })).toBeVisible(),
  { timeout: 5000 },
);
```

### Task 3: 검증과 동기화

- [x] 해당 파일 전체를 UTC/2 workers에서 실행해 8/8 통과했다. lint exit 0이며 기존 source skip·retry·timeout 설정은 바꾸지 않았다.
- [ ] lint와 diff 공백을 확인하고 작업별 커밋·non-force push한다.
- [ ] 정확한 새 코드 커밋의 전체 원격 CI를 확인한다. 2,640/2,641 RED를 소급해 통과로 바꾸지 않는다.
- [ ] 결과 019와 선행 결과 017/018의 후속 링크·상태를 실제 결과로 갱신하고 동기화한다.
