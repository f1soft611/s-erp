# 문서현황 조회 버튼 Implementation Plan

**Goal:** 조회 권한에 따라 문서현황 헤더의 조회 버튼을 표시한다.

**Architecture:** DashboardContent가 기존 MenuPermission을 전달한다. DocumentStatusPage는 PageHeader의 actionGroups와 기존 applySearch를 재사용한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261022/20261022_002_document_status_read_action_work_instruction.md)

## 구현 및 검증 순서

- [x] `frontend/tests/document-status-page.test.tsx`에 권한 전달, 권한 없음/미전달 시 숨김, 기본값 로딩 비활성화, 입력조건 적용, 동일 조건 재조회 테스트를 추가하고 먼저 실패를 확인한다.
- [x] `frontend/src/pages/groupware/documents/status/types/documentStatusPage.types.ts`에 `selectedMenuPermissions?: MenuPermission`을 추가한다.
- [x] `frontend/src/pages/dashboard/components/DashboardContent.tsx`에서 해당 props를 전달한다.
- [x] `frontend/src/pages/groupware/documents/status/DocumentStatusPage.tsx`에 SearchIcon 및 PermissionActionGroupDefinition을 사용한다. `visible: selectedMenuPermissions?.read ?? false`, `disabled: !search.defaultsInitialized || search.defaultsLoading`, `onClick: () => search.applySearch()`로 연결한다.
- [x] `frontend`에서 `npm run test -- tests/document-status-page.test.tsx tests/document-status-hooks.test.tsx tests/document-status-search.test.ts tests/document-status-service.test.ts` 실행 후 `npm run build`로 타입 및 빌드를 검증한다.
- [x] 실제 브라우저에서 합성 데이터로 375/768/1280px 렌더링과 버튼 클릭을 확인한다. 결과 및 스크린샷을 `docs/result/20261022/document-status-read-action`에 보관한다.

조회 중 추가 요청의 취소와 최신 응답 처리는 기존 목록 훅을 그대로 사용한다. 별도 상태나 권한 helper를 만들지 않는다. 기존 변경을 포함한 자동 커밋은 하지 않는다.
