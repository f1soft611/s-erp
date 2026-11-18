# 메뉴관리 테스트 복구 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 메뉴관리의 세션·필수 권한 선택·F1Tree 계약을 유지하며 재현된 테스트 실패를 복구한다.

**Architecture:** 운영 동작을 오래된 테스트에 맞추지 않는다. 페이지 통합 테스트는 필요한 역할 목록과 명시적 선택 또는 유효한 복원 세션을 준비하고, 패널 테스트는 현재 신규 등록 다이얼로그와 편집 결과를 검증한다.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, MUI, F1Tree.

## 근거와 범위

- [작업지시서](../../directions/20261118/20261118_001_repository-remediation_작업지시서.md)
- [세션 사양](../../spec/20261002/20261002_004_메뉴관리_조회조건_세션보존_사양서.md)
- [최초 조회 오류 사양](../../spec/20261027/20261027_008_shared-page-load-error_상세사양서.md)
- 수정 대상은 `frontend/tests/menu-management-f1-grid.test.tsx`, `frontend/tests/menu-management-required-selection.test.tsx`다.
- 운영 코드 수정 대상은 `frontend/src/pages/settings/system/menus/MenuManagementPage.tsx`의 검색어 초기화 처리만 추가한다. 입력 시에는 세션을 갱신하지만 초기화 시에는 갱신하지 않아 재진입하면 이전 검색어가 복원되는 결함이 기존 세션 사양에 어긋남을 확인했다.
- 기존 전체 테스트 90개 실패와 메뉴관리 집중 재현 24개 실패를 별도 기준으로 관리한다.

## Task 1: 실패 기준 보존

- [x] 아래 명령으로 두 파일을 실행한다. 기존 실패가 재현되어야 한다.

```powershell
cd frontend
node .\node_modules\vitest\vitest.mjs run tests\menu-management-f1-grid.test.tsx tests\menu-management-required-selection.test.tsx --pool=threads --maxWorkers=2 --reporter=json --no-color
```

- [x] `.artifacts/vitest/report.json`을 세션 작업 공간에 보존하고 실패 이름·최초 오류를 분류한다.
- [x] 누락된 역할 mock, 선택되지 않은 권한, 구형 생성/툴바 단언, 구형 스켈레톤 test id를 구별한다.

## Task 2: 페이지 fixture와 조회 조건

- [x] `menu-management-required-selection.test.tsx`에 검색 입력 → 초기화 → 재진입 시 빈 검색어 유지 회귀 테스트를 먼저 추가하고 실패를 확인한다.
- [x] 초기화 핸들러에서 기존 세션의 검색어만 빈 값으로 바꾼다. 모듈·권한은 유지한다.

```tsx
setSearchQuery('');
setPageSession((current) => ({ ...current, searchQuery: '' }));
```

- [x] 같은 회귀 테스트가 통과하는지 확인한다.

- [x] 페이지를 조회 상태로 검증하는 테스트는 현재 세션 계약을 준비한다.

```tsx
window.sessionStorage.setItem(
  's-erp:page:menu-management',
  JSON.stringify({
    version: 1,
    value: { selectedModuleId: 1, selectedRoleId: '1', searchQuery: '' },
  }),
);
```

- [x] 필요한 요청 mock에 역할 목록을 명시적으로 추가하고 메뉴 요청은 역할을 포함한 현재 URL로 단언한다.

```tsx
if (path === '/api/v1/system/roles') {
  return Promise.resolve({
    resultList: [
      { roleId: 1, roleNm: '관리자', useAt: 'Y', roleCode: 'ADMIN' },
      { roleId: 2, roleNm: '운영자', useAt: 'Y', roleCode: 'OPERATOR' },
    ],
  });
}
```

- [x] 권한 선택 자체를 검증하는 테스트는 빈 세션을 유지하고 실제 선택 이벤트를 발생시킨다.
- [x] 검색어 초기화, dirty 취소·확인, 실패 후 행 보존과 재시도 단언은 유지한다.

## Task 3: 패널·로딩 계약

- [x] 현재 F1Tree 생성 다이얼로그에서 값 입력·적용 후 생성 행을 검증한다. 행 생성 없이 기존 기본 이름을 찾지 않는다.
- [x] 제거된 표시 문구 대신 테스트의 원래 의도인 실제 변경 행·저장 요청·취소 후 원상 복구를 검증한다.
- [x] 실제 그리드가 제공하는 접근 가능한 로딩 상태 또는 현재 스켈레톤을 검증한다. 완료 전·완료 후를 모두 확인한다.
- [x] 필터·권한 컬럼은 인덱스가 아니라 현재 식별 가능한 컬럼 이름과 역할로 검증한다.
- [x] 같은 집중 명령으로 두 파일이 통과하는지 확인한다. 공유 설치와 새 잠금 설치에서 모두 65개가 통과했다.

## Task 4: 검사와 결과

- [x] `npm run typecheck`, `npm run lint`를 새 잠금 설치에서 실행한다. 오류 없이 통과하고 기존 lint 경고 183개는 남는다.
- [x] 검색어 초기화 운영 결함 수정에 대해 375/768/1280px 실제 브라우저 검증과 스크린샷을 기록한다. API·DB 변경은 없다.
- [x] 공유 설치의 실제 Vite 8.2.2·Vitest 4.1.11과 잠금 파일의 차이를 확인하고, 새 검증용 worktree에만 잠금 설치를 복원한다. 실제 Vite 8.3.8·Vitest 4.1.12임을 확인한다.
- [x] 결과를 `docs/result/20261118/repository-remediation`에 기록하고 전체 테스트 상태와 혼동하지 않는다.
- [x] 미커밋 diff의 사양 준수·단언 유지·코드 품질 리뷰에서 중요한 지적이 없음을 확인했다.
- [x] 커밋·푸시·병합 없이 다음 업무의 실패 복구 단계로 진행한다.
