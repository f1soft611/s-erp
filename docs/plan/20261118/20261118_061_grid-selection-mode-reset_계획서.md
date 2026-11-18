# 그리드 선택 모드 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모드 전환 commit 전에 이전 셀/복사 범위를 비우고 기존 행 선택과 편집 데이터를 유지한다.

**Architecture:** 이전 selectionMode를 state로 추적하고 실제 변경에만 셀 범위·복사 범위·드래그 여부·기하 overlay state를 비운다. ref 초기화는 기존 effect에 유지한다. 같은 모드의 render에서는 guard가 작동하지 않는다.

**대안:** 반환 JSX에서 overlay만 가리면 범위 state가 남아 재진입 때 노출될 수 있어 제외한다. microtask 지연이나 lint 억제로 effect setter를 숨기지 않는다. 전체 선택 reducer/컴포넌트 key 재생성은 변경 범위와 편집 초기화 위험이 커 제외한다.

## 실행

- [x] 소스가 동일한 060의 정책 포함 4파일 288개를 기준선으로 확인한다.
- [x] 기존 f1-grid.test.tsx에 실제 Grid와 부모 layout 관찰자를 사용한 drag/copy parameter 회귀 2개를 추가한다. 동일 모드 render는 범위를 유지하고 모드 전환 commit에는 범위가 없는지 구현 전 RED를 확인한다.
- [x] 행 checkbox 선택·편집 변경 보존과 cell 모드 재진입 때 빈 범위를 같은 회귀에서 확인한다.
- [x] F1Grid에 bounded mode reset을 추가하고 기존 effect의 state setter 3개만 제거한다. 나머지 ref 초기화·기하 측정 effect·이벤트는 그대로 둔다.
- [x] F1-GRID 문서에 동일 모드 유지와 모드 전환 commit 초기화를 기록한다.
- [x] 같은 4파일 290개·typecheck/build/Oxc 81 → 80, 새 진단 0과 source 891파일 byte parity·기존 테스트 보존을 확인하고 작은 전체 diff를 직접 리뷰한다.
- [x] 실제 F1Grid 375/768/1280px native 범위 선택·모드 전환/재진입과 행 선택 보존을 확인한다. fetch/영구 저장소를 차단하고 OS clipboard를 사용하지 않는다. 요청/넘침 0, 재진입 뒤 새 pointer 범위 정상. 소유 탭을 닫았다.
- [ ] 결과/스크린샷·정확한 060 CI를 기록하고 allowlist 커밋·비강제 푸시·원격 일치 및 정확한 061 CI를 확인한다.
