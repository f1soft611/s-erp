# 고정 병합 셀 클릭 Implementation Plan

> **For agentic workers:** 이 세션에서 순서대로 실행하고 각 단계의 결과를 확인한다.

**Goal:** 수주번호 병합 링크가 고정 방향과 무관하게 클릭되며 빈 공간의 상세 행 선택을 보존한다.

**Architecture:** 고정 셀의 sticky stacking context 때문에 뒤쪽 투명 셀이 링크를 가리는 문제다. 사용자 정의 콘텐츠가 있는 고정 병합 시작 셀만 상위 레이어로 올리고, 컨테이너의 포인터는 통과시킨다. 콘텐츠와 첫 행 높이의 hit area만 포인터를 받게 하여 뒤쪽 행 선택 영역을 유지한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright Chromium.

- 작업지시서: [016](../../directions/20261027/20261027_016_f1grid-pinned-merge-click_작업지시서.md)

## 실행 순서

- [x] `frontend/tests/f1-grid-pinned-merge.browser.mjs`를 추가한다. 실제 수주현황 컬럼과 합성 상세 행을 렌더링하고, 병합 링크의 중앙 좌표 클릭 후 콜백 결과를 확인한다. 고정 방향, 2/3행 병합, 상세 행 빈 공간 선택, 가로 스크롤을 확인한다.
- [x] 4173의 기존 S-ERP Vite 서버에서 `node --test tests\f1-grid-pinned-merge.browser.mjs`를 실행한다. 기존 코드에서 고정 링크 클릭 실패를 확인한다.
- [x] `frontend/src/shared/components/f1-grid/core/GridCell.tsx`를 수정한다. 고정된 사용자 정의 병합 시작 셀만 `zIndex: 3`, `pointerEvents: 'none'`을 적용한다. 첫 행 높이의 `::before`와 `display: contents` 콘텐츠 래퍼에는 `pointerEvents: 'auto'`를 적용한다. 일반 셀, 병합 후속 셀, 편집 셀은 기존 계약을 유지한다.
- [x] 브라우저 회귀 테스트와 기존 병합/고정 열/행 선택/수주현황 테스트를 실행한다. `npm run build`, `npm run lint`를 확인한다. 전체 lint와 범용 그리드 테스트의 기존 실패는 결과 문서에 별도 기록한다.
- [x] F1-GRID 문서에 고정 병합 콘텐츠의 클릭/빈 공간 선택 계약을 추가하고 결과 문서에 재현·원인·해결·검증과 스크린샷을 기록한다.

## 영향 범위

백엔드, API, DB, 수주현황 컬럼 기본 고정 설정은 변경하지 않는다. 기존 엑셀 서식 작업의 미커밋 변경은 보존한다. 별도 커밋은 요청되지 않았으므로 생성하지 않는다.
