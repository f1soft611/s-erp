# F1-Grid Horizontal Scroll Implementation Plan

**Goal:** 가로 스크롤의 역방향 되먹임과 불필요한 가상 열 교체를 제거한다.

**Architecture:** 본문을 스크롤 기준으로 유지하되 헤더/합계에 마지막으로 쓴 실제 위치를 기록해 후속 이벤트와 직접 입력을 구분한다. 기존 컬럼 가상화 계산에 선택적 이전 열 집합을 받아 viewport가 그 집합 안에 있으면 재사용한다. 다중 컬럼 표의 단일 commit 비용은 기존 행 가상화를 셀 수 기준으로도 자동 활성화해 제한한다. 레이아웃 및 공개 props는 바꾸지 않는다.

**Tech Stack:** React, TypeScript, Vitest, 프로젝트의 Playwright 브라우저 테스트.

근거: [작업지시서](../../directions/20261117/20261117_012_f1grid-horizontal-scroll_작업지시서.md).

## 1. 실패 회귀 테스트

- [x] `frontend/tests/f1-grid.test.tsx`: 본문 1,200 → 1,240 이후 지연된 헤더/합계 이벤트가 본문을 되돌리지 않아야 한다. 헤더/합계의 직접 변경은 다른 두 영역에 전파되어야 한다.
- [x] `frontend/tests/f1-grid-virtualization.test.ts`: 이전 가상 열 집합을 전달하고 viewport가 내부에 있으면 같은 인덱스 배열, 범위를 벗어나거나 보호 열이 추가되면 새 범위를 기대한다.
- [x] `cd frontend; npm run test -- tests/f1-grid-virtualization.test.ts tests/f1-grid.test.tsx`로 수정 전 실패를 확인한다.

## 2. 최소 구현

- [x] `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts`: `previousIndexes?: ReadonlySet<number>`를 추가한다. overscan 없이 실제 viewport와 고정/보호 열이 모두 이전 집합에 있으면 이전 인덱스를 반환하고, 아니면 기존 overscan 계산을 적용한다.
- [x] `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`: 가상화 설정(너비, viewport, pinned/protected, overscan 등)이 같을 때만 이전 집합을 전달한다. 스크롤 이벤트의 갱신 판단과 실제 렌더가 동일 계산을 사용하도록 한다.
- [x] 같은 파일의 동기화 effect에서 헤더/합계별 마지막 동기화 값을 기록한다. 기록과 같은 위치의 후속 이벤트는 무시하고, 다른 위치의 직접 변경은 본문에 적용한 뒤 다른 영역도 즉시 맞춘다.
- [x] 추가 측정으로 남은 단일 렌더 지연에 대해 `f1-grid.test.tsx`에 120행 × 12열 자동 가상화 및 명시적 `virtualizeRows={false}`·병합 컬럼 보존 테스트를 먼저 추가하고 실패를 확인한다. `F1Grid.tsx`의 자동 조건을 `행 수 >= 200 || (병합 컬럼 없음 && 행 수 * 표시 컬럼 수 >= 1000)`으로 확장한다. 기존 세로 창 계산을 그대로 재사용한다.

## 3. 검증과 결과

- [x] 위 테스트와 render-performance, summary, pinned-range, row-merge 회귀를 실행한다.
- [x] `npm run lint -- src/shared/components/f1-grid/core/F1Grid.tsx src/shared/components/f1-grid/core/GridVirtualization.ts tests/f1-grid.test.tsx tests/f1-grid-virtualization.test.ts tests/f1-grid-smooth-scroll.browser.mjs` 및 `npm run build`를 실행한다. lint는 기존 경고와 함께 종료 코드 0이며, 전체 빌드는 별도 기존 타입 오류로 차단되어 결과 문서에 기록했다. Vite 번들 생성은 별도 통과했다.
- [x] `frontend/tests/f1-grid-smooth-scroll.browser.mjs`를 확장해 지연 이벤트, 연속 이동, 중간 프레임 헤더/본문/합계 정렬, viewport 열 누락, 직접 헤더/합계 입력과 375/768/1280px 화면을 검증한다.
- [x] 동일 합성 데이터의 수정 전후 commit/DOM 변경/렌더 시간을 비교한다. 고정 수치 FPS를 CI 합격 조건으로 사용하지 않는다.
- [x] `frontend/src/pages/f1-grid-docs/F1-GRID.md`와 `docs/result/20261117/f1grid-horizontal-scroll` 결과 및 스크린샷을 갱신한다. 기존 4173 서버를 재사용하며 종료하지 않는다.

검토: 모든 작업지시서 조건을 위 단계에 대응시켰으며 DB 변경, 새 스크롤 애니메이션, 무관한 작업 트리 변경은 제외했다. 이 세션에서 직접 순서대로 실행하며 사용자 요청 없이 커밋하지 않는다.
