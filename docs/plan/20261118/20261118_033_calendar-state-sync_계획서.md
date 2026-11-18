# Calendar state synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 날짜/월 입력·탐색 의미를 보존하면서 props 동기화 effect-state 4개와 stale commit을 제거한다.

**Architecture:** 각 컴포넌트가 이전에 관찰한 primitive 입력 key를 state로 보관한다. key가 실제 바뀐 경우에만 같은 컴포넌트의 state를 render 중 조건부 조정한다. React는 자식 DOM을 commit하기 전에 재시도하므로 이전 값을 commit하지 않는다. 공유 추상화·외부 store·defer·layout effect로 경고를 우회하지 않는다.

**Tech Stack:** React useState/Profiler, TypeScript, Vitest, Orca embedded browser.

---

### Task 1: 계약과 설계

- [x] 기존 달력 지시/사양, 운영 4파일과 관련 테스트를 확인했다.
- [x] 대안 검토: prop-only 파생은 사용자의 탐색/draft를 잃고, key remount는 focus/부분 입력을 잃는다. 기존 local state와 reset 조건을 보존하는 guarded state 조정을 선택한다.
- [x] 실제 모듈+합성값의 고립 browser fixture에서 변경 전 날짜·월 popup 375/768/1280px 렌더링·폭/선택값을 확보했다. 업무 데이터/API는 쓰지 않는다.

### Task 2: RED

**Tests:** `calendar-panels.test.tsx`, `date-editor-calendar.test.tsx`, `month-editor.test.tsx`.

- [x] Profiler로 첫 commit의 DOM 값을 관찰하는 4사례를 추가했다. 외부 날짜/월 변경 시 첫 commit부터 새 표시여야 한다.
- [x] 같은 prop 재렌더의 탐색/draft, invalid/empty 값과 today, 월 부분 입력, disabled 후 재활성화의 popup 닫힘을 같은 사례에서 확인했다.
- [x] 운영 수정 전에 새 4사례가 이전 표시 commit으로 실패하고 기존 18개가 통과하는지 실제 실행했다.

### Task 3: 최소 구현

**Sources:** `shared/components/calendar/{DatePanel,MonthPanel}.tsx`, `shared/components/f1-grid/editing/{DateEditor,MonthEditor}.tsx`.

- [x] DatePanel: `[value,today]` key 변경만 기록하고 기존 `parseIsoDate(value)`가 참일 때만 view를 조정했다.
- [x] MonthPanel: 같은 key 변경만 기록하고 기존 `/^\d{6}$/` 조건에서만 yearOf로 조정했다. 6자리 비정상 월의 기존 fallback도 유지했다.
- [x] DateEditor: `[value,disabled]` key 변경 시 draft를 value로 맞추고 disabled일 때 anchor를 비웠다.
- [x] MonthEditor: value 변경만 기록하고 현재 draft의 숫자가 value와 다를 때만 기존 formatter로 맞췄다.
- [x] 해당 effect/import만 제거했다. JSX·이벤트·정규화·API·폭/스타일은 그대로 두고 F1-GRID 문서의 동기화 계약도 갱신했다.

### Task 4: 검증과 결과

- [x] 새 4사례 GREEN과 기존 calendar/date/month/form/search/업무 날짜 회귀 9파일/158개를 UTC·threads/worker 2로 실행했다.
- [x] typecheck/build·lint 119 → 115(다른 진단 동일)·검증 소스 890파일 byte 일치·git diff --check를 확인했다.
- [x] 실제 DateEditor/MonthEditor 합성 fixture의 선택·이동·외부 reset·disabled를 확인하고 375/768/1280px 캡처/가로 넘침을 기록했다.
- 결과 033에 재현·원인·보존 조건·실제 검증·스크린샷·짧은 커밋 내용을 남긴다. 이 단위를 커밋/push한 후 다음 상태 흐름을 계속한다.
