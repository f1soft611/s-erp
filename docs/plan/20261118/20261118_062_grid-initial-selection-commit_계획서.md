# 그리드 초기 행 선택 commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 초기 선택이 적용되는 commit에 이전 빈 선택을 노출하지 않고 기존 1회 복원 정책을 보존한다.

**Architecture:** 복원 key를 state로 추적하고 기존 nonempty/문자열 정규화/표시 순서/단일 선택 제한을 그대로 render guard에 둔다. 유효한 nextIds가 있을 때만 선택과 key를 함께 게시하므로 같은 key는 다시 적용하지 않는다.

**대안:** 선택 JSX만 초기 ID로 가리면 ref/callback과 불일치하므로 제외한다. 전체 Grid key 재생성은 편집 데이터 손실 위험이 있어 제외한다. microtask 지연·lint 억제로 effect setter를 숨기지 않는다.

## 실행

- [x] 소스가 동일한 061의 4파일 290개를 기준선으로 확인한다.
- [x] 기존 f1-grid.test.tsx에 단일/다중 parameter 회귀 2개를 추가한다. 실제 Grid 부모 layout 관찰자에서 첫 초기 ID 적용을 확인하고 기존 빈 선택 commit의 RED를 구현 전에 확인한다.
- [x] 표시 순서 우선·동일 값 배열 render 뒤 사용자 해제 유지·새 key 적용을 같은 회귀에서 확인한다.
- [x] restoredSelectionKeyRef를 state로 교체하고 동일한 복원 조건을 bounded render guard로 이동한다. 나머지 행 선택·편집·rows 효과는 그대로 둔다.
- [x] F1-GRID 문서에 commit 일치와 동일 key 1회 복원을 기록한다.
- [x] 같은 4파일 292개·typecheck/build/Oxc 80 → 79 새 진단 0, 기존 테스트 byte 보존·source 891파일 parity와 작은 전체 diff를 직접 확인한다. 실제 사용처 공통코드/분류/작업표준서 3파일 62개도 통과했다.
- [x] 실제 Grid 375/768/1280px native 초기 선택·사용자 해제·같은 key render·새 key를 확인한다. fetch/영구 저장소를 차단한다. 요청/문서 넘침 0, checkbox/ref/commit 일치. 소유 탭을 닫았다.
- [ ] 결과/스크린샷·정확한 061 CI를 보관하고 allowlist 커밋·비강제 푸시·원격 일치와 정확한 062 CI를 확인한다.
