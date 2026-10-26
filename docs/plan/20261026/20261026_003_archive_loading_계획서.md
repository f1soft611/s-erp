# Archive Loading Implementation Plan

**Goal:** 자료실 첫 진입 시 별도 로딩 안내 없이 기존 그리드 스피너만 표시한다.

**Architecture:** 자료실 페이지의 날짜 초기화, 분류 조회, 목록 조회 상태를 하나의 조회 로딩 값으로 합친다. 기존 F1Tree의 loading 속성으로 전달하고, 조회 중 빈 결과 및 분류 로딩 배너가 추가되지 않도록 한다. API와 공통 그리드는 변경하지 않는다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Testing Library, Playwright.

## 근거

- [작업지시서](../../directions/20261026/20261026_003_archive_loading_작업지시서.md)
- [상세사양서](../../spec/20261026/20261026_003_archive_loading_상세사양서.md)

## 1. 회귀 테스트

대상: `frontend/tests/archive-page.test.tsx`.

- [ ] 날짜 기본값, 분류, 파일 응답을 각각 지연시켜 실제 그리드의 `aria-busy`와 `f1-grid-loading-overlay`를 검사한다.
- [ ] 분류 로딩 안내와 빈 결과 안내가 로딩 중 나타나지 않는지 검사한다.
- [ ] 조회 완료 후 스피너가 사라지고 빈 결과 안내가 정상 표시되는지 검사한다.
- [ ] `npm run test -- tests/archive-page.test.tsx`로 기존 구현의 실패를 확인한다.

## 2. 구현

대상: `frontend/src/pages/groupware/community/archive/ArchiveBoardPage.tsx`.

- [ ] `categories.isLoading || archiveList.isLoading || defaultsLoading || (!defaultsInitialized && !defaultsError)`로 조회 로딩 상태를 계산한다.
- [ ] 날짜 요약의 임시 로딩 문구를 `—`로 바꾸되 날짜 기본값 오류 표시는 유지한다.
- [ ] 그리드 loading 및 빈 결과 표시 조건에 통합 조회 로딩 상태를 사용한다.
- [ ] 분류 로딩 Alert를 제거하고 업로드/수정/삭제의 `요청 처리 중입니다.` Alert는 유지한다.
- [ ] 오류/재시도 및 기존 파일 작업 동작은 변경하지 않는다.

## 3. 검증 및 결과

- [ ] `npm run test -- tests/archive-page.test.tsx`가 통과해야 한다.
- [ ] `npm run build`가 통과해야 한다.
- [ ] 4173의 기존 서버를 재사용하여 합성 응답으로 날짜/분류/목록을 지연시키고 그리드 위치가 변하지 않는지 확인한다.
- [ ] 375/768/1280px에서 조회 중/완료 화면을 비교하고 스크린샷을 결과 폴더에 남긴다.
- [ ] `git diff --check`를 실행하고 결과 문서에 재현 조건, 원인, 변경 사항, 검증 결과를 기록한다.

공유 워크트리에서 직접 진행하며 별도 커밋은 생성하지 않는다.
