# 공통 상세검색 날짜 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공통 상세검색 날짜 범위에 기존 F1-Grid의 축약 날짜 입력과 달력 선택을 적용한다.

**Architecture:** 기존 DateEditor를 공통 입력으로 재사용할 수 있게 확장하고 셀 기본 동작은 보존한다. 검색 폼은 입력 중 문자열을 보관하되 조회 직전에 모든 날짜를 정규화·검증하여 ISO 문자열만 전달한다.

**Tech Stack:** React, TypeScript, MUI TextField/DateCalendar, Dayjs, Vitest, Playwright.

---

## 근거

- [작업지시서](../../directions/20261022/20261022_003_grid_search_date_input_work_instruction.md)
- 기존 축약 입력 사양 및 날짜 검색 기본값 계약을 유지한다.

## Task 1: 날짜 편집기 재사용

**Files:**
- Modify: `frontend/src/shared/components/f1-grid/editing/DateEditor.tsx`
- Test: `frontend/tests/f1-grid.test.tsx`

- [x] 기존 `normalizeDateInput`과 셀 편집 회귀 테스트를 확인한다.
- [x] 검색용 label, 오류, blur 확정, outlined 스타일 및 autoFocus 비활성화 계약을 테스트한다.
- [x] 실패 테스트를 확인하고 선택적 props로 검색 폼 사용을 지원한다. props 생략 시 기존 셀 스타일와 키보드 동작을 유지한다.
- [x] 달력 버튼 포커스 이동이 입력을 잃거나 검색을 실행하지 않는지 확인한다.

## Task 2: 상세검색 통합

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`
- Test: `frontend/tests/page-search-area-detail.test.tsx`

- [x] 숫자 축약 입력, blur 확정, 조회 직전 정규화, 달력 선택, 오류 차단, 삭제 및 reset 테스트를 추가한다.
- [x] `npm run test -- tests/page-search-area-detail.test.tsx`로 신규 테스트 실패를 확인한다.
- [x] 두 native date 입력을 재사용 날짜 입력으로 교체한다. 검색 폼의 label과 접근성 이름을 유지한다.
- [x] 조회 callback 전에 전체 날짜 endpoint를 검증하고, 오류가 있으면 검색 패널을 유지하며 오류를 표시한다.
- [x] 정상 날짜만 `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }` 또는 빈 endpoint로 전달한다.
- [x] 초기화와 외부 값 복원 시 오류 상태도 갱신하고, 날짜 기본값은 기존 전달값을 유지한다.

## Task 3: 검증 및 문서

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Modify: `frontend/src/pages/f1-grid-docs/data/f1GridDocs.ts`
- Test: `frontend/tests/f1-grid-docs.test.tsx`
- Create: `docs/result/20261022/grid-search-date-input/` 결과 문서 및 스크린샷

- [x] 관련 날짜/검색 테스트와 `npm run build`를 실행한다.
- [x] 4173의 기존 S-ERP 서버를 확인해 재사용한다. 직접 서버를 시작한 경우 종료 시 정리한다.
- [x] 375px, 768px, 1280px에서 입력, 오류, 달력, 초기화 동작을 확인한다.
- [x] F1-Grid 사용 문서에 지원 입력 형식, 확정 시점, 오류 처리 및 적용 범위를 설명한다.
- [x] 결과 문서에 원인, 해결, 실제 검증 결과와 제한 사항을 기록한다.
- [x] `git diff --check`와 수정 파일 진단을 확인한다.
