# iPlusMES 모바일 PWA 설치 지원 상세 사양

근거: [작업지시서](../../directions/20261110/20261110_003_pwa-mobile-install_작업지시서.md), [계획서](../../plan/20261110/20261110_003_pwa-mobile-install_계획서.md), [설계](../../superpowers/specs/2026-11-10-pwa-installability-design.md).

## 설치 메타데이터

- 공개 manifest 경로는 `/manifest.webmanifest`이다.
- 앱 이름과 짧은 이름은 `iPlusMES`이며 시작 URL과 scope는 `/`, 표시 모드는 `standalone`이다.
- 앱 테마 색상은 기존 light theme의 primary 색상 `#1d4ed8`와 일치시킨다.
- manifest는 192×192 및 512×512 PNG 앱 아이콘을 포함한다. iOS touch icon은 180×180 PNG이며 기존 `frontend/public/push-icon.png`에서 만든다.
- `frontend/index.html`은 manifest 링크, theme-color, apple-touch-icon, standalone 모바일 메타데이터를 제공한다.
- Vite build 결과에서 manifest와 세 아이콘이 루트 public 자산으로 제공되어야 한다.

## 설치 안내 상태 전이

1. 설치 안내 컴포넌트는 라우터 내부에서 계속 마운트되어 로그인 전에도 브라우저 설치 이벤트를 수신한다.
2. 사용자가 인증되지 않았거나 현재 경로가 메인(`/groupware/overview`)이 아니면 배너를 표시하지 않는다. 메인 경로에서는 기존 auth 구독 상태를 사용해 로그인 직후 배너 표시를 평가한다.
3. 앱이 standalone display mode로 실행 중이거나 iOS `navigator.standalone`이 참이면 `hidden`을 유지한다.
4. 닫은 시각이 저장되어 있고 7일 미만 경과했다면 `hidden`을 유지한다. 닫은 시각은 epoch milliseconds로 저장한다.
5. standalone이 아닌 지원 브라우저에서 `beforeinstallprompt`가 오면 이벤트의 기본 UI를 억제하고, 인증된 메인 경로(`/groupware/overview`)에서만 앱 내부 `앱 설치` action을 표시한다.
6. 설치 버튼을 사용자가 누른 경우에만 저장된 이벤트의 `prompt()`를 호출한다. `userChoice` 결과가 accepted이면 안내를 숨긴다. Dismissed이면 브라우저 설치 프롬프트를 자동으로 다시 실행하지 않고, 닫은 시각을 저장해 7일간 안내를 숨긴다.
7. `appinstalled` 이벤트가 오면 설치 버튼과 안내를 숨기고 local storage에 설치 완료를 기록한다.
8. iOS 브라우저에서 standalone이 아니고 최근 7일 내 안내를 닫지 않은 경우 브라우저의 공유 메뉴 > 홈 화면에 추가 절차를 안내한다. 이 안내는 OS 알림이 아니다.
9. 닫기 action은 안내를 숨기고 현재 시각을 local storage에 저장한다. 저장 시각부터 7일이 지나면 미설치 상태에서 안내를 다시 표시한다. 기존 영구 닫기 값인 문자열 `true`는 유효한 시각이 아니므로 만료된 것으로 취급한다.
10. 설치 완료 표식과 standalone 실행은 주간 닫기 만료와 무관하게 계속 안내를 숨긴다.

## 사용자 알림 및 기존 Web Push 경계

- 미설치 사용자에게 OS 푸시/알림 권한을 요청하거나 Web Push 메시지를 보내지 않는다.
- 설치 안내는 앱 내부 UI로 한정하며 알림 권한을 요청하는 버튼을 제공하지 않는다.
- 브라우저가 설치 프롬프트를 열지 못하면 원인을 숨기지 않고 브라우저 메뉴에서 직접 설치하라는 대체 안내를 표시한다.
- 실제 업무 Web Push는 기존 사용자 명시 opt-in, `/sw.js`, backend 구독 및 권한 계약을 유지한다.
- PWA 변경으로 `/sw.js` 내용, 등록 시점, scope, push payload 또는 클릭 이동 동작을 수정하지 않는다.
- 오프라인 사용이나 API 데이터 캐싱을 보장하지 않는다.

## UI 및 접근성

- 안내 컴포넌트는 라우터 내에서 route가 바뀌어도 유지하되, 인증된 메인 경로(`/groupware/overview`)에서만 표시한다. 로그인 화면 및 그 외 경로에는 표시하지 않는다.
- 안내 문구와 action은 한국어로 표시한다.
- 주요 action은 `앱 설치`이며, 닫기 action의 accessible label은 `설치 안내 닫기`이다.
- 375px에서 텍스트/버튼이 겹치지 않아야 하며, 768px과 1280px에서 안내가 과도하게 넓어지지 않아야 한다. 주요 앱 route와 로그인 사용을 가리면 안 된다.

## 검증 기준

- manifest 필수 필드, 앱 이름, standalone 표시, root scope 및 아이콘 경로/크기를 검증한다.
- 합성 `beforeinstallprompt` 이벤트에서 prompt가 설치 버튼 클릭으로만 호출되는지와 accepted/dismissed 결과별 상태를 검증한다.
- `appinstalled`, standalone display mode, iOS 수동 설치 안내 및 닫기 직후/7일 이내 숨김, 7일 경과 후 재표시를 검증한다.
- 로그인/비메인 경로에서 숨김, 로그인 전에 수신한 설치 이벤트를 인증된 `/groupware/overview`에서 표시하는 동작을 검증한다.
- 레거시 닫기 값 `true`가 영구 숨김으로 유지되지 않는지 검증한다.
- 기존 Service Worker regression test가 통과해야 한다.
- 프런트엔드 테스트/build/lint와 실제 브라우저의 375px/768px/1280px 화면을 확인하고 스크린샷을 저장한다.
