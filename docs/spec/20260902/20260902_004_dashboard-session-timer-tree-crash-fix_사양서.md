# 상세 사양서: 대시보드 세션 타이머로 인한 사이드바 트리 크래시 수정

## 화면 동작

- 헤더 우측의 `로그인 유지 시간 mm:ss` 배지는 기존과 동일하게 1초마다 갱신된다.
- 세션 만료 60초 전 경고 알림(`SESSION_WARNING_MESSAGE`)은 기존과 동일하게 1회만 표시된다.
- 대시보드 진입 후 시간이 지나도 좌측 사이드바 메뉴 트리(모듈/메뉴 트리)는 정상적으로 펼침/선택 동작하며 콘솔에 `Maximum update depth exceeded` 에러가 발생하지 않는다.

## 상세 변경 사항

### 신규: `SessionCountdownLabel.tsx`

- `frontend/src/pages/dashboard/components/SessionCountdownLabel.tsx`
- `getStoredAuth()` + `getSessionRemainingLabel()`을 이용해 초기값을 계산하고, 컴포넌트 내부 `useEffect`에서 1초 `setInterval`로 라벨을 갱신한다.
- 렌더링은 기존 `Typography` 배지와 동일한 스타일(`px:1, py:0.5, borderRadius:1, bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontWeight:700`)을 유지한다.
- 이 컴포넌트의 리렌더는 자기 자신에 한정되며 부모(`DashboardPage`)를 리렌더시키지 않는다.

### `DashboardPage.tsx`

- `sessionRemainingLabel` state와 `setSessionRemainingLabel(...)` 호출을 제거한다.
- 기존 세션 상태 점검 `useEffect`(1초 interval)는 유지하되, 만료 경고 판단(`isAccessTokenExpiringSoon`, `showWarning`) 로직만 남긴다.
- 헤더 JSX의 `<Typography>로그인 유지 시간 {sessionRemainingLabel}</Typography>` 블록을 `<SessionCountdownLabel />`로 교체한다.

## 검증 기준

- `npm run build` 타입 에러 없음.
- `npm run test` 전체 통과(회귀 없음).
- 브라우저 재현: 로그인 → 대시보드 진입 → 90초 대기 → 콘솔 `pageerror` 미발생, 사이드바 메뉴 클릭 정상 동작.
