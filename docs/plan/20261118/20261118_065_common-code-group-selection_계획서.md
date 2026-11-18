# 공통코드 기본 그룹 선택 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 목록의 기본/대체 그룹을 적용하는 첫 commit부터 선택 표기를 일치시킨다.

**Architecture:** CommonCodeManagementPanel의 effect 한 개를 같은 우선순위의 bounded render guard로 옮긴다. 빈 목록에서는 현재 ID가 비어 있지 않을 때만 해제하며, 그 외 기존 ID 정규화·미저장 ID 보호를 유지한다.

**Tech Stack:** React/TypeScript, Vitest/Testing Library, Oxc, 기존 Orca 브라우저.

**범위:** `frontend/src/pages/co/master/common-code/components/CommonCodeManagementPanel.tsx`, `frontend/tests/common-code-management-page.test.tsx`, 날짜별 문서/결과. 원 사양은 `docs/spec/20260914/20260914_001_공통코드_관리_기능_점검_사양서.md`.

**대안:** callback에서만 ID를 가리면 실제 상세 조회와 불일치하므로 제외한다. layout effect로 이동하거나 지연/억제로 진단을 숨기지 않는다. 부모 상태/서비스로 선택 정책을 이동하지 않는다.

## 실행

- [x] 변경 없는 기존 공통코드 1파일 35개 통과를 기준선으로 확인했다.
- [x] 실제 Panel/Tree/Profiler 회귀를 추가했다. 최초 로딩 완료/즉시 목록의 첫 commit부터 첫 그룹을 표시하고, 실제 다른 그룹 선택·동일 ID 목록 재렌더는 유지하며 선택된 ID 제거 후 첫 commit에 대체한다. 미저장 ID와 로딩 중 보류·빈 목록 해제도 확인했다.
- [x] 첫 선택 commit의 빈 표기 RED 두 개와 기존 미저장 ID 보존 통과를 확인한 뒤 아래 guard로 effect만 교체했다.

```tsx
if (!groupsLoading) {
  if (!filteredGroups.length) {
    if (selectedGroupId !== '') setSelectedGroupId('');
  } else if (
    !selectedGroupId.startsWith('new-common-group-') &&
    !filteredGroups.some((group) => normalizeRowId(group.id) === normalizeRowId(selectedGroupId))
  ) {
    setSelectedGroupId(String(filteredGroups[0].id));
  }
}
```

- [x] `vitest run --pool=threads --maxWorkers=2 tests/common-code-management-page.test.tsx tests/role-management-notification.test.tsx` 2파일 91개, `tsc -b`, `vite build`, `oxlint --format=json`을 확인했다. Oxc 78 → 77, 제거1/추가0이며 기존 상세 조회 진단은 그대로다. source 891파일 byte parity·기존 테스트 보존을 확인했다.
- [x] 실제 Panel/Tree/Profiler 375/768/1280px native 목록 적용/그룹 선택/목록 교체를 검증했다. 상세 GET 경계만 합성하고 모든 쓰기/기타 transport와 영구 저장소를 차단했다. 첫 ready/대체 commit부터 표기가 일치하며 요청 이탈/오류/문서 넘침 0, 소유 탭을 닫았다.
- [x] 결과/스크린샷·작은 전체 diff 리뷰·정확한 064 CI를 보관했다. allowlist 커밋 `6bb5fa134fcce82c9a07675710df9ef1950c27b4`를 비강제 푸시하고 원격 일치를 확인했다. 정확한 CI44376512911의 마지막 전체 집계는 227파일 2,704개 통과이며 네 job 모두 성공했다.
