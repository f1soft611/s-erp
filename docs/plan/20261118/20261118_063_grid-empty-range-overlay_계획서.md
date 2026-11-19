# 그리드 빈 범위 표시 초기화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 범위가 사라진 commit에 이전 기하 overlay를 노출하지 않는다.

**Architecture:** cellSelection/copiedCellRange가 없고 rangeOverlay가 정의된 경우에만 render에서 null로 비운다. 기존 effect의 범위 부재 setter만 제거한다. 나머지 updateRangeOverlay·DOM refs·측정/구독·이벤트는 그대로 둔다.

**대안:** JSX만 가리면 stale geometry state가 남으므로 제외한다. 측정을 animation frame으로 지연하거나 lint 억제로 setter를 숨기지 않는다. 전체 측정 store 재작성은 이 진단의 범위를 넘는다.

## 실행

- [x] 소스가 동일한 062의 4파일 292개를 기준선으로 확인한다.
- [x] 기존 f1-grid.test.tsx에 실제 Grid/Profiler의 drag/copy Escape parameter 회귀 2개를 추가한다. 첫 범위 해제 commit에 이전 overlay가 관찰되는 RED를 구현 전에 확인한다.
- [x] bounded no-range overlay reset과 effect 부재 setter 제거만 적용한다. 같은 회귀에서 행 선택·변경 데이터와 새 범위 생성 보존을 확인한다.
- [x] F1-GRID 문서에 범위 해제 commit 동작을 기록한다.
- [x] 같은 4파일 294개·typecheck/build와 source 891파일 parity·기존 테스트 보존을 확인한다. Oxc는 79 → 79개다. 기존 setter 진단을 제거하자 동일 effect의 기존 `updateRangeOverlay()` 호출이 진단되어 당초 78개 예상은 달성하지 못했다. 위치/소스까지 대조했으며 DOM 측정 경로를 변경하지 않고 후속 대상으로 남긴다.
- [x] 실제 Grid/Profiler 375/768/1280px native pointer 범위 → Escape → 새 범위를 확인한다. fetch/영구 저장소/OS clipboard를 사용하지 않는다. 첫 해제 commit부터 null이며 행 선택과 변경 데이터를 보존했다. 요청/문서 넘침 0, 소유 탭을 닫았다.
- [x] 결과/스크린샷·작은 전체 diff 리뷰·정확한 062 CI를 보관하고 allowlist 18파일을 `f15bcd6c3cfd0ea32d0241ab17c44e506f95c2c9`로 커밋·비강제 푸시·원격 일치를 확인했다. 정확한 063 CI 44372270943 네 job과 마지막 전체 집계 227파일 2,700개 통과를 확인했다.
