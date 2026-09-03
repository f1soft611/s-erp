# F1-Grid 개발자 문서 포털 계획서

## 1. 요구사항 및 목적

F1-Grid 사용법과 실제 동작 예제를 한 화면에서 연결해 개발자 공유성을 높인다. 정적 문서 데이터와 기존 F1-Grid 컴포넌트를 활용해 프론트엔드 범위에서 구현한다.

## 2. 작업 범위

### 프론트엔드

- 공개 문서 URL 라우트와 S-ERP 내부 메뉴 진입 경로 추가
- 문서 목록/상세 상태와 반응형 문서 레이아웃 구현
- 정적 문서 콘텐츠, API 표, 코드 예제 데이터 구성
- 옵션 기반 Playground 구현
- 코드 복사 및 복사 성공/실패 상태 처리
- 접근성 레이블, 키보드 탐색, 모바일 접힘 메뉴 적용

### 백엔드

- 변경 없음

### DB

- 변경 없음

## 3. 예상 파일 범위

- `frontend/src/routes/AppRouter.tsx`
- `frontend/src/pages/f1-grid-docs/`
- `frontend/src/shared/components/f1-grid-docs/` 또는 기능 내부 컴포넌트
- `frontend/tests/f1-grid-docs.test.tsx`
- 반응형 Playwright 캡처 스크립트 또는 기존 캡처 흐름

## 4. 영향 범위

기존 `/dashboard/*` 인증 라우팅과 F1-Grid 공통 컴포넌트의 동작은 유지한다. 문서 포털은 독립 화면으로 구현하고 내부 메뉴는 동일 문서 화면으로 연결한다. 샘플 데이터는 문서 포털에만 둔다.

## 5. 검증 계획

- RED: 문서 라우트, 사이드바 전환, Playground 옵션, 코드 복사에 대한 Vitest 테스트 작성
- GREEN: 최소 구현으로 신규 테스트 통과
- REFACTOR: 문서 데이터와 레이아웃/예제 책임 분리
- `cd frontend; npm run test -- tests/f1-grid-docs.test.tsx`
- `cd frontend; npm run test -- tests/f1-grid.test.tsx`
- `cd frontend; npm run build`
- Playwright로 375px, 768px, 1280px 화면 및 핵심 상호작용 캡처

## 6. 비기능 기준

- 공개 문서 화면은 로그인 없이 접근한다.
- 내부 API를 호출하지 않는다.
- 좁은 화면에서 본문이 잘리지 않고 Grid는 필요한 경우 내부 가로 스크롤한다.
- 코드 복사 실패 시 사용자에게 상태를 표시한다.
