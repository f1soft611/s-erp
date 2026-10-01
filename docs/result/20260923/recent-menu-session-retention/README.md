# 최근 사용 메뉴 세션 유지

## 변경 내용

- 로그인 세션 동안 최근 방문한 메뉴를 `sessionStorage`에 누적 저장한다.
- 동일 메뉴를 다시 방문하면 기존 기록을 제거하고 최신 시점으로 갱신한다.
- 최근 메뉴는 최대 5개까지 유지하며, 오래된 항목은 자동 제거한다.
- 사이드바 하단에 `최근 사용` 섹션을 추가하고, 항목 클릭 시 해당 경로로 바로 이동한다.
- 하단 사용자 프로필은 텍스트 없이 사진만 가운데 배치한 compact avatar 카드로 정리했다.
- 기존 menu tree의 선택 상태와 라우팅 흐름은 유지하면서 보조 UX만 추가했다.
- 최근 메뉴 기록은 세션 스코프에서만 유지되며, 브라우저 종료 시 제거된다.

## 구현 위치

- `frontend/src/pages/dashboard/DashboardPage.tsx`
- `frontend/src/shared/hooks/usePageSessionState.ts`
- `frontend/src/pages/dashboard/components/DashboardSidebar.tsx`
- `frontend/src/pages/dashboard/components/DashboardMenuTree.tsx`

## 검증

- `cd d:/f1soft/dev/react/S-ERP/frontend && npx vitest run tests/dashboard-sidebar.test.tsx -t "shows recent menu history in the sidebar footer|shows a compact profile action menu from the avatar control"`
- 결과: 1개 파일 통과, 2개 테스트 통과, 11개 스킵

## 회귀 기준

- 최근 메뉴가 세션 동안 유지된다.
- 동일 메뉴 재방문 시 중복이 제거되고 최신 순으로 정렬된다.
- 사이드바 하단에 최근 사용 목록과 프로필 카드가 함께 보인다.
- 메뉴 트리 선택과 라우팅 동작은 기존 흐름을 유지한다.
- 관련 문서와 구현 범위가 일치한다.
