# Menu handle initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 메뉴 패널의 handle/columns 초기화 순서 lint 두 개를 동작 변경 없이 제거한다.

**Architecture:** useRef/useState 등록은 유지한다. 현재 useImperativeHandle과 바로 뒤 useEffect를 함께 잘라 handleSave 선언 뒤, JSX return 직전으로 옮긴다. 중간은 순수 지역 선언뿐이므로 Hook 간 순서와 layout/passive 실행 위상은 그대로다.

**Tech Stack:** React forwardRef/useImperativeHandle/useEffect, TypeScript, Oxlint/Vitest.

---

### Task 1: RED와 이동

**File:** `frontend/src/pages/settings/system/menus/components/MenuManagementPanel.tsx`.

- [x] 기준 JSON의 react(immutability) 진단 2개를 확인했다.
- [x] `useImperativeHandle(ref, () => ({`에서 시작하는 기존 전체 호출과 그 뒤 `useEffect` 호출을 원문 그대로 이동했다.
- [x] 삽입 위치는 `async function handleSave`의 닫는 중괄호 뒤, 컴포넌트의 `return (` 앞이다.
- [x] 새 호출·삭제된 호출·변경된 함수 본문/의존 배열이 없는지 diff와 AST로 확인했다.

### Task 2: 검증

- [x] immutability 진단 0/전체 137개를 확인했다.
- [x] test:ci와 같은 thread pool/worker 2로 메뉴 테스트 두 파일을 실행했다. 65개 모두 통과했다.
- [x] `tsc -b`, `git diff --check`를 확인했다. 이 문서 세트에는 상대 링크가 없다.
- 결과 028 작성 후 이 단위만 커밋·non-force push하고 다음 경고를 계속한다.
