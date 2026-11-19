# 쪽지 대화 열기 의존성 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 링크 effect가 실제 사용하는 대화 열기 callback을 안정적으로 의존하도록 한다.

**Architecture:** applyDayPage는 안정적인 raw setter만 캡처하므로 빈 dependency의 useCallback으로 선언한다. openThread는 기존 본문을 유지한 채 `[applyDayPage, showError]`로 바인딩하고 기존 링크 effect에 추가한다. showError는 이미 그 effect의 dependency이므로 새 실효 갱신 조건을 만들지 않는다.

**Tech Stack:** React, TypeScript, oxlint, Vitest/Testing Library, Orca.

## 대상과 실행

- 운영: `frontend\src\pages\groupware\messages\MessageInboxPage.tsx`.
- 기존 회귀: `message-inbox.test.tsx`, `message-service.test.ts`, `message-chat-links.test.tsx`, `search-result-message.test.tsx`.
- [x] UTC/threads/worker 2로 위 네 파일을 실행하고 target exhaustive-deps 0개 assertion이 기존 경고로 실패하는지 보관한다.
- [x] applyDayPage의 본문은 그대로 두고 선언을 바꾼다.

```tsx
const applyDayPage = useCallback((page: MessageDayPage) => {
  setMessages(page.resultList);
  setOldestMessageDate(page.messageDate);
  setHasPreviousMessages(page.hasPrevious);
}, []);
```

- [x] 기존 openThread의 async 본문을 아래와 같이 그대로 바인딩하고 링크 effect의 dependency에 openThread를 명시한다.

```tsx
const openThread = useCallback(async (threadId: number) => {
  const request = ++threadRequestRef.current;
  selectedThreadIdRef.current = threadId;
  setSelectedThreadId(threadId);
  setLoadingMessages(true);
  setMessageError('');
  try {
    const page = await getThreadMessages(threadId);
    if (!mountedRef.current || request !== threadRequestRef.current) return;
    applyDayPage(page);
    try {
      await markThreadRead(threadId);
      if (!mountedRef.current || request !== threadRequestRef.current) return;
      setThreads((current) => current.map((thread) =>
        thread.threadId === threadId ? { ...thread, unreadCount: 0 } : thread));
      window.dispatchEvent(new Event('s-erp:message-read'));
    } catch {
      if (!mountedRef.current || request !== threadRequestRef.current) return;
      showError('쪽지 읽음 처리에 실패했습니다.');
    }
  } catch {
    if (!mountedRef.current || request !== threadRequestRef.current) return;
    setMessages([]);
    setOldestMessageDate(null);
    setHasPreviousMessages(false);
    setMessageError('쪽지 대화를 불러오지 못했습니다.');
  } finally {
    if (mountedRef.current && request === threadRequestRef.current) setLoadingMessages(false);
  }
}, [applyDayPage, showError]);
```
- [x] 동일 회귀, 전체 lint, `tsc -b`, `vite build`를 실행해 대상 deps 1개만 제거되고 새 진단이 없어야 한다.
- [x] 전체 소스/AST로 두 callback 본문/캡처와 다른 모든 함수·effect·ref·JSX/CSS가 같음을 확인하고 frontend 890파일 byte parity를 확인한다.
- [x] 메모리 Storage·닫힌 합성 transport로 실제 MessageInboxPage의 목록 대기/링크 열기/읽음/context 재렌더/draft/실시간 갱신/새 링크와 세 폭을 확인한다.
- [x] 결과/스크린샷·이전 정확한 CI를 보관하고 allowlist·별도 커밋·비강제 푸시 인수를 검토한다. 실제 원격 SHA/CI는 커밋 뒤 별도 진행표로 확인한다.

검증 workspace의 frontend에서 실행한다. 기존 동작을 유지하는 binding 수정이므로 런타임 기준선도 29개 통과하며 RED는 누락 의존성 진단이다.

```powershell
$env:TZ = 'UTC'
.\node_modules\.bin\vitest.cmd run tests/message-inbox.test.tsx tests/message-service.test.ts tests/message-chat-links.test.tsx tests/search-result-message.test.tsx --pool=threads --maxWorkers=2
.\node_modules\.bin\oxlint.cmd --format=json
.\node_modules\.bin\tsc.cmd -b
.\node_modules\.bin\vite.cmd build
```

수정 후 기대값은 4파일·29개 통과, lint 96→95/새 진단 0, typecheck/build exit 0이다. 브라우저 실제 수치는 결과 문서의 JSON에 보관한다.
