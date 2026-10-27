# Shared Unsaved Guard Implementation Plan

**Goal:** 수주등록 내부 이동은 공통 확인창으로 통일하고 기존 dirty 화면의 브라우저 이탈을 재사용 가능한 훅으로 보호한다.

**Architecture:** `useUnsavedChangesBeforeUnload(enabled)`는 enabled일 때만 window listener를 등록하고 해제 시 자신의 listener만 제거한다. 여러 인스턴스는 서로 독립적이며 어느 하나라도 preventDefault하면 경고가 유지된다. 수주등록은 기존 useBlocker를 유지하고 blocked 상태를 공통 확인창으로 표현한다. 전역 DOM 감시나 공통 Dialog의 open만으로 미저장 상태를 추측하지 않는다.

**Tech Stack:** React, TypeScript, React Router, MUI, Vitest, Playwright.

## 근거와 선택

- [작업지시서](../../directions/20261027/20261027_006_shared-unsaved-guard_작업지시서.md)
- 선택: 공통 훅 + 기존 boolean 연결. 상태 소유권을 유지하고 전역 provider 없이 중복 사용과 cleanup을 검증할 수 있다.
- 미채택: 각 페이지에 이벤트 복사 — 수정/검증 중복.
- 미채택: 전역 dirty registry와 provider — 현재 요구에 불필요한 생명주기/상태 계층.

## Task 1: 공통 훅과 테스트

- Create `frontend\src\shared\hooks\useUnsavedChangesBeforeUnload.ts`.
- Create `frontend\tests\use-unsaved-changes-before-unload.test.tsx`.
- [x] enabled false/true, 원복, unmount, 여러 소비자 독립 보호 테스트를 먼저 작성하고 실패를 확인한다.
- [x] 다음 계약을 구현한다.

```ts
useEffect(() => {
  if (!enabled) return;
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [enabled]);
```

## Task 2: 수주등록 공통 확인창

- Modify `frontend\src\pages\sales\order\create\SalesOrderCreatePage.tsx`.
- Modify `frontend\tests\sales-order-create-page.test.tsx`.
- [x] native confirm 기대를 공통 dialog의 계속 작성/버리고 이동, Escape 취소, 깨끗한 상태 무경고로 변경해 실패를 확인한다.
- [x] 기존 native confirm effect/ref와 자체 beforeunload effect를 제거한다.
- [x] `useUnsavedChangesBeforeUnload(hasUnsavedChanges)`를 사용한다.
- [x] blocked 상태에만 확인창을 열고 취소는 `blocker.reset()`, 이동은 `blocker.proceed()`를 호출한다.

## Task 3: 기존 dirty 소비자 연결

- [x] 각 파일에 공통 훅 import와 아래 호출만 추가한다.

| 파일 (`frontend\src` 기준) | enabled |
|---|---|
| pages\settings\system\menus\MenuManagementPage.tsx | dirty |
| pages\settings\system\modules\ModuleManagementPage.tsx | panelDirty |
| pages\settings\system\roles\RoleManagementPage.tsx | panelDirty |
| pages\settings\system\warehouses\WarehouseManagementPage.tsx | panelDirty |
| pages\co\master\common-code\CommonCodeManagementPage.tsx | panelDirty |
| pages\co\master\customers\CustomerManagementPage.tsx | management.hasChanges |
| pages\co\master\materials\MaterialManagementPage.tsx | management.hasChanges |
| pages\co\workflow\form\DraftFormManagementPage.tsx | management.hasChanges |
| shared\components\common-code\CommonCodeItemHelpDialog.tsx | open && hasChanges |
| pages\co\workflow\form\components\DraftFormTemplateDialog.tsx | open && hasChanges |
| pages\co\master\classification\components\ClassificationSettingsDialog.tsx SettingsContent | dirty \|\| editorDirty (열린 동안만 mount, 관련 작업의 편집 상태 포함) |
| pages\groupware\documents\write\components\DocumentApprovalSettingsDialog.tsx | open && managerOpen && hasTemplateNameChanges |

- [x] 대표 관리 화면과 닫힌 편집창, 저장 성공/실패 테스트를 기존 파일에 추가한다.

## Task 4: 検証と記録

- [x] hook, sales, 변경 대상의 기존 테스트를 최소 범위로 실행한다. 기존 실패는 신규 회귀와 분리한다.
- [x] `frontend`에서 `npm run build`와 변경 파일 oxlint를 실행한다.
- [x] 4173의 기존 S-ERP를 확인해 재사용하고, 합성 데이터/모의 API만으로 375/768/1280px 내부 이동 확인, 실제 beforeunload 경고, 취소 및 해제를 검증한다.
- [x] `docs\result\20261027\shared-unsaved-guard`에 결과와 스크린샷을 저장한다.

自動commitや業務データ保存は行わない。
