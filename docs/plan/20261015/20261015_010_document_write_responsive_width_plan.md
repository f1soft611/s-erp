# 문서작성 상세 패널 반응형 너비 구현 계획

## 목표

문서작성 페이지 루트가 콘텐츠의 intrinsic minimum width 때문에 가용 flex 너비보다 넓어지는 것을 허용하지 않아 모바일 상세 패널 잘림을 방지한다.

## 구현 범위

- 수정 대상: `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`
- 회귀 테스트: `frontend/tests/document-write-page.test.tsx`
- 영향 문서: 본 계획, 상세사양서 및 작업지시서, 결과 문서
- 미변경: `PageAreaOverlay`, Dashboard 셸/사이드바, 공지 페이지, API 및 백엔드

## 절차

1. 기존 `renders at the groupware write route instead of the coming-soon page` 테스트에서 `document-write-page` 루트에 `minWidth: 0` 스타일이 있는지 검증한다.
2. 해당 테스트만 실행해 구현 전에 실패하는지 확인한다.
3. `DocumentWritePage` 루트 `Box`에 `minWidth: 0`을 추가한다.
4. 대상 테스트와 `tests/post-detail-panel.test.tsx`를 실행하고 프론트엔드 빌드를 수행한다.
5. Problems 및 `git diff --check`를 확인한다.
6. 인증된 브라우저에서 375px, 768px, 1280px을 검증한다. 인증 페이지가 열리지 않으면 로그인 페이지로 제한된 사실을 기록하며, 브라우저 통과로 간주하지 않는다.
7. 결과 문서에 원인 근거, 변경 파일, 검사 결과, 실제 브라우저 확인 여부를 기록한다.

## 완료 조건

- 테스트가 구현 전 fail, 구현 후 pass 순서로 확인된다.
- 변경은 `DocumentWritePage` 루트의 최소 너비 제약 한 곳과 관련 테스트·문서로 제한된다.
- 기존 페이지 영역 오버레이 및 결재 동작이 보존된다.
- 빌드와 diff 검사가 통과하고 브라우저 검증 결과 또는 제한이 결과 문서에 기록된다.
