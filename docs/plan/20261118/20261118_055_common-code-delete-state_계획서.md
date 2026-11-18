# 공통코드 삭제 메뉴 파생 상태 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 삭제 정책과 실제 이벤트 guard를 보존하면서 render에서 imperative ref를 읽지 않고 연속 삭제에 맞게 메뉴를 갱신한다.

**Architecture:** 기존 변경 callback에서 삭제 ID 배열만 동등성 검사 후 상태로 게시한다. render는 기존 순수 정책 getGroupDeleteBlockedMessage를 재사용한다. 실제 삭제/저장 경로의 ref 조회·guard는 그대로 둔다.

**Tech Stack:** React, TypeScript, Oxc, Vitest/RTL, 실제 F1Tree/F1Grid, Orca.

---

[작업지시서](../../directions/20261118/20261118_055_common-code-delete-state_작업지시서.md)에 따라 현재 세션에서 직접 진행한다.

## 1. 기준선과 RED

**Modify:** `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`, `frontend/tests/common-code-management-page.test.tsx`.

**Related:** `frontend/tests/common-code-management.service.test.ts`, `frontend/tests/common-code-page-session.test.ts`.

- [x] UTC/threads/maxWorkers 2에서 같은 3파일을 실행해 기준선을 확인한다.
- [x] 실제 Panel/tree/grid에 자식 그룹 없는 기존 그룹 1개·기존 상세 2개를 구성한다. 그룹 삭제 메뉴가 최초 및 첫 상세 삭제 후에는 disabled, 두 번째 상세 삭제 후에는 enabled인지 확인한다. 조회는 기존 API mock 경계만 사용하고 저장 요청이 없음을 확인한다.

```tsx
const openGroupDelete = async () => {
  fireEvent.contextMenu(screen.getByRole('gridcell', { name: 'Owned leaf group' }));
  return screen.findByRole('menuitem', { name: '행 삭제' });
};
const closeMenu = () => fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
expect(await openGroupDelete()).toHaveAttribute('aria-disabled', 'true');
closeMenu();
for (const name of ['거래명세서', '사업자등록증']) {
  fireEvent.contextMenu(screen.getByRole('gridcell', { name }));
  fireEvent.click(await screen.findByRole('menuitem', { name: '행 삭제' }));
  await waitFor(() => expect(screen.queryByRole('gridcell', { name })).not.toBeInTheDocument());
  const action = await openGroupDelete();
  if (name === '거래명세서') expect(action).toHaveAttribute('aria-disabled', 'true');
  else expect(action).not.toHaveAttribute('aria-disabled', 'true');
  closeMenu();
}
expect(apiMocks.apiPost).not.toHaveBeenCalled();
```

수정 전 마지막 enabled assertion 실패 여부를 실제로 확인하고, lint 대상 ref 진단 0 assertion의 RED도 구분해 남긴다.

## 2. 구현

- [x] 삭제 그룹/상세 ID 상태를 각각 `useState<string[]>([])`로 추가한다. 기존 dirty boolean/ref는 그대로 유지한다.
- [x] 기존 두 onChangesChange callback에 해당 ID 게시만 추가한다.

```tsx
const deletedIds = changes.deletedRows.map((row) => normalizeRowId(row.id));
setDeletedGroupIds((current) =>
  current.length === deletedIds.length &&
  current.every((id, index) => id === deletedIds[index])
    ? current
    : deletedIds,
);
```

상세 callback도 같은 방식으로 setDeletedItemIds를 호출한다. 동일 ID 목록은 이전 상태를 반환한다. 초기화/재조회/remount도 기존 그리드의 빈 변경 payload를 통해 동기화하며 새 effect를 추가하지 않는다.

- [x] render 삭제 prop만 아래처럼 대체한다. 빈 그룹 ID는 기존처럼 허용하고 실제 이벤트·저장 guard는 변경하지 않는다.

```tsx
deleteMenuDisabled={
  saving ||
  Boolean(
    selectedGroup &&
      normalizeRowId(selectedGroup.id) &&
      getGroupDeleteBlockedMessage({
        blockedGroupIds: [selectedGroup.id],
        groups: filteredGroups,
        itemRows,
        deletedGroupIds,
        deletedItemIds,
      }),
  )
}
```

## 3. 검증·동기화

- [x] 같은 3파일·typecheck/build/Oxc에서 대상 ref 1건 제거·새 진단 0을 확인한다.
- [x] source/AST 대조로 실제 isGroupDeleteDisabled/checkGroupDeleteBlockedMessage/save/picker·기타 JSX/CSS·서비스/공개 계약 동일과 frontend byte 차이 0을 확인한다.
- [x] 실제 375/768/1280px에서 상세 연속 삭제 전/중/후의 그룹 삭제 메뉴를 확인하고, 자식 그룹이 남아 있는 삭제 보호도 확인한다. 새 소유 탭·합성 GET·메모리 저장소를 사용하고 native 결과/스크린샷을 저장한다.
- [x] 결과를 작성한다. 054 정확한 SHA 전체 CI 완료 뒤 allowlist 커밋·비강제 푸시·원격 일치를 확인한다. 055 전체 CI도 정확한 SHA로 별도 확인한다.
