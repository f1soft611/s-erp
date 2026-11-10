# iPlusMES 모바일 PWA 설치 지원 결과

## 작업 내용

- `frontend/public/manifest.webmanifest`, 192/512 PWA 아이콘, 180 iOS touch icon과 `frontend/index.html`의 설치 메타데이터를 추가했다.
- 기존 브랜드 push 아이콘을 기준으로 크기별 아이콘을 만들었다.
- 앱 root에 설치 안내를 추가했다. 지원 브라우저는 사용자 클릭 시 native 설치 prompt를 열고, iOS는 공유 메뉴의 홈 화면 추가 방법을 안내한다.
- 사용자가 설치 안내를 닫으면 다시 표시하지 않으며, 설치 완료/standalone 실행에서도 숨긴다. OS 알림 권한은 요청하지 않는다.
- 기존 `/sw.js`, Web Push 등록 흐름, backend, API와 DB는 변경하지 않았다. 오프라인 캐시는 제공하지 않는다.

## 검증

- 통과: `npm run test -- tests/pwa-install-prompt.test.tsx tests/pwa-manifest.test.ts tests/push-service-worker.test.ts` — 16 tests
- 통과: `npm run build`
- 통과: `npx oxlint src/shared/components/PwaInstallPrompt.tsx src/App.tsx tests/pwa-install-prompt.test.tsx tests/pwa-manifest.test.ts tests/pwa-install.browser.mjs`
- 통과: `node tests/pwa-install.browser.mjs` — 375px, 768px, 1280px, iOS 수동 설치 안내 및 manifest 확인
- 통과: production build에 manifest 및 세 아이콘이 생성됨
- 기존 로그인 통합 테스트 10개 중 9개 통과. 1개는 현재 화면의 MES 문구 대신 이전 ERP 문구를 기대하는 기존 assertion 불일치로 실패하며, PWA 변경 범위와 무관해 수정하지 않았다.

## 브라우저 캡처

- `screenshots/pwa-install-375px.png`
- `screenshots/pwa-install-768px.png`
- `screenshots/pwa-install-1280px.png`
- `screenshots/pwa-install-ios-manual.png`

캡처에서는 개발용 계정 정보를 제외했다. 브라우저 설치 테스트는 이미 실행 중이던 iPlusMES 개발 서버 `http://127.0.0.1:4173`을 재사용했다.

## 운영 메모

- 실제 설치에는 production에서 HTTPS가 필요하다. localhost는 개발 테스트용 secure context로 사용할 수 있다.
- 브라우저 설치 가능성/메뉴는 브라우저 정책에 따르며, iOS에서는 사용자가 공유 메뉴에서 직접 홈 화면 추가를 선택해야 한다.
- Web Push는 설치 여부와 별도이며 기존 사용자 명시 opt-in 흐름을 따른다.
- 오프라인 사용과 API 데이터 캐싱은 구현하지 않았다.

## 커밋 메시지 제안

```text
feat: add mobile PWA installation

Add install metadata and an in-app installation guide for supported mobile browsers.
```
