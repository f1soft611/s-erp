# 계획서: 대시보드 세션 타이머로 인한 사이드바 트리 크래시 수정

## 원인 분석 (Phase 1~2)

- `DashboardPage.tsx`는 `sessionRemainingLabel` state를 1초 간격 `setInterval`로 갱신한다.
- 이 state는 `DashboardPage` 최상위에 있어, 매초 `DashboardPage` 전체가 리렌더링된다.
- `findMenuPath(...)` 및 `selectedModule.tree.map(renderMenuNode)`는 메모이제이션 없이 렌더 함수 본문에서 매번 새로 계산되며, 그 결과(`expandedItemIds`, `selectedModule`, 트리 엘리먼트 배열)가 매초 새 참조로 `DashboardSidebar` → `DashboardMenuTree` → `@mui/x-tree-view`의 `SimpleTreeView`/`TreeItem`에 전달된다.
- `DashboardSidebar`, `DashboardMenuTree`는 `React.memo` 처리가 되어 있지 않아 매초 리렌더링되고, `@mui/x-tree-view`(v9, React 19) 쪽 `TreeItemProvider` 내부 상태 갱신이 이 반복 리렌더와 맞물려 `Maximum update depth exceeded` 무한 루프를 유발한다.
- 즉, 근본 원인은 "1초마다 화면 전체에 영향을 주는 상태(`sessionRemainingLabel`)가 최상위 컴포넌트에 있어 불필요하게 사이드바까지 매초 리렌더링시키는 구조"이다.

## 구현 단위

1. **세션 카운트다운 표시를 별도 컴포넌트로 분리**
   - 신규 컴포넌트 `frontend/src/pages/dashboard/components/SessionCountdownLabel.tsx`를 추가한다.
   - 이 컴포넌트가 자체적으로 1초 `setInterval`과 로컬 state를 가지고 `로그인 유지 시간 mm:ss` 뱃지를 렌더링한다.
2. **DashboardPage에서 렌더링에 영향을 주는 카운트다운 state 제거**
   - `sessionRemainingLabel`/`setSessionRemainingLabel` state와 이를 갱신하던 코드를 제거한다.
   - 세션 만료 경고(`isAccessTokenExpiringSoon` → `showWarning`) 로직은 기존 `useEffect`(1초 interval)에 그대로 유지한다(경고 표시 자체는 화면 전체 리렌더를 유발하지 않음).
   - JSX의 `로그인 유지 시간 {sessionRemainingLabel}` 배지를 `<SessionCountdownLabel />`로 교체한다.

## 검증 계획

- `cd frontend && npm run build` (타입 오류 확인)
- `cd frontend && npm run test` (기존 회귀 테스트 전체 통과 확인)
- Playwright로 실제 dev 서버에 로그인 후 대시보드 화면에서 90초 이상 대기하며 `pageerror` 이벤트가 발생하지 않는지 확인
