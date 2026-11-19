# 공지 이전 댓글 초기 커서 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** effect 초기화보다 앞선 이전 댓글 요청도 서버 nextBeforeCommentId를 사용하도록 복구한다.

**Architecture:** 이벤트가 커서 map의 own entry 존재 여부를 구분한다. 미소유이면 서버 커서를, 소유했으면 기존 로컬 커서를 선택하고 nullish 값은 원래처럼 첫 표시 댓글로 fallback한다. 기존 effect나 상태 저장 구조는 바꾸지 않는다.

**Tech Stack:** React, TypeScript, Vitest/Testing Library, Orca.

## 대상

- 운영: `frontend\src\pages\groupware\community\notice\components\NoticeFeedList.tsx`.
- 회귀: `frontend\tests\notice-page-local-updates.test.tsx`.

## 실행

- [x] Profiler의 첫 commit에서 이전 댓글 버튼을 한 번 눌러 서버 커서 7을 기대하는 회귀를 추가한다. 현재 코드는 10으로 실패해야 한다.

```tsx
<Profiler id="initial-comment-cursor" onRender={() => {
  const button = screen.queryByRole('button', { name: /^이전 댓글 보기/ });
  if (!clicked && button) {
    clicked = true;
    button.click();
  }
}}>
  <NoticeFeedList items={[item]} isDark={false} onLoadPreviousComments={load} />
</Profiler>
```

- [x] 이미 undefined entry를 초기화한 뒤 댓글이 같은 메타데이터 변경에서는 기존 표시 댓글 fallback을 유지하는 보존 회귀를 추가한다. 단순 `state ?? prop`로 바꾸지 않는다.
- [x] 운영 코드를 그대로 둔 채 local-updates를 실행해 새 첫 commit 회귀만 의도한 RED이고 기존·보존 회귀가 통과하는지 확인한다.
- [x] 이전 댓글 이벤트의 커서 계산만 다음처럼 수정한다.

```tsx
const hasInitializedCursor = Object.prototype.hasOwnProperty.call(
  previousCursorByNoticeId,
  item.id,
);
const cursor =
  (hasInitializedCursor
    ? previousCursorByNoticeId[item.id]
    : item.nextBeforeCommentId) ?? visibleComments[0]?.id;
```

- [x] UTC/worker 2로 notice-list, notice-page, notice-page-local-updates, notice-comments/interactions 회귀를 실행한다. lint 98개와 진단 multiset이 그대로이고 typecheck/build가 통과해야 한다.
- [x] 전체 소스/AST로 커서 계산 이외 이벤트 본문·기존 effect·merge/완료 판단·JSX·기존 회귀를 보존하고 frontend 890파일 byte parity를 확인한다.
- [x] 실제 NoticeFeedList의 합성 댓글을 native로 이전 조회해 커서·추가 댓글·중복 요청 방지·보존 상태를 세 폭에서 확인하고 스크린샷/결과를 기록한다.
- [x] 공개 계약/DB 변경이 없음을 확인하고 별도 커밋·비강제 푸시한다. 이전 exact CI와 이번 검증을 구분한다.
