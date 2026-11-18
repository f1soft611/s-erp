# Common code picker memo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상위 그룹 선택 callback을 실제 사용하는 primitive 의존성으로 좁혀 메모이제이션 진단 두 개를 제거한다.

**Architecture:** 부모 객체 검색은 그대로 둔다. 검색 결과에서 동일한 ID 문자열을 추출하고 null을 부모 부재 표지로 사용한다. ID는 편집 컬럼이 아니며 API 인수와 동일하다. useCallback은 유지한다.

**Tech Stack:** React useCallback, TypeScript, Oxlint/Vitest.

---

### Task 1: 최소 변경

**Modify:** `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`.

- [x] 기준 lint의 preserve-manual-memoization 두 진단을 확인했다.
- [x] parentGroup 선언 바로 뒤 다음 선언을 추가했다.

```tsx
const parentGroupId = parentGroup ? String(parentGroup.id) : null;
```

- [x] callback의 부모 부재 조건을 `parentGroupId === null`로, 조회 인수를 `parentGroupId`로, 의존 배열을 `[onError, parentGroupId, saving]`으로 바꿨다. 나머지 본문과 호출부는 유지했다.

### Task 2: 검증과 동기화

- [x] 문자열/숫자/0/빈 ID 등 8가지 null guard·조회 인수 동등성을 확인했다.
- [x] 전체 lint에서 두 진단만 제거되어 135개인지 확인했다.
- [x] threads/worker 2·UTC로 `tests\common-code-management-page.test.tsx`를 실행했다. 기존 실제 저장 잠금/상위 선택 차단/dirty 전환/재시도 30개가 통과했다.
- [x] typecheck·최소 diff·frontend 890파일 byte 일치·git diff --check를 확인했다.
- [ ] 결과 029 작성 후 이 단위만 커밋·non-force push하고 다음 경고를 계속한다.
