# 공지 댓글 이미지 조회 의존성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 실제 이미지 조회 조건과 lifecycle을 보존하며 배열 누락 진단 1건을 제거한다.

**Architecture:** 기존 내부 JSON 키를 effect의 요청 ID 원본으로 사용한다. 키 생성, dependency 배열, 비동기 결과 순서, active guard, URL 생성/폐기, UI는 유지한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest, Vite, Orca.

---

[작업지시서](../../directions/20261118/20261118_050_comment-image-deps_작업지시서.md)를 기준으로 한다.

## 1. 기존 회귀와 RED

**Files:** `frontend/tests/notice-page-local-updates.test.tsx`, `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`.

- [x] 기존 이미지 미리보기/뷰어 테스트에 `rerender`를 받아 같은 ID의 댓글 내용·테마만 바꾸는 아래 흐름을 추가한다. 기존 뷰어 열기/닫기·다운로드/오류·unmount URL 검증을 유지한다.

```tsx
rerender(
  <NoticeFeedList
    items={[{
      ...item,
      comments: item.comments.map((comment) => ({
        ...comment,
        content: 'Updated comment metadata',
      })),
    }]}
    isDark={true}
    expandedNoticeId={item.id}
    onLoadPreviousComments={vi.fn()}
  />,
);
expect(await screen.findByText('Updated comment metadata')).toBeInTheDocument();
expect(commentServiceMocks.fetchCommonFileBlob).toHaveBeenCalledTimes(1);
expect(URL.revokeObjectURL).not.toHaveBeenCalled();
```

- [x] 기존 관련 테스트를 UTC/최대 worker 2로 실행한다. 기존 구현도 통과하는 보존 회귀이며 runtime 버그 RED라고 주장하지 않는다.
- [x] 전체 Oxc JSON에서 대상 effect의 exhaustive-deps 수가 0이라는 assertion을 실행해 기존 1건으로 실패하는 실제 lint RED를 보관한다.

## 2. 최소 구현

- [x] `NoticeFeedList.tsx`의 댓글 이미지 effect 시작에만 아래 지역 변수를 추가하고 같은 effect의 기존 `expandedCommentImages` 참조 3곳을 `commentImageRequests`로 대체한다.

```tsx
const commentImageRequests = (
  JSON.parse(commentImageRequestKey) as [number, number, string][]
).map(([, commentId, attachmentId]) => ({ commentId, attachmentId }));
```

내부 키가 직접 직렬화한 좁은 tuple 형태에만 타입을 부여한다. 일반 외부 JSON 타입 단언·검증 helper를 추가하지 않는다. 의존성은 기존 `[commentImageRequestKey, expandedNoticeId]` 그대로이며 순서/중복/오류 index 대응도 유지한다.

## 3. 검증·동기화

- [x] 같은 관련 테스트를 실행하고 `tsc -b`, `vite build`, `oxlint --format=json`으로 대상 1건 제거/새 진단 0을 확인한다.
- [x] source/AST 대조로 지역 ID 복원과 참조 3곳 외 본문·기존 키·나머지 effect·공개 계약이 같고 검증 workspace와 tracked frontend byte 차이가 0인지 확인한다.
- [x] 실제 NoticeFeedList의 합성 transport만 사용해 375/768/1280px에서 미리보기·뷰어·표시 정보/테마 변경 시 요청 유지, ID 변경·늦은 응답·오류·URL 정리를 확인하고 PNG/JSON을 결과에 보관한다. 운영 API·저장소·공유 서버를 변경하지 않는다.
- [x] 선행 049 정확한 SHA 전체 CI 완료를 확인하고 allowlist 커밋·비강제 푸시 인수를 검토한다. 실제 동기화·이번 정확한 SHA CI는 후속 진행표로 별도 확인한다.

기준선/수정 후 각각 5파일·83개, lint 92→91/새 진단 0, typecheck/build exit 0이다. 실제 피드 3폭·합성 요청 7개·URL 생성/폐기 각각 5개·미확인 요청 0을 검증하고 PNG 8개/JSON 2개를 보관했다. 선행 049의 정확한 SHA CI 226파일·2,680개/네 job success를 별도 확인했다.
