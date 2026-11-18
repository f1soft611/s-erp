# 댓글 키보드 등록 callback ref Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Enter 등록이 마지막으로 commit된 callback을 사용하도록 ref 게시 시점을 정리한다.

**Architecture:** 기존 submit 함수와 ref 초기값·소비자를 유지하고 매 commit의 useLayoutEffect에서만 submitRef를 갱신한다. 파일·멘션·editor·상위 callback 변경을 모두 반영하도록 의도적으로 매 commit 실행하며 새 비동기 경계나 handler 재구독을 만들지 않는다.

**Tech Stack:** React, TypeScript, Oxc, Vitest, Tiptap, Orca.

---

[작업지시서](../../directions/20261118/20261118_052_comment-submit-ref_작업지시서.md)를 기준으로 한다.

## 1. 기준선과 RED

**Modify:** `frontend/src/shared/components/feed/TiptapCommentThread.tsx`, `frontend/tests/feed-components.test.tsx`.

**Related:** `frontend/tests/notice-page-local-updates.test.tsx`, `frontend/tests/document-feed-item.test.tsx`.

- [x] 기존 위 3파일을 UTC/threads/maxWorkers 2로 실행한다.
- [x] feed-components에 아래 집중 회귀를 추가한다. 기존 use-server-date-default/page-search-area-detail의 Suspense 테스트 패턴을 따른다.

```tsx
it('keeps the committed keyboard submit callback while a later render suspends', async () => {
  const committed = vi.fn();
  const next = vi.fn();
  const attempted = vi.fn();
  const pending = new Promise<void>(() => undefined);
  function SuspendUpdate({ blocked }: { blocked: boolean }) {
    if (blocked) {
      attempted();
      throw pending;
    }
    return null;
  }
  const view = (useNext = false, blocked = false) => (
    <Suspense fallback={<span>Updating comment</span>}>
      <CommentThread comments={[]} onSubmitComment={useNext ? next : committed} />
      <SuspendUpdate blocked={blocked} />
    </Suspense>
  );
  const { rerender } = render(view());
  const editor = screen.getByRole('textbox', { name: '댓글 입력' });
  fireEvent.input(editor, { target: { innerHTML: '<p>Committed draft</p>' } });
  await act(async () => { await Promise.resolve(); });
  await act(async () => {
    startTransition(() => rerender(view(true, true)));
  });
  expect(attempted).toHaveBeenCalled();
  expect(screen.queryByText('Updating comment')).not.toBeInTheDocument();
  fireEvent.keyDown(editor, { key: 'Enter' });
  expect(next).not.toHaveBeenCalled();
  await waitFor(() => expect(committed).toHaveBeenCalledWith('<p>Committed draft</p>', []));
  rerender(view(true));
  fireEvent.input(editor, { target: { innerHTML: '<p>Latest draft</p>' } });
  fireEvent.keyDown(editor, { key: 'Enter' });
  await waitFor(() => expect(next).toHaveBeenCalledWith('<p>Latest draft</p>', []));
  expect(committed).toHaveBeenCalledTimes(1);
});
```

RTL에 `act`, React에 `startTransition`/`Suspense`를 추가한다. 집중 테스트를 실행해 미commit callback 누출로 실패하는지 확인한다. target render-ref 진단 0 assertion도 기존 1건으로 실패하는 근거를 보관한다. 예상과 다르면 원인을 조사하고 구현 전에 계획을 갱신한다.

## 2. 구현

- [x] React import에 useLayoutEffect를 추가하고 기존 render 대입만 아래처럼 감싼다.

```tsx
useLayoutEffect(() => {
  submitRef.current = () => {
    void submit();
  };
});
```

deps 생략은 기존처럼 매 갱신의 최신 submit closure를 게시하되 commit된 경우로 한정하기 위함이다. submit 함수, raw state/ref 초기값·키보드/버튼 경로·편집/멘션·성공/실패·JSX/CSS/공개/API 계약은 바꾸지 않는다.

### 2.1 실제 브라우저에서 추가 확인한 파일 payload 경합

정상 Enter 성공 뒤 같은 입력창에서 다시 파일을 선택하면 native change에는 파일 1개가 있지만 `input.value = ''` 뒤 `basicStateReducer/updateReducerImpl`이 live FileList 0개를 읽는 순서를 getter/setter 계측으로 확인했다. 해당 handler는 기준 SHA와 같다. 동일한 등록 payload 보존 검증을 막는 직접 연관 경합이므로 범위를 아래 최소 변경까지 확장한다.

- [x] 같은 테스트 파일에 live FileList가 input clear 시 비워지는 동작을 모델링하고, 같은 act 안에서 파일 2개를 순차 선택한 뒤 Enter payload가 두 파일을 유지하는 집중 회귀를 추가한다. 수정 전 실패를 확인한다.
- [x] 파일 선택 handler만 아래와 같이 선택 시점의 배열을 먼저 복사한다.

```tsx
onChange={(event) => {
  const selectedFiles = Array.from(event.target.files ?? []);
  setFiles((current) => [...current, ...selectedFiles]);
  event.target.value = '';
}}
```

callback 인자·첨부 누적·같은 파일 재선택을 위한 input clear는 유지한다. 파일 업로드/API·첨부 UI를 바꾸지 않는다. 실제 브라우저에서 동일 인스턴스의 정상 성공 후 재선택·실패 유지·재시도를 다시 검증한다.

## 3. 검증·동기화

- [x] 같은 3파일을 실행해 집중 회귀와 기존 동작을 확인한다. typecheck/build/Oxc에서 대상 1건 제거·새 진단 0을 확인한다.
- [x] source/AST 대조로 import/ref 대입 wrapper와 위 파일 배열 snapshot 외 변경이 없고 검증 workspace와 tracked frontend byte 차이가 0인지 확인한다.
- [x] 실제 CommentThread를 메모리 fixture로 구동해 375/768/1280px에서 입력 유지, 일반 Enter·Shift+Enter, 첨부 포함 최신 callback, 성공 초기화/실패 유지·재시도를 확인한다. Suspense 시점은 집중 Vitest로 한정한다.
- [x] 스크린샷/결과를 저장하고 선행 051 정확한 SHA 전체 CI 완료 뒤에만 allowlist 커밋·비강제 푸시한다. 이번 정확한 SHA CI는 별도 확인한다.
