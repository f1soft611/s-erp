# 프론트엔드 대용량 청크 코드 분할 상세사양서

## 현황

`frontend/vite.config.ts`의 `build.chunkSizeWarningLimit`는 1,000 kB이다. 기준 빌드에서 `index` 청크가 1,192.30 kB로 경고되었고, `vendor-exceljs`는 929.57 kB로 별도 출력되었다. 따라서 경고는 빌드 실패가 아니라 초기 번들이 큰 사실을 알린다.

라우터는 Login, Dashboard, Profile, Security, F1-Grid docs, NotFound 화면을 정적 import한다. `DashboardContent`는 15개의 업무 화면을 정적으로 import하며 `App`도 로그인 공지 팝업 호스트를 정적으로 가져온다.

## 상세 동작

### 라우트 로딩

- 모든 라우트 페이지는 `React.lazy`를 통해 모듈 로딩을 시작한다.
- named export 페이지는 dynamic import 결과를 `{ default: NamedPage }` 형태로 매핑하고, default export 페이지는 그대로 사용한다.
- `Routes`를 suspense boundary 안에 두어 초기 페이지 및 직접 URL 진입도 로딩 상태를 표시한다.
- fallback은 공통 `AppLoadingSpinner`를 사용한다.
- 현재 route path, route 순서, `ProtectedRoute`, `PublicRoute`, redirect 및 NotFound 동작을 변경하지 않는다.

### Dashboard 업무 화면

- `DashboardContent`의 정적 업무 화면 imports, 기존 페이지 키 조건 및 컴포넌트 props를 변경하지 않는다.
- `DashboardPage`와 선택 화면은 기존 동기 렌더링 방식을 유지한다. 측정 결과 `DashboardPage` chunk가 476.38 kB로 limit 아래다.

### 로그인 공지 팝업 호스트

- `NoticeLoginPopupHost`를 앱 진입 시 정적 로드하지 않고 lazy import한다.
- host 로딩 대기 fallback은 `null`로 두어 백그라운드 팝업 코드 다운로드가 로그인/업무 화면을 가리지 않게 한다.
- 인증 변경 구독, 팝업 조회, 세션 상태, 팝업 표시 규칙은 변경하지 않는다.

## 오류 처리

- 동적 모듈 import가 실패하면 React lazy의 오류 전파를 유지한다.
- import 실패를 빈 화면/성공으로 대체하거나 chunk error를 삼키는 catch는 추가하지 않는다.
- API 호출, 권한 오류, 화면별 기존 로딩/오류 처리는 이번 변경 대상이 아니다.

## 호환성 및 비목표

- 브라우저 경로와 route matching이 동일하다.
- 역할/권한 보호 및 업무 메뉴 mapping이 동일하다.
- vite chunk warning limit는 1,000 kB로 유지한다.
- 백엔드, API, DB, dependency manifest, 업무 UI를 변경하지 않는다.

## 완료 기준

1. production build 로그에 1,000 kB 초과 청크 warning이 없다.
2. unknown path는 기존 NotFound 화면을 표시하고, 인증된 `/dashboard`의 비동기 메뉴 조회 경로가 기존 화면으로 이어지는지 라우터 테스트로 확인한다.
3. Dashboard 메뉴로 선택한 업무 페이지는 기존과 동일하게 정상 렌더된다. Dashboard 내부 모듈은 동기 import 상태로 둔다.
4. 로그인 화면에서 팝업 host lazy loading이 인증 및 팝업 동작을 손상시키지 않는다.
5. 결과 문서에 실제 빌드 출력, 테스트 명령/결과, 브라우저 확인 및 캡처를 기록한다.
