# 영업관리 폼 공통 날짜 입력 Implementation Plan

**Goal:** 영업관리 폼 날짜 입력을 기존 DateEditor로 통일한다.

**Architecture:** 기존 폼과 저장 흐름을 유지하면서 outlined DateEditor를 직접 사용한다. 공통 편집기에 선택적 disabled를 추가하며 기본 셀 편집 동작은 바꾸지 않는다. 각 폼에서 blur/저장 정규화와 오류 차단을 수행한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261117/20261117_003_sales-form-datefield_작업지시서.md)
- 기준 화면: 수주등록의 기존 반응형 기본정보 폼.
- 견적은 같은 날짜의 작업 002에서 공통 입력기 전환을 진행 중이므로 해당 변경을 보존하고 함께 회귀 검증한다.

## 실행 순서

- [x] `frontend/tests/sales-order-create-page.test.tsx`, `sales-delivery-page.test.tsx`, `sales-statement-page.test.tsx`에 축약 입력 확정, 저장 직전 정규화, 무효 날짜 차단, 비활성 달력 테스트를 추가한다.
- [x] `cd frontend; npm run test -- tests/sales-order-create-page.test.tsx tests/sales-delivery-page.test.tsx tests/sales-statement-page.test.tsx`로 기존 네이티브 날짜 입력에서 실패함을 확인한다.
- [x] `shared/components/f1-grid/editing/DateEditor.tsx`에 `disabled?: boolean`을 추가하여 입력·달력 버튼·팝오버를 함께 비활성화한다. 미지정 시 기존 동작을 유지한다.
- [x] `SalesOrderCreatePage.tsx`의 수주일자·납기일자를 `DateEditor variant="outlined" autoFocus={false}`로 변경한다. blur에서 `normalizeDateInput`으로 확정하고 저장에서는 blur 없이도 재검증한다. 필수 수주일과 선택 납기일 정책은 유지한다.
- [x] `SalesDeliveryCreatePage.tsx`의 출하일자를 전환하고 저장 payload 작성 전에 날짜를 정규화·검증한다.
- [x] `SalesStatementCreatePage.tsx`와 `hooks/useSalesStatementCreate.ts`의 명세일 입력·검증을 전환한다. 원천 출하일자는 disabled 공통 편집기로 표시한다.
- [x] 관련 영업관리 등록·현황, 공통 검색 및 날짜 편집 테스트를 실행하고 `npm run build`, 변경 파일 lint를 실행한다.
- [x] 4173의 실제 브라우저에서 네 가지 등록 폼을 375/768/1280px로 확인하고 달력·축약 입력·가로 넘침을 검증한다.
- [x] 날짜별 결과 문서, 스크린샷, 복사 가능한 커밋 제목·내용을 기록한다. 실제 커밋은 만들지 않는다.
