# 공통 리치 텍스트 에디터 및 공지 페이지 분리 결과

## 작업 범위

- 공지 작성과 기안양식 본문이 도메인 중립 `frontend/src/shared/components/rich-text-editor/`를 함께 사용한다.
- 공통 clipboard 정규화, Tiptap schema/toolbar, font/color controls, 이미지 placeholder/upload 상태와 선택 이미지 resize를 shared에 둔다.
- Notice와 drafting-form의 upload, image restore/delete, 저장 payload 및 권한 계약은 각 도메인 service/dialog에 유지한다.
- 공지 페이지의 목록/paging, category filter, detail/reaction, comments, CRUD/pin 동작을 책임별 hooks로 옮겼다. API/form/view model types는 `types/community.types.ts`, 순수 post/comment 변환은 `data/`에 둔다.
- `noticeClipboard.ts`와 `noticeContentStyles.ts`의 공통 구현은 shared 경로로 옮겼다. shared 파일명에는 `notice`를 사용하지 않는다.
- 백엔드/API/DB 계약은 변경하지 않았다.

## 검증

Focused 명령:

```powershell
npm --prefix frontend run test -- tests/rich-text-editor.test.tsx tests/rich-text-editor-clipboard.test.ts tests/rich-text-editor-resize.test.ts tests/notice-clipboard.test.ts tests/notice-composer-payload.test.ts tests/notice-composer-dialog-theme.test.tsx tests/draft-form-template-dialog.test.tsx tests/draft-form-template-service.test.ts tests/use-notice-categories.test.tsx tests/use-notice-list.test.tsx tests/use-notice-interactions.test.tsx tests/use-notice-comments.test.tsx tests/use-notice-mutations.test.tsx tests/notice-post-adapter.test.ts tests/notice-comment-tree.test.ts tests/notice-view-adapter.test.ts tests/notice-summary.test.ts
```

- 결과: 17 test files passed, 79 tests passed.
- `npm --prefix frontend run build`: TypeScript와 Vite production build 통과.
- 변경 파일 diagnostics: 관련 shared editor, notice, drafting-form 및 document-write 파일에 오류 없음.

공지 페이지 기존 suite는 기준선과 현재 결과를 구분한다.

- 구현 전 기준선: `notice-page.test.tsx`, `notice-page-local-updates.test.tsx`, notice view adapter 및 summary suite 합계 4 files 중 2 files failed; 61 tests 중 25 failed, 36 passed.
- 현재 재실행: `notice-page.test.tsx` 26 tests 중 7 failed, 19 passed. `notice-page-local-updates.test.tsx` 32 tests 중 20 failed, 12 passed.
- 확인한 현재 실패 중 하나는 삭제 실패 테스트의 `getByText('기존 공지')`가 공지 제목과 요약 패널의 같은 텍스트를 동시에 찾는 다중 매치다. 두 suite의 현재 실패 총수는 기준선보다 2개 많으므로 전체를 모두 pre-existing로 단정하지 않는다.
- 사용자 요청에 따라 이 문서 갱신 단계에서는 page suite 실패 원인 수정이나 범위 확대를 하지 않았다. 해당 suite들은 merge 전 별도 확인이 필요하다.

## 브라우저 확인

기존 4173 개발 서버와 인증된 UI를 사용했다. 메뉴를 통한 공지사항과 기안양식관리 이동을 확인했으며, 실제 저장 요청은 수행하지 않았다.

| 화면/뷰포트 | dialog 폭 | editor 폭 | document 가로폭 | 관찰 |
| --- | ---: | ---: | ---: | --- |
| 공지 1280px | 820px | 770px | 1280px | toolbar가 viewport 안에 위치 |
| 공지 768px | 704px | 654px | 768px | toolbar가 viewport 안에 위치 |
| 공지 375px | 311px | 277px | 375px | 페이지 전체 가로 overflow 없음 |
| 기안양식 1280px | 820px | 738px | 1280px | 글꼴/크기/색상 controls 표시 |
| 기안양식 768px | 704px | 622px | 768px | 글꼴/크기/색상 controls 표시 |
| 기안양식 375px | 311px | 245px | 375px | 페이지 전체 가로 overflow 없음. toolbar 우측 rect가 viewport 끝보다 1 CSS px 큰 측정값을 보였음 |

기안양식 본문에서 HTML 표 1행·2셀을 실제 paste하고 두 셀의 값이 보존되는 것을 확인했다. 변경 본문은 저장하지 않고 취소/폐기했다. 이미지 파일 업로드 및 pointer drag resize는 실제 browser upload/drag로 확인하지 않았으며, upload adapter/failure/cleanup과 resize handle·계산은 focused Vitest로 검증했다.

사용자가 “캡처 이미지는 패스하고 문서만 갱신”하도록 요청해 `screenshots/`에 이미지 파일을 저장하지 않았다. 따라서 시각 결과물의 이미지 근거는 생략했으며 위 viewport/geometry 관찰만 기록한다.

## 변경 파일 개요

- Shared editor: `RichTextEditor.tsx`, `richTextEditor.types.ts`, `clipboard.ts`, `editorStyles.ts`, `contentStyles.ts`, `imageResize.ts`
- Notice feature: `CommunityNoticePage.tsx`, composer, `hooks/`, `types/community.types.ts`, `data/noticePostAdapter.ts`, `data/noticeCommentTree.ts`, notice service type re-export
- Draft form: `DraftFormTemplateDialog.tsx` shared editor adapter integration
- Tests: shared editor/clipboard/resize, notice adapters/hooks/composer, draft dialog integration
- Specs/plans: approved 015 documents and 011/012 reuse-boundary updates

## 잔여 확인

- `git diff --check` 결과는 최종 문서 저장 후 실행해 확인한다.
- Notice page legacy suites에는 현재 baseline 대비 추가 실패 2개가 관찰되어 별도 검토가 필요하다.
- Browser screenshot artifacts는 사용자 요청으로 생략했다.