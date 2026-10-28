# 현황 빈 조회 결과 공통 메시지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 수주현황과 문서현황의 정상 0건 조회 안내를 검색조건 아래 공통 메시지 영역에 표시한다.

**Architecture:** 기존 PageMessageArea에 선택적 action과 role을 추가하고 닫기 콜백을 선택 사항으로 만든다. EmptySearchResultMessage가 정보성 문구와 초기화 버튼을 공통 제공하며 두 페이지가 조회 상태에 따라 명시적으로 렌더링한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Playwright.

---

## Task 1: 요구사항과 회귀 테스트

**Files:** `frontend/tests/document-status-page.test.tsx`, `frontend/tests/sales-order-status-page.test.tsx`

- [x] 기존 문서현황 0건 테스트에 공통 info 메시지가 그리드보다 앞에 위치하는 검증을 추가한다.
  ```tsx
  const message = (await screen.findByText(/조회 결과가 없습니다/)).closest('[role="status"]')!;
  expect(message).toHaveClass('MuiAlert-colorInfo');
  expect(message.compareDocumentPosition(screen.getByRole('grid', { name: '문서현황' }))
    & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  ```
- [x] 수주현황에 최초 조회 대기 → 0건 → 초기화 재조회 대기 → 오류 흐름을 추가한다. 초기화 후 `orderDtFrom=2026-09-27`, `orderDtTo=2026-10-27`이 유지되는지 확인한다.
- [x] `cd frontend; node node_modules\vitest\vitest.mjs run tests\document-status-page.test.tsx tests\sales-order-status-page.test.tsx --maxWorkers=1`를 실행한다. 기존 하단 Box와 수주현황 안내 누락으로 실패해야 한다.

## Task 2: 최소 구현

**Files:** `frontend/src/shared/components/PageMessageArea.tsx`, `frontend/src/shared/components/EmptySearchResultMessage.tsx`, 두 현황 Page 및 `useSalesOrderStatusList.ts`

- [x] PageMessageArea에 `action?: ReactNode`, `role?: 'alert' | 'status'`, `onClose?: () => void`를 정의한다. 기본 role은 alert로 보존한다. action은 좁은 화면에서 줄바꿈 가능하게 배치한다.
- [x] EmptySearchResultMessage는 다음 계약으로 PageMessageArea를 재사용한다.
  ```tsx
  <PageMessageArea
    message="조회 결과가 없습니다. 조회 기간을 넓히거나 상세검색 조건을 초기화해 주세요."
    severity="info"
    role="status"
    action={<Button type="button" size="small" onClick={onReset}>검색 조건 초기화</Button>}
  />
  ```
- [x] 수주 목록 훅에 `hasLoaded`를 추가하고 조회 시작 시 false, 정상 응답 시 true로 변경한다. 기존 조용한 갱신도 `initialLoad.loading`으로 숨김을 보장한다.
- [x] 두 페이지에서 `hasLoaded && !initialLoad.loading && !loading && !defaultsError && !error` 및 0건 조건일 때 기존 오류 영역 다음, 그리드 이전에 공통 안내를 배치한다. 문서현황 하단 전용 컴포넌트는 제거한다.
- [x] 관련 테스트 전체를 실행하여 통과를 확인한다.

## Task 3: 검증과 결과

- [x] `cd frontend; npm run build`, `npm run lint`를 실행한다. 빌드는 성공했으며 전체 린트의 기존 오류와 변경 파일 한정 검사 결과는 결과 문서에 구분한다.
- [x] 기존 4173 S-ERP 서버를 재사용하고 API를 가로챈 가상 데이터로 두 실제 페이지를 375/768/1280px에서 확인한다.
- [x] 각 화면의 안내 위치, 가로 넘침 없음, 초기화 및 오류 시 안내 숨김을 검증하고 스크린샷을 `docs/result/20261028/status-empty-message/screenshots`에 저장한다.
- [x] `docs/result/20261028/status-empty-message/20261028_015_status-empty-message_결과.md`에 변경 범위와 검증 근거를 기록한다.
- [x] 다른 작업의 미커밋 변경은 보존하고 요청받지 않은 커밋/병합은 수행하지 않는다.
