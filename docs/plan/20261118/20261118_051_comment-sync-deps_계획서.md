# 공지 서버 댓글 동기화 의존성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 댓글 캐시 변경 때 재동기화 loop 없이 마지막 exhaustive-deps 진단을 제거한다.

**Architecture:** 기존 effect의 서버 revision·댓글 JSON 비교를 그대로 유지한다. revision과 모든 snapshot이 같은 경우에만 no-op map 복사/ref 동일값 재대입을 생략하고, 나머지 경우는 기존 setter/병합/커서/ref 본문을 그대로 실행한다.

**Tech Stack:** React, TypeScript, Oxc, Vitest, Vite, Orca.

---

[작업지시서](../../directions/20261118/20261118_051_comment-sync-deps_작업지시서.md)를 기준으로 한다.

## 1. 기준선과 RED

**Modify:** `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`.

**Existing tests:** `frontend/tests/{notice-page-local-updates,notice-page,use-notice-comments,use-notice-interactions,use-notice-list}.test.tsx`.

- [x] UTC, Vitest threads/maxWorkers 2로 위 5파일을 실행해 기존 로컬 댓글·서버 병합·이전 댓글·044 첫 commit 및 초기화된 fallback cursor 회귀를 확인한다.
- [x] 전체 Oxc JSON의 해당 effect에서 localCommentsByNoticeId 누락이 0이라는 assertion을 실행해 기존 1건으로 실패하는 실제 lint RED를 보관한다. runtime 기능 버그 RED라고 주장하지 않는다.

## 2. 구현

- [x] effect의 `changedByNoticeId` 구성 직후, 첫 setter 앞에만 아래 guard를 삽입한다.

```tsx
if (
  !isServerReset &&
  !items.some((item) => changedByNoticeId.get(item.id))
) {
  return;
}
```

- [x] 같은 effect의 dependency만 아래와 같이 완전하게 선언한다.

```tsx
[items, serverItemRevision, localCommentsByNoticeId]
```

skip 경로의 기존 map updater 4개는 모두 `changedByNoticeId`가 true일 때만 entry를 변경한다. false 경로는 같은 entry를 복사할 뿐이다. snapshot/revision ref 재대입도 같은 값이다. 반대로 revision 변경은 snapshot이 같더라도 기존 본문을 실행해야 한다. 이전 댓글 ID의 ref 정리·서버 최신 댓글 병합·커서/loaded/exhausted setter와 순서를 그대로 둔다.

## 3. 검증·완료

- [x] 같은 5파일, `tsc -b`, `vite build`, `oxlint --format=json`으로 대상 1건 제거/새 진단 0을 확인한다.
- [x] source/AST 대조로 guard와 dependency 1개 외 setter/updater/ref·다른 effect/handler·UI/공개/API/DB 계약이 같고 검증 workspace와 tracked frontend byte 차이가 0인지 확인한다.
- [x] 실제 피드의 375/768/1280px에서 이전 댓글 7→4 cursor, 중복 요청 방지, metadata99에 의한 커서 덮어쓰기 방지, 병합·exhaustion을 확인한다. 별도로 바뀐 서버 댓글 payload·revision 초기화 경로를 확인한다.
- [x] 소유 메모리 fixture·차단된 fetch만 사용하고 스크린샷/결과를 저장했다. 선행 050 정확한 SHA 전체 CI 완료를 확인하고 allowlist 커밋·비강제 푸시 인수를 검토한다. 실제 동기화·이번 SHA CI는 후속 진행표로 별도 확인한다.

기준선/수정 후 각각 5파일·83개, lint 91→90/새 진단 0/전체 exhaustive-deps 0, typecheck/build exit 0이다. 실제 피드 3폭에서 각 cursor 7/4/27과 변경 snapshot·revision 경로를 확인하고 PNG 9개/JSON 2개를 보관했다. 선행 050의 정확한 SHA CI 226파일·2,680개/네 job success를 별도 확인했다.
