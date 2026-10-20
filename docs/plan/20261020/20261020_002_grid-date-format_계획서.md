# F1-Grid date format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 공통 date 컬럼에서 지정 형식과 기본 `yyyy-mm-dd` 표시를 지원한다.

**Architecture:** 기존 `getCellDisplayValue`에 date 분기를 추가한다. 날짜 검증에 기존 의존성 Day.js를 사용하고 표시 형식만 변환한다. 셀/자동 너비/Excel은 기존 공통 호출을 유지한다.

**Tech Stack:** React, TypeScript, Day.js, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261020/20261020_002_grid-date-format_작업지시서.md)
- 상세 사양은 이 계획을 기준으로 같은 번호의 사양 문서에 작성한다.

## Task 1: 실패 테스트

- [x] `frontend/tests/f1-grid-date-format.test.tsx`에 기본 날짜, ISO timestamp, 사용자 형식, 빈 값, 잘못된 날짜, 편집 원본 보존 테스트를 작성한다.
- [x] `getCellDisplayValue({ field: 'date', headerName: 'Date', type: 'date' }, '2026-10-20T09:21:00')`이 `'2026-10-20'`인지 검사한다.
- [x] 같은 컬럼에 `format: 'yyyy/mm/dd'`를 지정하면 `'2026/10/20'`인지 검사한다.
- [x] 대상 테스트를 실행하여 원문 timestamp 표시로 실패하는지 확인한다.

## Task 2: 타입 및 표시 구현

- [x] `frontend/src/shared/components/f1-grid/types/grid.types.ts`의 `format`을 문자열로 확장하여 날짜 마스크와 기존 숫자 형식을 함께 허용한다. 별도 타입 추상화는 추가하지 않고 기존 `F1GridNumberFormat` 공개 타입을 유지한다.
- [x] `frontend/src/shared/components/f1-grid/utils/grid.utils.ts`에서 `column.type === 'date'`일 때 날짜를 검증하고 지정 형식 또는 기본 형식을 적용한다.
- [x] ISO timestamp는 명시된 날짜 부분을 사용하여 클라이언트 시간대 때문에 날짜가 바뀌지 않게 한다. 잘못된 날짜는 원문을 유지한다.
- [x] 원본 행과 편집/검색 처리 및 datetime/time 분기는 수정하지 않는다.
- [x] `frontend/src/pages/f1-grid-docs/F1-GRID.md`에 지원 토큰, 기본값, 예시 및 원본 보존 동작을 추가한다.

## Task 3: 검증 및 결과

- [x] 새 테스트, 기존 숫자/날짜 편집 테스트와 `frontend/tests/document-status-page.test.tsx`를 실행한다. 기존 51건 실패는 사용자 승인으로 수정 범위에서 제외하고, 통과하는 관련 기존 테스트와 새 날짜 테스트를 선별 실행한다.
- [x] `frontend`에서 `npm run build`를 실행한다.
- [x] 기존 4173 서버를 확인하고 재사용하거나 `npm run dev -- --strictPort`로 시작한다.
- [x] 합성 데이터로 실제 공통 그리드를 375/768/1280px에서 렌더링하여 기본/지정 날짜 표시와 페이지 overflow를 확인하고 스크린샷을 남긴다.
- [x] `docs/result/20261020/grid-date-format`에 재현/원인/수정/검증/제약을 기록한다.
- [x] 직접 시작한 서버와 임시 검증 파일만 정리한다. 기존 사용자 변경은 커밋하거나 되돌리지 않는다.
