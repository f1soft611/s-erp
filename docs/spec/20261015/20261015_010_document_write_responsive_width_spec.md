# 문서작성 상세 패널 반응형 너비 상세사양서

## 1. 현상과 목적

375px 뷰포트의 저장된 문서 상세 캡처에서 우측 상세 패널이 화면 오른쪽에서 잘린다. 문서작성 페이지 flex 루트가 내부 최소 콘텐츠 너비보다 작아질 수 있도록 하여, 상세 오버레이가 현재 페이지 영역을 기준으로 표시되게 한다.

## 2. 적용 규칙

- `DocumentWritePage` 루트는 `flex: 1` 및 `position: relative`를 유지하고 `minWidth: 0`을 제공한다.
- `PageAreaOverlay`는 계속 해당 페이지 루트를 containing block으로 사용한다.
- overlay의 desktop 폭, 767px 이하의 폭, z-index, overflow, backdrop 및 Escape 닫기 동작은 변경하지 않는다.
- 변경은 문서작성 페이지에 한정하며 대시보드 공통 flex 구조나 공지 페이지에 전파하지 않는다.

## 3. 회귀 기준

1. 문서작성 페이지가 목록 상태로 렌더링되면 `data-testid="document-write-page"` 루트가 `min-width: 0`을 적용한다.
2. 기존 페이지 헤더, 문서 목록, 상세 열기/닫기, 결재 툴바 및 권한 동작은 동일하게 유지한다.
3. 실제 브라우저에서 가능한 경우 375px, 768px, 1280px에서 문서 페이지와 상세 패널의 rect가 가용 페이지 영역을 넘지 않아야 한다.
4. 전체 문서의 `scrollWidth`는 `innerWidth` 이하이어야 한다.
5. 실제 브라우저 인증이 불가능하면 해당 치수 기준은 미검증으로 표시하고, 캡처 또는 측정 결과를 만들어내지 않는다.

## 4. 테스트 및 검증

- 먼저 문서작성 페이지 통합 테스트의 루트 스타일 assertion을 추가하고 해당 테스트를 단독 실행해 실패를 확인한다.
- 구현 후 아래 테스트를 실행한다.

```powershell
Set-Location frontend
npx vitest run tests/document-write-page.test.tsx --testNamePattern="renders at the groupware write route instead of the coming-soon page"
npx vitest run tests/post-detail-panel.test.tsx
npm run build
```

- 변경 파일 Problems 검사 및 `git diff --check`를 실행한다.
- 인증된 앱 브라우저가 접근 가능하면 375px, 768px, 1280px 치수와 가로 스크롤을 검증한다. 접근 불가 시 결과 문서에 제한을 기록한다.

## 5. 제외

- 모든 페이지에 적용되는 공통 최소 너비 규칙
- 뷰포트 고정 오버레이 전환
- 결재 및 문서 상태·권한·API·백엔드 변경
