# 공지 목록 의존성 선언 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 이미 존재하는 전이 의존성과 안정적 setter를 직접 명시해 공지 목록 lint 2개를 제거한다.

**Architecture:** callback/effect 본문은 그대로 두고 dependency array 2개만 보완한다. 필터는 기존 loadAllPinnedPosts가 이미 같은 Object.is 기준으로 관찰하고, raw useState setter는 같은 mount에서 안정적이므로 기존의 실효 갱신 조건을 유지한다.

**Tech Stack:** React, TypeScript, oxlint, Vitest/Testing Library, Orca.

## 대상

- `frontend\src\pages\groupware\community\notice\hooks\useNoticeList.ts`.
- `frontend\src\pages\groupware\community\notice\CommunityNoticePage.tsx`.
- 기존 회귀: `use-notice-list.test.tsx`, `notice-page.test.tsx`, `notice-page-local-updates.test.tsx`.

## 실행

- [x] 기존 UTC/worker 2 공지 hook/page/local-updates 회귀를 실행한다. 기존 동작을 바꾸지 않는 선언 보완이므로 의미 없는 상수·소스 문자열 단위 테스트를 추가하지 않는다.
- [x] 전체 lint의 두 파일에 exhaustive-deps가 없다는 실행 가능한 assertion을 먼저 실패시킨다. 기존 경고를 RED 근거로 보관한다.
- [x] useNoticeList의 loadNoticePosts dependency에 selectedNoticeFilter만 추가한다.

```tsx
[loadAllPinnedPosts, mapPost, selectedNoticeFilter, start, succeed, fail]
```

- [x] CommunityNoticePage의 분류명 동기화 dependency에 setNoticeItems만 추가한다.

```tsx
[noticeGubunNames, setNoticeItems]
```

- [x] 같은 runtime 회귀, 전체 lint, `tsc -b`, `vite build`를 실행한다. 대상 deps 2개만 제거되고 추가 진단이 없어야 한다.
- [x] AST에서 모든 callback/effect 본문·상태·JSX와 다른 dependency를 보존하고, 기존 전이 dependency와 raw setter 반환을 확인한다. frontend 890파일 byte parity도 확인한다.
- [x] 네트워크/저장소를 변경하지 않는 소유 fixture로 기존 공지 필터/목록 흐름과 반응형 화면 근거를 기록한다. 실제 서비스 저장 검증으로 표현하지 않는다.
- [x] 결과·스크린샷·진단 비교를 보관하고 allowlist로 별도 커밋·비강제 푸시한다. 이전 042 exact CI는 해당 SHA에만 귀속한다.
