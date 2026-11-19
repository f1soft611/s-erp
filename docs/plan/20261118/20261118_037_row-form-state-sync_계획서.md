# 행 폼 상태 동기화 Implementation Plan

> **실행:** executing-plans 방식으로 이 세션에서 순차 진행한다.

**Goal:** 입력 중 부모 metadata 재렌더가 아닌 실제 open/row 변경에만 초안을 commit 전에 맞춘다.

**Architecture:** draft는 입력 이벤트가 소유하므로 유지한다. 이전 open/row를 하나의 state로 기록하고 변경된 render가 open일 때만 기존 세 setter를 실행한다. 닫힐 때도 이전 입력 key는 갱신하지만 초안/오류/포커스 요청은 건드리지 않는다.

**Tech Stack:** React 19, TypeScript, Vitest/Testing Library, oxlint, Orca.

## 선택과 변경 파일

prop-only 파생은 편집 초안을 잃으며 key remount는 포커스·자식 입력 상태를 버리므로 제외한다. 조건부 own-state 조정만 사용하고 포커스 DOM 작업은 기존 effect에 남긴다.

운영 파일은 `frontend\src\shared\components\f1-grid\form\F1GridFormModal.tsx` 한 개다. 테스트는 기존 `frontend\tests\f1-grid-form-modal.test.tsx`, 계약 설명은 `frontend\src\pages\f1-grid-docs\F1-GRID.md`를 사용한다.

## 실행

- [x] 기존 행 폼 사양, 모달 전체, isolated draft/취소/필수 focus/metadata/모바일 회귀를 확인했다.
- [x] Profiler로 열린 row 교체의 값/local 오류 첫 commit과 닫힌 row 교체 후 재개방 첫 commit 회귀 2개를 추가했다.
- [x] 테스트 파일만 검증 workspace에 복사하고 `vitest run tests/f1-grid-form-modal.test.tsx --pool=threads --maxWorkers=2`로 신규 2개만 stale-commit 실패하는 RED를 확인했다(기존 58개 통과).
- [x] 아래 guard로 복사 effect만 대체했다. ref를 render에서 접근하지 않는다.

```tsx
const [previousInputs, setPreviousInputs] = useState({ open, row });

if (previousInputs.open !== open || previousInputs.row !== row) {
  setPreviousInputs({ open, row });
  if (open) {
    setDraftRow({ ...row });
    setValidationErrors({});
    setFocusRequest(undefined);
  }
}
```

- [x] 관련 form/tree/material/unique/docs/grid 6파일/351개 회귀와 `tsc -b`, `vite build`, `oxlint --format=json`을 확인했다. lint는 110→109이며 나머지 진단은 같다.
- [x] AST로 공개 props/JSX/스타일/이벤트/포커스 effect·기존 테스트 보존과 검증 source 890파일 byte 일치를 확인했다.
- [x] 실제 3폭 행 폼, 필수 오류/포커스, 입력에 따른 부모 metadata 재렌더, 취소/재개방/다른 행/적용 콜백을 합성 값으로 확인했다.
- [x] F1-GRID와 결과·스크린샷 6개를 기록했다. 이전 036 CI 226파일/2,655개는 정확한 SHA로 구분했다.

위 결과를 이 단위의 별도 커밋·비강제 푸시로 동기화한다.
