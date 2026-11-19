# 자료실 초기 필터 setter 바인딩 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 초기 필터 effect가 실제 사용하는 안정적 setter와 dependency 선언을 일치시킨다.

**Architecture:** useArchiveList가 반환하는 raw useState setter를 지역 변수로 분리해 초기 effect에만 사용한다. 원래 setter와 같은 함수를 호출하며 초기화 guard와 다른 의존성은 보존한다.

**Tech Stack:** React, TypeScript, oxlint, Vitest/Testing Library, Orca.

## 대상

- 운영: `frontend\src\pages\groupware\community\archive\ArchiveBoardPage.tsx`.
- 근거/보존 확인: `frontend\src\pages\groupware\community\archive\hooks\useArchiveList.ts`.
- 기존 회귀: `archive-page.test.tsx`, `archive-board-service.test.ts`.

## 실행

- [x] UTC/worker 2로 기존 archive page/service 회귀를 실행하고 대상 exhaustive-deps 0개 assertion이 기존 경고로 실패하는지 보관한다.
- [x] archiveList 선언 다음에 실제 setter를 바인딩한다.

```tsx
const { setFilters: setArchiveFilters } = archiveList;
```

- [x] 초기 기본값 effect의 `archiveList.setFilters({...})`만 `setArchiveFilters({...})`로 바꾸고 dependency도 `setArchiveFilters`로 바꾼다. 다른 이벤트의 기존 호출은 그대로다.
- [x] 동일 회귀, 전체 lint, `tsc -b`, `vite build`를 실행해 대상 deps 1개만 제거되고 새 진단이 없어야 한다.
- [x] 전체 소스/AST로 초기 effect의 호출 대상 이외 인자·guard·다른 setter, 전체 JSX/기존 hook이 같고 setFilters가 raw useState setter임을 확인한다. frontend 890파일 byte parity도 확인한다.
- [x] 로컬 합성 응답/메모리 Storage로 실제 자료실의 날짜 대기/초기 범위/검색/메타데이터 보존/세 폭을 확인한다. 운영 API·저장된 설정은 사용하지 않는다.
- [x] 결과/스크린샷과 정확한 이전 CI를 각각 보관하고 allowlist·별도 커밋·비강제 푸시 인수를 검토한다. 실제 동기화는 커밋 후 원격 SHA와 진행표에서 확인한다.
