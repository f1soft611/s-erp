# Server date callback commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** commit되지 않은 render가 서버 날짜 callback을 오염시키지 않도록 한다.

**Architecture:** callback ref 초기값은 유지한다. render 본문의 두 ref 쓰기를 onDate/onError 의존 layout effect로 이동한다. commit 직후·passive fetch 이전에 최신 callback을 반영하며 query/reload를 다시 만들지 않는다.

**Tech Stack:** React concurrent transition/Suspense/useLayoutEffect, TypeScript, Vitest.

---

### Task 1: RED

**Modify:** `frontend/tests/use-server-date-default.test.tsx`.

- [x] date/error 두 경우를 parameterize했다. pending 서버 응답을 둔 채 최초 callback으로 commit했다.
- [x] startTransition으로 다른 callback을 가진 render를 시작하고 hook 다음에서 해결되지 않는 Promise를 throw했다. render 시도와 기존 commit 보존을 확인했다.
- [x] 기존 서버 요청을 성공/실패 완료하고 최초 commit callback만 실행되어야 함을 단언했다. 새 요청은 없어야 한다.
- [x] 기존 코드에서 미반영 callback이 호출되어 두 사례가 실제 실패함을 확인했다.

### Task 2: 최소 수정과 GREEN

**Modify:** `frontend/src/shared/hooks/useServerDateDefault.ts`.

- [x] render 중 두 대입을 제거하고 다음 블록을 기존 mount effect 앞에 뒀다.

```tsx
useLayoutEffect(() => {
  onDateRef.current = onDate;
  onErrorRef.current = onError;
}, [onDate, onError]);
```

- [x] 해당 Hook import만 추가했다. 조회 effect·enabled deps·touched/mounted guard·reload/markTouched는 그대로다.
- [x] 회귀 두 개와 기존 hook 테스트, 실제 수주등록 테스트를 threads/worker 2·UTC로 실행했다. 46개 모두 통과했다.
- [x] lint refs 2개만 제거/전체 135 → 133, typecheck·최소 diff·frontend 890파일 byte 일치를 확인했다.
- 결과 030을 작성하고 이 단위를 커밋·non-force push한 뒤 남은 경고를 계속한다.
