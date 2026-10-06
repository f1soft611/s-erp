# 기안양식 에디터 스크롤 정렬 결과

## 원인

기안양식 다이얼로그에서는 에디터를 감싼 Box가 `overflow: auto`와 `p: 2`를 모두 적용해 스크롤 트랙과 에디터가 프레임 안쪽으로 들어가 있었다. 공지사항 작성 모달은 외부 프레임에서 overflow를 숨기고 Tiptap `.ProseMirror`에서 스크롤을 처리한다.

## 변경 사항

- `DraftFormTemplateDialog`의 에디터 프레임을 `overflow: hidden`으로 변경하고 외부 `p: 2`를 제거했다.
- `.ProseMirror`에 가로/세로 `auto` overflow와 16px padding을 적용해 프레임 상단에서 스크롤이 시작되도록 하고 본문 여백을 유지했다.
- `draft-form-template-dialog.test.tsx`에 프레임 overflow, `.ProseMirror` 스크롤 및 안쪽 여백 회귀 검증을 추가했다.
- 공통 에디터 기본값, 공지사항 모달 및 저장/API 동작은 수정하지 않았다.

## 검증

- 회귀 테스트를 먼저 실행해 기존 외부 프레임의 `overflow: auto`에서 실패하는 것을 확인했다.
- `npm --prefix frontend run test -- tests/draft-form-template-dialog.test.tsx` — 통과, 11 tests.
- `npm --prefix frontend run build` — 통과 (TypeScript 및 Vite build).
- `npm --prefix frontend run test` — 실패: 73개 test file 중 23개 실패, 50개 통과 (174 tests failed, 565 passed). 변경 대상 `draft-form-template-dialog.test.tsx`는 전체 실행에서도 11개 모두 통과했다. 실패는 `draft-form-management`, `rich-text-editor`, `common-dialog` 등 여러 기존 영역에 걸쳐 있어 이 스크롤 수정과의 인과는 확인되지 않았다.
- 브라우저 렌더링 — 데스크톱 1280×800 및 좁은 화면 375×812에서 확인. 두 화면 모두 에디터 프레임은 `overflow: hidden`, `.ProseMirror`는 `overflowX/Y: auto` 및 16px padding을 가졌다. 편집 영역 상단은 프레임 경계와 테두리 1px 차이로 정렬됐다.
- `git diff --check` — 통과.

## 스크린샷

- 데스크톱: [draft-form-editor-scroll-desktop.png](./screenshots/draft-form-editor-scroll-desktop.png)
- 좁은 화면: [draft-form-editor-scroll-mobile.png](./screenshots/draft-form-editor-scroll-mobile.png)
