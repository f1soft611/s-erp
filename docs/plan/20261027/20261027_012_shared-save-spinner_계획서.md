# Shared Save Spinner Implementation Plan

> **For agentic workers:** Execute inline with test-first changes; preserve parallel work.

**Goal:** 페이지·모달의 저장 중 상태를 16px 공통 스피너로 일관되게 표시한다.

**Architecture:** `AppSaveButton`은 기존 MUI Button과 AppLoadingSpinner를 조합하고 기존 saving 상태만 전달받는다. PermissionGroupActionBar에 명시적 saving prop을 추가해 페이지 액션도 같은 컴포넌트를 사용한다. 저장 상태나 API 로직을 새로 추론하지 않는다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Chromium.

## 1. 공통 동작 회귀

Files: `frontend\tests\app-save-button.test.tsx`, `frontend\tests\page-header.test.tsx`.

- [x] 일반 아이콘/문구, 저장 중 스피너와 자동 disabled/aria-busy, resolve/reject 후 복구, 사용자 disabled 유지 테스트를 작성한다.
- [x] 실제 PageHeader 액션의 saving/권한과 CommonDialog 하단 저장을 검증한다.
- [x] 구현 전 실패를 확인한다.

## 2. 공통 구현과 연결

Files: `frontend\src\shared\components\AppSaveButton.tsx`, `PermissionGroup.tsx`.

```tsx
<AppSaveButton saving={saving} savingLabel="저장 중..." onClick={save}>
  저장
</AppSaveButton>
```

- [x] `saving`, 선택적 `savingLabel`, `progressLabel`과 기존 Button props를 받는다. saving 동안만 startIcon을 AppLoadingSpinner 16px/color inherit로 교체하고 disabled/aria-busy를 적용한다. 기본 문구는 기존 children을 유지한다.
- [x] PermissionActionDefinition에 `saving`, `savingAriaLabel`을 추가하고 액션 렌더링을 공통 버튼으로 연결한다. 일반 액션은 영향이 없다.
- [x] 페이지: 공통코드/거래처/품목/기안양식/메뉴/권한/모듈/창고/수주등록 액션에 저장 상태를 명시한다. 기존 지역 spinner 함수를 제거한다.
- [x] 모달: 분류관리/코드 도움말/기안양식 본문/공지 작성·로그인 팝업/문서 작성·결재선 템플릿·이름 저장/수주 편집/자료실 파일 편집을 연결한다.
- [x] 프로필 저장과 비밀번호 변경을 연결한다. 기존 문구와 aria-label을 유지한다. 별도 조회 spinner는 제거하지 않는다.

## 3. 검증 및 결과

- [x] 공통 버튼/헤더/모달의 집중 테스트를 실행한다.
- [x] 실제 저장 지연이 있는 대표 페이지·모달 및 기존 spinner 소비자 회귀를 실행한다.
- [x] frontend build와 변경 TS/TSX 파일 oxlint를 실행한다.
- [x] 기존 4173 서버에서 합성 저장 Promise로 페이지/모달 idle→saving→success/failure를 확인하고 375/768/1280px 스크린샷을 남긴다.
- [x] `docs\result\20261027\shared-save-spinner`에 사용법·적용 목록·검증·스크린샷을 기록한다.
