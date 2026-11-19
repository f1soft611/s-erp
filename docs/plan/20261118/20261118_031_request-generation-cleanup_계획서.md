# Request generation cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 요청 세대 cleanup의 실제 쓰기를 명확하게 표현해 잘못된 ref cleanup 진단을 제거한다.

**Architecture:** 모두 useRef(0)으로 생성한 private numeric counter다. cleanup의 `++ref.current;`만 `ref.current += 1;`로 바꾼다. 새 요청에서 증가/비교하는 코드와 effect deps는 유지한다.

**Tech Stack:** React useRef/useEffect, TypeScript, Oxlint/Vitest.

---

### Task 1: RED와 최소 수정

**Files and mutations:**

- `frontend/src/pages/co/master/warehouse/hooks/useWarehouseManagement.ts`: cleanup loadVersion 1곳.
- `frontend/src/pages/co/master/customers/hooks/useCustomerManagement.ts`: cleanup loadVersion 1곳.
- `frontend/src/pages/co/master/materials/hooks/useMaterialManagement.ts`: cleanup loadVersion 1곳.
- `frontend/src/pages/co/workflow/form/hooks/useDraftFormManagement.ts`: cleanup loadVersion/optionsVersion 각 1곳.
- `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`: cleanup menuLoadRequestIdRef 1곳.

- [x] 위 파일 lint에서 진단 6개를 확인하고 경고 0 gate가 실패함을 확인했다.
- [x] cleanup의 위 6곳만 다음 형식으로 바꿨다. 결과값을 쓰는 요청 시작 위치의 prefix increment는 그대로다.

```tsx
loadVersion.current += 1;
optionsVersion.current += 1;
menuLoadRequestIdRef.current += 1;
```

### Task 2: 검증

- [x] 전체 lint 133 → 127이며 다른 진단이 동일함을 확인했다.
- [x] page-initial-errors/customer-management-page/material-management/draft-form-management/menu-management-f1-grid/menu-management-required-selection 테스트를 UTC·threads/worker 2로 실행했다. 161개 통과.
- [x] typecheck·정확한 6개 표현 변경 audit·frontend 890파일 byte 일치를 확인했다.
- 결과 031 작성 후 이 단위를 커밋·non-force push하고 다음 경고를 계속한다.
