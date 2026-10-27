# F1-Grid 고정 컬럼 스크롤 자연스러움 개선 계획서

- 작업지시서: [017](../../directions/20261027/20261027_017_f1grid-smooth-pinned-scroll_작업지시서.md)
- 상세 사양서: [017](../../spec/20261027/20261027_017_f1grid-smooth-pinned-scroll_상세사양서.md)
- 승인 설계: [F1-Grid 고정 컬럼 스크롤 자연스러움 개선 설계](../../superpowers/specs/2026-10-27-f1grid-smooth-pinned-scroll-design.md)
- 실행 계획: [F1-Grid 고정 컬럼 스크롤 자연스러움 개선 Implementation Plan](../../superpowers/plans/2026-10-27-f1grid-smooth-pinned-scroll.md)

## 목표

브라우저의 본문 가로 스크롤과 sticky 고정은 그대로 두고, 가로 스크롤 위치 변경이 필요한 열 가상화 창을 바꿀 때만 React 렌더 상태에 반영한다. 비가상화 상태와 같은 가상 열 범위 안의 픽셀 이동은 전체 그리드 상태 갱신을 유발하지 않게 한다.

## 작업 순서

1. 기존 viewport metrics RAF 스케줄러 및 virtual column range 계산을 보조하는 집중 회귀 테스트를 먼저 작성한다.
2. 스크롤 이벤트 경로를 변경해 수평 위치는 열 virtual range 변경 시에만 상태에 반영하고, 세로 위치/크기/gutter 측정은 기존 동작을 유지한다.
3. 회귀 테스트, 관련 F1-Grid 테스트, 빌드와 lint를 실행한다.
4. `frontend/src/pages/f1-grid-docs/F1-GRID.md`에 스크롤/가상화 성능 계약을 기록한다.
5. 개발 서버 4173 포트를 준수하여 Chromium에서 헤더·본문 정렬, 고정 열, 데스크톱/태블릿/모바일 뷰포트를 확인한다.
6. `docs/result/20261027/f1grid-smooth-pinned-scroll/`에 재현 조건, 원인, 변경, 검증 결과 및 스크린샷을 기록한다.

## 대상 파일

- `frontend/src/shared/components/f1-grid/core/F1Grid.tsx`
- `frontend/src/shared/components/f1-grid/core/GridVirtualization.ts` (공유 비교/창 계산 로직이 필요한 경우에만)
- `frontend/tests/f1-grid.test.tsx`
- `frontend/tests/f1-grid-virtualization.test.ts` (공유 함수가 변경되는 경우에만)
- `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- 결과 문서 및 브라우저 스크린샷

## 위험 및 제어

- 스크롤 위치를 상태에서 제거하면 가상화 창이 늦게 바뀌거나 보호 열이 빠질 수 있으므로 virtual range 전환 경계를 검증한다.
- 세로 스크롤/리사이즈/scrollbar gutter 상태 갱신과 수평 스크롤 최적화를 분리한다.
- 기존 헤더/본문 동기화와 끝단 정렬은 변경하지 않는다.
- 현재 작업 트리의 다른 F1-Grid Excel 변경은 범위 밖이며 그대로 보존한다.
