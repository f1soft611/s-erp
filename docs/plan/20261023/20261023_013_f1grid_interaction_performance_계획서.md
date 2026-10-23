# F1-Grid Interaction Performance Implementation Plan

**Goal:** 100행 선택·편집의 전체 셀 렌더와 저장 후 중복 재생성을 제거한다.

**Architecture:** 표시 셀의 메모이제이션은 시각 상태를 비교하고, 이벤트는 최신 콜백을 유지하는 얇은 래퍼로 전달한다. 편집값은 편집 셀에만 전달하며 고정 위치는 값으로 비교한다. 저장 후 목록 재조회가 끝난 뒤 그리드를 초기화한다.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261023/20261023_013_f1grid_interaction_performance_작업지시서.md)
- 기존 스크롤 사양은 유지하며 가상화 임계값이나 데이터 계약을 변경하지 않는다.

## 단계

- [x] `frontend/tests/f1-grid-render-performance.test.tsx`에 고정열 포함 100행 선택·편집 렌더 횟수와 최신 키보드/콜백 회귀 테스트를 작성하고 실패를 확인한다.
- [x] `frontend/src/shared/components/f1-grid/core/GridRow.tsx`에서 `draftValue={editing ? draftValue : ''}`로 전달한다.
- [x] `frontend/src/shared/components/f1-grid/core/GridCell.tsx`에서 고정 위치의 side/offset/shadow를 비교하고 이벤트 콜백은 최신 props를 통해 실행한다. 기존 셀 표시 계약은 유지한다.
- [x] 저장 후 재조회 대기 중 gridKey가 바뀌지 않는 테스트를 추가한다. 품목·거래처 관리 훅에서 재조회 종료 후 초기화하되, 저장 성공/조회 실패 시에도 변경사항을 지워 중복 저장을 막는다.
- [x] 집중 테스트, 기존 그리드 회귀 테스트 및 `npm run build`를 실행한다.
- [x] 동일 브라우저 합성 100행에서 전후 렌더 횟수와 React commit 시간을 비교하고 반응형 스크린샷을 저장한다.
- [x] F1-Grid 사용자 문서와 결과 문서에 원인·수정·검증·API 미측정 한계를 기록한다.

## 실제 공유 화면을 통한 추가 확인

- 품목 화면의 103행, 표시 셀 1,133개 및 열 가상화 활성 상태를 확인했다. 표시 인덱스가 동일해도 Set 참조가 바뀌는 경로가 초기 합성 테스트에서 누락됐다.
- 표시 열 집합 재사용, 행별 선택/편집 상태 비교, 최신 이벤트 전달, 드래그 상태의 부모 CSS 전달, 헤더 memo와 비체크박스 열의 불필요한 전체 행 조회 제거를 추가했다.
- 8개 성능 회귀 테스트는 열 가상화를 활성화한 상태로 검증한다. 다른 행에서 선택 취소 후 이전 행에서 드래그를 다시 시작하는 동작도 포함한다.
- 공유 화면에서 실제 데이터를 저장하지 않고 선택 및 임시 편집/Escape 취소를 측정했다.
- 구현·집중 검증·브라우저 측정·스크린샷·문서 기록을 수행했다. 광역 테스트의 기존 실패와 확인 한계는 결과 문서에 별도로 기록한다.

## 검증 명령

`cd frontend; npm run test -- tests/f1-grid-render-performance.test.tsx tests/material-management.test.tsx`

기대: 회귀 테스트 통과. 이후 기존 F1-Grid 테스트 묶음, 품목/거래처 관련 테스트와 빌드를 검증한다. 시간 단위 테스트 대신 렌더 개수의 결정적 상한을 검사하고 실제 시간은 브라우저에서 측정한다.
