# Quick date race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지연된 빠른 날짜 응답이 최신 검색 입력·닫힘·초기화·복원 상태를 덮어쓰지 못하게 한다.

**Architecture:** 날짜 필드별 요청 토큰과 최신 draft ref를 PageSearchArea 내부에 둔다. 최신 유효 요청만 해당 필드를 갱신하고 다른 필드는 최신 draft와 병합한다. props/callback/API와 기존 Portal backdrop은 유지한다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Orca browser.

---

### Task 1: 지연 응답 재현

**Files:**
- Modify: `frontend/tests/page-search-area-detail.test.tsx`

- [x] `act`를 import하고 resolve/reject 가능한 `Promise<string>` fixture를 추가한다.

```ts
function deferredDate() {
  let resolve!: (value: string) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<string>((resolveDate, rejectDate) => {
    resolve = resolveDate;
    reject = rejectDate;
  });
  return { promise, resolve, reject };
}
```

- [x] 지연 날짜 요청 중 다른 텍스트 입력을 바꾼 뒤 응답을 해결해 새 텍스트와 날짜가 함께 남음을 확인한다. controlled parent의 callback echo도 포함한다.
- [x] 날짜 직접 입력이 늦은 응답보다 우선함을 확인한다.
- [x] 두 빠른 요청의 응답을 역순 해결한다. 구 요청 성공과 실패 모두 최신 날짜·오류 상태를 바꾸지 않아야 한다.
- [x] 초기화, 하단 닫기, 상단 토글 닫기, 외부 값 복원, unmount 뒤 응답은 callback도 호출하지 않아야 한다.
- [x] 원본 운영 코드로 새 `deferred quick dates` 테스트를 실행해 실제 stale 값/오류/callback 실패를 확인한다.

### Task 2: 최소 수정

**Files:**
- Modify: `frontend/src/shared/components/PageSearchArea.tsx`

- [x] `useRef`와 다음 내부 ref를 추가한다.

```tsx
const draftValuesRef = useRef(draftValues);
const quickDateRequestsRef = useRef(new Map<string, symbol>());
```

- [x] 외부 값 동기화 effect는 최신 ref와 다른 값일 때만 토큰 map을 비운다. 동일 값의 controlled echo는 유효 요청을 취소하지 않는다. 그 뒤 ref를 복원 값으로 맞춘다.
- [x] unmount cleanup에서 map을 비운다.
- [x] `updateValue`는 `draftValuesRef.current`와 병합하고 갱신 대상 필드의 토큰만 삭제한다. callback은 state updater 안에서 실행하지 않는다.
- [x] 요청은 고유 symbol을 필드에 기록하고 await 이후와 catch에서 같은 토큰인지 검사한다.

```tsx
const request = Symbol();
quickDateRequestsRef.current.set(field.field, request);
try {
  const today = await getSystemDate();
  if (quickDateRequestsRef.current.get(field.field) !== request) return;
  const range = resolveQuickDate(preset, dayjs(today));
  setQuickDateError(false);
  setDateErrors((current) => {
    const next = { ...current };
    delete next[`${field.field}.from`];
    delete next[`${field.field}.to`];
    return next;
  });
  updateValue(field.field, range);
} catch {
  if (quickDateRequestsRef.current.get(field.field) !== request) return;
  quickDateRequestsRef.current.delete(field.field);
  setQuickDateError(true);
}
```

- [x] 검색 정규화·칩 제거·초기화의 직접 draft 쓰기도 ref와 동기화한다. 칩 제거는 해당 필드, 초기화·닫기·토글은 모든 토큰을 무효화한다. 기존 callback 호출 여부는 유지한다.
- [x] API, 날짜 계산, 필수 조건, 레이아웃, bf6cf0bb의 Portal backdrop을 변경하지 않는다.

### Task 3: 검증과 결과

**Files:**
- Modify: `frontend/src/pages/f1-grid-docs/F1-GRID.md`
- Create: `docs/spec/20261118/20261118_012_quick-date-race_상세사양서.md`
- Create: `docs/result/20261118/repository-remediation/20261118_012_quick-date-race_결과.md`

- [x] 소유 검증 worktree에 변경 파일을 명시적으로 복사한다. PageSearchArea는 기존 bf6cf0bb Portal 변경을 포함한 입력으로 갱신했음을 기록한다.
- [x] 아래 관련 전체 파일과 typecheck/lint를 실행한다.

```powershell
node .\node_modules\vitest\vitest.mjs run tests\page-search-area-detail.test.tsx tests\page-search-area.test.tsx tests\search-defaults.test.ts tests\use-page-search-defaults.test.tsx --pool=threads --maxWorkers=1 --reporter=default --no-color
npm run typecheck
npm run lint
```

- [x] 합성 데이터·지연 날짜 mock으로 실제 PageSearchArea를 격리 렌더하고 375/768/1280px에서 최신 텍스트 보존, 수동 날짜 우선, 페이지 가로 넘침 없음을 확인한다. 표준 searchField 호스트 범위이며 빈 슬롯 모드의 기존 넘침은 결과에 분리했다.
- [x] 영문 소문자 스크린샷 경로와 결과에 원인·해결·회귀·미확인 범위를 기록한다. 임시 HTML/탭/profile만 정리하고 공유 서버는 유지한다.
- [x] 커밋·푸시하지 않는다.
