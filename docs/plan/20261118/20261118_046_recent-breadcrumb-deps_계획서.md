# 최근 메뉴 경로 의존성 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 최근 메뉴 effect가 사용하는 경로 문자열을 명시적으로 의존하도록 한다.

**Architecture:** 기존 breadcrumb 배열 구성과 join 구분자를 보존하고 그 결과를 지역 primitive로 계산한다. 매 렌더마다 생성되는 배열 전체를 effect dependency로 추가하지 않는다.

**Tech Stack:** React, TypeScript, oxlint, Vitest/Testing Library, Orca.

## 대상과 실행

- 운영: `frontend\src\pages\dashboard\DashboardPage.tsx`.
- 기존 회귀: `dashboard-sidebar.test.tsx`, `dashboard-data.test.tsx`, `page-session-state.test.tsx`.
- [x] UTC/threads/worker 2로 위 세 파일을 실행하고 target exhaustive-deps 0개 assertion이 기존 경고로 실패하는지 보관한다.
- [x] 기존 recentBreadcrumbItems 바로 다음에 아래 순수 값을 선언한다.

```tsx
const recentBreadcrumbPath = recentBreadcrumbItems.join(' > ');
```

- [x] effect의 `breadcrumbPath: recentBreadcrumbItems.join(' > ')`만 `breadcrumbPath: recentBreadcrumbPath`로 바꾸고 dependency에 `recentBreadcrumbPath`를 추가한다.
- [x] 동일 회귀, 전체 lint, `tsc -b`, `vite build`를 실행해 대상 deps 1개만 제거되고 새 진단이 없어야 한다.
- [x] 전체 소스/AST로 join 위치와 scalar dependency 외에 본문·guard·signature·상태·기존 dependencies·JSX/CSS가 같음을 확인하고 frontend 890파일 byte parity를 확인한다.
- [x] 합성 메뉴·메모리 Storage·닫힌 transport로 실제 DashboardPage의 중첩 경로/메타데이터 재렌더/재방문/최대 5건/notice 특례/검색 제외와 375/768/1280 화면을 확인한다.
- [x] 결과/스크린샷과 정확한 이전 CI를 각각 보관하고 allowlist·별도 커밋·비강제 푸시 인수를 검토한다. 실제 원격 SHA/CI는 커밋 뒤 별도 진행표로 확인한다.
