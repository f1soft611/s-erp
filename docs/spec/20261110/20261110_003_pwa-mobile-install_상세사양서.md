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

1. 초기 표시 상태는 `hidden`이다.
2. 앱이 standalone display mode로 실행 중이거나 iOS `navigator.standalone`이 참이면 `hidden`을 유지한다.
3. local storage에 설치 안내 닫기 키가 있으면 `hidden`을 유지한다.
4. standalone이 아닌 지원 브라우저에서 `beforeinstallprompt`가 오면 이벤트의 기본 UI를 억제하고, 앱 내부 `앱 설치` action을 표시한다.
5. 설치 버튼을 사용자가 누른 경우에만 저장된 이벤트의 `prompt()`를 호출한다. `userChoice` 결과가 accepted이면 안내를 숨긴다. Dismissed이면 브라우저 설치 프롬프트를 자동으로 다시 실행하지 않는다.
6. `appinstalled` 이벤트가 오면 설치 버튼과 안내를 숨기고 local storage에 설치 완료를 기록한다.
7. iOS 브라우저에서 standalone이 아니고 안내를 닫지 않은 경우 브라우저의 공유 메뉴 > 홈 화면에 추가 절차를 안내한다. 이 안내는 OS 알림이 아니다.
8. 닫기 action은 안내를 숨기고 local storage에 닫기 상태를 저장한다.

## 사용자 알림 및 기존 Web Push 경계

- 미설치 사용자에게 OS 푸시/알림 권한을 요청하거나 Web Push 메시지를 보내지 않는다.
- 설치 안내는 앱 내부 UI로 한정하며 알림 권한을 요청하는 버튼을 제공하지 않는다.
- 브라우저가 설치 프롬프트를 열지 못하면 원인을 숨기지 않고 브라우저 메뉴에서 직접 설치하라는 대체 안내를 표시한다.
- 실제 업무 Web Push는 기존 사용자 명시 opt-in, `/sw.js`, backend 구독 및 권한 계약을 유지한다.
- PWA 변경으로 `/sw.js` 내용, 등록 시점, scope, push payload 또는 클릭 이동 동작을 수정하지 않는다.
- 오프라인 사용이나 API 데이터 캐싱을 보장하지 않는다.

## UI 및 접근성

- 안내는 route가 바뀌어도 다시 생성되지 않도록 root-level 컴포넌트로 배치한다.
- 안내 문구와 action은 한국어로 표시한다.
- 주요 action은 `앱 설치`이며, 닫기 action의 accessible label은 `설치 안내 닫기`이다.
- 375px에서 텍스트/버튼이 겹치지 않아야 하며, 768px과 1280px에서 안내가 과도하게 넓어지지 않아야 한다. 주요 앱 route와 로그인 사용을 가리면 안 된다.

## 검증 기준

- manifest 필수 필드, 앱 이름, standalone 표시, root scope 및 아이콘 경로/크기를 검증한다.
- 합성 `beforeinstallprompt` 이벤트에서 prompt가 설치 버튼 클릭으로만 호출되는지와 accepted/dismissed 결과별 상태를 검증한다.
- `appinstalled`, standalone display mode, iOS 수동 설치 안내 및 닫기 상태 보존을 검증한다.
- 기존 Service Worker regression test가 통과해야 한다.
- 프런트엔드 테스트/build/lint와 실제 브라우저의 375px/768px/1280px 화면을 확인하고 스크린샷을 저장한다.
