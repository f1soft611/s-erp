# Residual lint basics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 화면 동작과 테스트 준비·단언을 유지하며 저위험 lint 11개를 제거한다.

**Architecture:** 운영 두 파일은 동일 의미의 조건/반환식과 미사용 catch binding만 정리한다. 테스트는 render와 비동기 DOM 준비 대기를 그대로 유지하고 사용하지 않는 binding/import만 제거한다. 캡처 스크립트는 실행되지 않는 locator/측정 변수만 제거한다.

**Tech Stack:** React/TypeScript, Oxlint 1.79, Vitest threads/2 workers.

---

### Task 1: 기준 진단

- [x] 현 코드 4597fe47의 root/검증 입력이 같은 상태에서 JSON 진단 206개를 분류했다.
- [x] 이 단위의 네 규칙 합은 11개다. 나머지 195개는 후속 단위다.
- [x] 아래 gate는 수정 전 진단 11개/exit 1이었다.

```powershell
.\node_modules\.bin\oxlint.cmd --format=json | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const rules=new Set(['eslint(no-dupe-keys)','eslint(no-unused-vars)','eslint(no-extra-boolean-cast)','eslint(no-constant-binary-expression)']);const n=JSON.parse(s).diagnostics.filter(d=>rules.has(d.code)).length;console.log(n);process.exit(n?1:0)})"
```

### Task 2: 최소 정리

| 파일 | 실제 변경 |
| --- | --- |
| frontend/tests/notice-view-adapter.test.ts | 같은 값인 `isPinned: 'Y'` 중복 한 줄 제거 |
| frontend/tests/f1-grid-pinned-column-range.test.tsx | 미사용 `vi` import 제거 |
| frontend/scripts/capture-menu-management-row-border-check.js | 사용하지 않는 editableCandidates locator 선언 제거 |
| frontend/tests/document-approval-settings-dialog.test.tsx | `await screen.findByRole('grid', ...)`는 유지하고 미사용 binding만 제거 |
| frontend/tests/f1-grid-form-modal.test.tsx | 미사용 within import와 rerender destructuring 제거. render 자체는 유지 |
| frontend/tests/menu-management-f1-grid.test.tsx | 미사용 replaceMenuPermissions import 제거 |
| frontend/scripts/verify-notice-embedded-image.js | 사용하지 않는 dialog bounds 변수 제거 |
| frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx | `value ? 'Y' : 'N'`으로 동일한 truthiness 유지, 미사용 catch binding 제거 |
| frontend/src/pages/dashboard/DashboardPage.tsx | 항상 비어 있지 않은 경로 template 뒤의 도달 불가능한 `|| '/'` 제거 |

- [x] 표의 변경만 적용했다. 기존 case/단언과 비동기 준비 대기를 유지했다.

### Task 3: 검증과 단위 동기화

- [x] Task 1의 gate는 exit 0, 네 규칙 진단 0, 전체 진단 195개다.
- [x] 아래 실제 관련 테스트 7파일/195개가 모두 통과했다. 제외 0이다.

```powershell
npm run test:ci -- tests\notice-view-adapter.test.ts tests\f1-grid-pinned-column-range.test.tsx tests\document-approval-settings-dialog.test.tsx tests\f1-grid-form-modal.test.tsx tests\menu-management-f1-grid.test.tsx tests\common-code-management-page.test.tsx tests\app-router-not-found.test.tsx
```

- [x] 두 스크립트의 `node --check`는 exit 0이다. 캡처 스크립트는 실행하지 않았다.
- [x] `npm run typecheck`는 exit 0이다. diff·문서 링크와 기존 준비 대기 보존도 확인했다.
- 결과 025와 허용 경로만 커밋·non-force push한 뒤 후속 lint/의존성 작업을 계속한다.
