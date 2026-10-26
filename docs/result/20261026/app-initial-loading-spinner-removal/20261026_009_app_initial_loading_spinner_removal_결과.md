# 앱 초기 진입 로딩 스피너 제거 결과

## 변경 내용

- `AppRouter`의 route `lazy()` / `Suspense` 구조를 유지하면서 Suspense fallback spinner를 제거했다.
- `DashboardPage`의 초기 메뉴 조회 spinner를 제거했다. 메뉴 로딩 게이트, 조회/재시도, 오류 표시 및 메뉴 준비 후 화면은 유지한다.
- 공통 `AppLoadingSpinner`와 다른 조회/저장 spinner 사용처는 변경하지 않았다.

## 회귀 검증

`frontend/tests/app-router-not-found.test.tsx`의 지연 메뉴 응답 검증을 보완했다.

- route lazy-load 및 메뉴 조회 대기 중 `progressbar`가 없는지 확인한다.
- 메뉴 응답 전 대시보드 제목이 숨겨지고, 응답을 resolve한 뒤 기존 제목이 표시되는지 확인한다.
- 인증 fixture의 만료 시각을 5분 뒤로 설정해 API client의 60초 token refresh buffer와 겹치지 않게 했다.
- 테스트 응답에 권한 있는 leaf menu를 포함하고, 비동기 route import 후 메뉴 요청 callback이 준비될 때 조건 기반으로 기다린다.

초기 기준선 실행은 테스트 fixture의 즉시 만료 판정과 불완전한 메뉴 구조, route lazy-load 대기 문제로 실패했다. 이를 검증 과정에서 바로잡은 뒤, 변경 전 회귀 검증은 제거 대상 Suspense spinner 부재 assertion에서 예상대로 실패했고, 수정 후 통과했다.

## 검증 결과

| 검증 | 결과 |
|---|---|
| `npm run test -- tests/app-router-not-found.test.tsx` | 통과: 3 tests |
| `npm run build` | 통과: TypeScript 및 Vite production build |
| 변경 파일 `npm run lint -- src/routes/AppRouter.tsx src/pages/dashboard/DashboardPage.tsx tests/app-router-not-found.test.tsx` | 오류 없이 통과. DashboardPage의 기존 경고 3건(set-state-in-effect, no-constant-binary-expression, exhaustive-deps)은 이번 수정과 무관 |
| `git diff --check` | 통과: 공백 오류 없음 |

## 브라우저 확인

기존 개발 서버 `http://127.0.0.1:4173`에서 메뉴 API 응답을 보류하고, 모듈 API에는 테스트 응답을 제공해 초기 메뉴 대기 상태를 확인했다.

| 뷰포트 | Progressbar | 문서 너비 | 가로 넘침 | 결과 |
|---:|---:|---:|---:|---|
| 375 × 900 | 0 | 375 / 375 | 없음 | 배경만 표시, 메뉴/본문 미표시 |
| 768 × 900 | 0 | 768 / 768 | 없음 | 배경만 표시, 메뉴/본문 미표시 |
| 1280 × 900 | 0 | 1280 / 1280 | 없음 | 배경만 표시, 메뉴/본문 미표시 |

캡처:

- [375px](./screenshots/startup-375.png)
- [768px](./screenshots/startup-768.png)
- [1280px](./screenshots/startup-1280.png)
