# 모바일 영업 등록 및 모듈 바 구현 계획

**Goal:** 모바일 등록 화면에서 합계·스크롤·행 입력과 모듈 전환을 사용할 수 있게 한다.

**Architecture:** 기존 F1-Grid 행 폼을 768px 미만의 기본 행 입력 방식으로 재사용한다. 세 등록 폼의 상세 패널은 자식 콘텐츠보다 작아지지 않게 하고, 대시보드는 모바일에만 모듈 바를 상단 가로형으로 배치한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

근거: [작업지시서](../../directions/20261110/20261110_001_mobile-sales-grid_작업지시서.md).

## 1. F1-Grid 자동 모바일 행 폼

- [x] `frontend/tests/f1-grid-form-modal.test.tsx`에 플러그인 미지정 모바일 추가·취소·검증·수정, 데스크톱/명시적 비활성화 회귀를 추가하고 실패를 확인한다.
- [x] `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`에서 `(max-width: 767px)`를 감지한다. 모바일 기본 플러그인을 해석하고 기존 추가·수정·검증 경로를 재사용한다.
- [x] 읽기 전용 목록에는 자동 수정 액션을 표시하지 않으며 `enabled: false`를 존중한다. 열린 폼은 리사이즈로 유실시키지 않는다.
- [x] `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 공개 prop 설명에 모바일 기본 동작을 반영한다.
- [x] 날짜·일시·시간 입력의 빈 native placeholder와 라벨 겹침을 재현하고 공통 행 폼 필드에서 수정한다.

## 2. 등록 화면 높이와 모듈 바

- [x] `SalesOrderCreatePage.tsx`, `SalesDeliveryCreatePage.tsx`, `DeliveryPlanForm.tsx`의 상세 패널과 그리드 슬롯을 콘텐츠를 수용하는 flex 구조로 수정한다. 수주 도구 버튼은 좁은 화면에서 줄바꿈한다.
- [x] 출하계획의 기존 분할 후 `startEdit`는 모바일에서 자동 행 폼을 연다. 기존 분할 행 생성·삭제와 취소 의미는 유지한다.
- [x] `dashboard-module-section.test.tsx`에 모바일 상단 모듈·임시 메뉴 열기/닫기 회귀를 추가한다. 기존 `dashboard-sidebar.test.tsx`는 그대로 실행하고 변경 전 실패와 비교한다.
- [x] `DashboardPage.tsx`, `DashboardSidebar.tsx`, `DashboardModuleSection.tsx`에서 모바일에만 상단 가로 배치를 적용하고 내부 가로 스크롤을 제공한다. 모바일 메뉴 Drawer는 모듈 바용 좌측 공백을 남기지 않는다.

## 3. 검증과 결과

- [x] `PageHeader.tsx`의 모바일 경로 블록 `width: 100%` 강제를 해제한다. 거래명세서현황의 설명을 접은 상태에서 487px 브라우저로 경로와 조회 버튼이 같은 줄에 있는지 먼저 실패를 확인하고 수정한다. 공간 부족 시 기존 flex wrap은 유지한다.
- [x] `DeliveryPlanForm.tsx`, `SalesStatementCreatePage.tsx`의 상세 패널에 하단 8px, 그리드 좌우 8px를 적용한다. 공유 상세보기·수정에도 적용하며 브라우저에서 실제 inset을 비교한다.

- [x] 관련 Vitest를 실행한다. 기존 대시보드·F1-Grid 전체 테스트의 실패는 변경 전 HEAD와 비교하고 결과에 구분한다.
- [x] `cd frontend; npm run lint; npm run build`를 실행한다. 기존 lint 오류와 변경 파일 검사 결과를 구분한다.
- [x] `frontend/scripts/capture-mobile-sales-grid.mjs`에 합성 데이터만 사용하는 실제 브라우저 회귀를 작성한다. `http://127.0.0.1:4173`의 기존 iPlusMES 서버를 재사용하고 375/768/1280px를 확인한다.
- [x] `docs/result/20261110/mobile-sales-grid`에 원인·해결·검증 범위·스크린샷·복사용 커밋 문구를 기록한다.

선택: 화면마다 플러그인을 켜는 방식은 기본 동작 요청에 맞지 않고, 모바일 전용 표를 별도로 만드는 방식은 기존 셀 정의·계산을 중복하므로 사용하지 않는다.

결과: [구현·검증 기록](../../result/20261110/mobile-sales-grid/20261110_001_mobile-sales-grid_결과.md).
