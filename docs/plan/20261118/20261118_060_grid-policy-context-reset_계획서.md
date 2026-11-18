# 그리드 소수점 컨텍스트 해제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모듈 컨텍스트를 해제한 commit에 이전 소수점 rule을 노출하지 않고 기존 조회·취소 계약을 보존한다.

**Architecture:** 모듈 부재와 정의된 rule을 함께 확인하는 guarded render reset을 사용한다. effect의 부재 분기에서는 조회 없이 return한다. 기존 비동기 조회와 active cleanup, 정책 service/API와 다른 모듈 간 전환은 그대로 둔다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, Orca.

## 1. 근거와 RED

단순히 반환값만 undefined로 가리면 해제 후 재진입 때 오래된 cached state가 재노출될 수 있어 제외한다. null reset을 microtask로 미루는 방법도 effect 상태 갱신을 숨기므로 제외한다. null일 때 정의된 state를 한 번만 비우는 render guard를 선택한다.

**Modify:** `frontend/src/shared/components/f1-grid/core/gridDecimalPolicyContext.ts`, `frontend/tests/grid-decimal-policy.test.tsx`, `frontend/src/pages/f1-grid-docs/F1-GRID.md`.

**Related:** `frontend/tests/f1-grid-render-performance.test.tsx`, `frontend/tests/f1-grid.test.tsx`, `frontend/tests/menu-management-f1-grid.test.tsx`.

- [x] 기존 정책 파일 9개와 소스가 동일한 059의 그리드 3파일 278개를 기준선으로 확인한다.
- [x] 기존 정책 테스트 파일에 실제 hook/Provider와 layout commit 관찰자를 사용한 회귀를 추가한다. SALES 정책 적용 → 공백 모듈 해제 commit에서 undefined만 관찰되는지 확인한다.
- [x] 구현 전 해제 commit에 이전 rule이 관찰되는 실제 assertion 실패를 확인한다. `[undefined]` 기대에서 `[3, undefined]`가 관찰됐다.
- [x] 같은 회귀에서 cache를 초기화한 재진입의 pending 값이 비어 있고, 재해제 뒤 늦은 응답이 다시 노출되지 않는지 확인한다. API 호출 spy와 서비스 cache는 기존 테스트 방식을 따른다.

## 2. 구현

- [x] effect 전에 bounded reset을 추가하고 effect의 기존 부재 setter만 제거한다.

```tsx
if (!moduleCode && rule !== undefined) setRule(undefined);

useEffect(() => {
  if (!moduleCode) return undefined;
  let active = true;
  void fetchGridDecimalPolicy().then((policy) => {
    if (active) setRule(policy[moduleCode]);
  });
  return () => { active = false; };
}, [moduleCode]);
```

- [x] rule 반환, 비동기 callback/cleanup과 service/Provider/API, 반올림·폭·편집 코드는 변경하지 않는다. F1-GRID 문서에 해제 commit과 재진입·취소 동작을 기록한다.

## 3. 검증

- [x] 정책 10개와 같은 그리드 3파일 278개, 합계 4파일 288개·typecheck/build/Oxc에서 새 진단 0과 state-in-effect 82 → 81을 확인한다.
- [x] 기존 테스트 byte 보존·source/검증 workspace 891파일 parity와 직접 작은 diff 리뷰를 수행한다.
- [x] 실제 hook/Provider/F1Grid 합성 정책 fixture에서 적용·해제·재진입을 375/768/1280px native 흐름으로 확인한다. 영구 저장소를 차단하고 허용된 합성 정책 GET 외 모든 요청을 차단한다. GET 6회·다른 요청/문서 넘침 0, 소유 탭을 닫았다.
- [x] 결과/스크린샷·정확한 059 CI 근거를 보관하고 allowlist 커밋·비강제 푸시·원격 일치와 정확한 060 CI를 확인한다. `0390238a4d0eb45cd2b5d9d1e1b67c57606f6737`, run `44366152154`: 227파일 2,694개와 네 job 성공.
