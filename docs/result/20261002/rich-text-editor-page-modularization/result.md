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

| 화면/뷰포트     | dialog 폭 | editor 폭 | document 가로폭 | 관찰                                                                                            |
| --------------- | --------: | --------: | --------------: | ----------------------------------------------------------------------------------------------- |
| 공지 1280px     |     820px |     770px |          1280px | toolbar가 viewport 안에 위치                                                                    |
| 공지 768px      |     704px |     654px |           768px | toolbar가 viewport 안에 위치                                                                    |
| 공지 375px      |     311px |     277px |           375px | 페이지 전체 가로 overflow 없음                                                                  |
| 기안양식 1280px |     820px |     738px |          1280px | 글꼴/크기/색상 controls 표시                                                                    |
| 기안양식 768px  |     704px |     622px |           768px | 글꼴/크기/색상 controls 표시                                                                    |
| 기안양식 375px  |     311px |     245px |           375px | 페이지 전체 가로 overflow 없음. toolbar 우측 rect가 viewport 끝보다 1 CSS px 큰 측정값을 보였음 |

기안양식 본문에서 HTML 표 1행·2셀을 실제 paste하고 두 셀의 값이 보존되는 것을 확인했다. 변경 본문은 저장하지 않고 취소/폐기했다. 이미지 파일 업로드 및 pointer drag resize는 실제 browser upload/drag로 확인하지 않았으며, upload adapter/failure/cleanup과 resize handle·계산은 focused Vitest로 검증했다.

사용자가 “캡처 이미지는 패스하고 문서만 갱신”하도록 요청해 `screenshots/`에 이미지 파일을 저장하지 않았다. 따라서 시각 결과물의 이미지 근거는 생략했으며 위 viewport/geometry 관찰만 기록한다.

## 변경 파일 개요

- Shared editor: `RichTextEditor.tsx`, `richTextEditor.types.ts`, `clipboard.ts`, `editorStyles.ts`, `contentStyles.ts`, `imageResize.ts`
- Notice feature: `CommunityNoticePage.tsx`, composer, `hooks/`, `types/community.types.ts`, `data/noticePostAdapter.ts`, `data/noticeCommentTree.ts`, notice service type re-export
- Draft form: `DraftFormTemplateDialog.tsx` shared editor adapter integration
- Tests: shared editor/clipboard/resize, notice adapters/hooks/composer, draft dialog integration
- Specs/plans: approved 015 documents and 011/012 reuse-boundary updates

## 2026-10-03 스크롤 회귀 후속

사용자 확인으로 공지사항을 source split한 뒤 editor/toolbar scroll이 동작하지 않는 문제가 보고됐다. 원인은 shared `RichTextEditor`가 `EditorContent` 바깥에 새 Box wrapper를 만들면서, 그 wrapper와 EditorContent root에 shrink 가능한 flex height(`min-height: 0`, `flex: 1`)를 주지 않은 점이다. 실제 DOM에서 notice editor root는 287px였지만 EditorContent와 ProseMirror는 948px로 늘어났다. 부모는 `overflow: hidden`이라 ProseMirror의 `overflow: auto`가 내부 scroll viewport를 만들지 못했다.

공통 에디터에 `.rich-text-editor-content` flex wrapper를 추가하고 outer/content wrapper를 `flex: 1`, `min-height: 0`, bounded height로 구성했다. notice 호출부에도 root flex/min-height 제약을 복원해 editor body 자체가 overflow를 소유하도록 했다. toolbar는 기존 `overflow-x: auto`만으로는 일반 세로 wheel이 가로 scroll로 전환되지 않았고 React passive wheel handler의 `preventDefault()`가 브라우저 console error를 냈다. 공유 toolbar에 `{ passive: false }` native wheel listener를 두어 기본 세로 scroll을 취소하고 horizontal `scrollLeft`로 변환했으며 얇은 scrollbar style을 추가했다.

- 회귀 테스트: `rich-text-editor.test.tsx`에서 bounded flex wrapper와 wheel event cancellation/scrollLeft 이동을 검증한다.
- Browser after fix: 375px에서 ProseMirror clientHeight 518px, scrollHeight 1800px, overflowY/overflowX `auto`; document width 375px. 긴 표의 `.tableWrapper` clientWidth 230px, scrollWidth 858px, overflowX `auto`로 table 가로 스크롤이 editor 내부에 남는다. Toolbar clientWidth 193px/scrollWidth 570px이며 vertical wheel에서 `defaultPrevented=true`, scrollLeft가 증가했다.
- Browser viewport checks: 1280px, 768px, 375px 모두 document width가 viewport와 같고 editor clientHeight 518px/scrollHeight 1800px로 내부 세로 스크롤이 유지됐다.
- Verification: scroll/editor/notice/draft focused suite 4 files, 48 tests passed. `npm --prefix frontend run build` passed; changed-file diagnostics clean.
- Screenshots: 사용자가 캡처를 생략하도록 요청해 이번 후속에서도 저장하지 않았다.

## 2026-10-03 Toolbar 통일 후속

- 사용자 제공 toolbar 목록을 적용했다: `문단`, 굵게, 기울임, 밑줄, 취소선, 글자색, 표 삽입, 링크, 번호 목록, 글머리 목록. Font family/font size picker는 제거했고 inline typography schema/paste support는 보존한다.
- Notice 전용 trigger/panel style override를 제거했다. 공지 작성과 기안양식은 같은 shared theme 기반 trigger, icon command button, panel spacing과 scroll 동작을 사용한다.
- Link는 StarterKit의 기존 Link extension을 configure하고, underline은 StarterKit built-in extension을 사용한다. 불필요한 direct underline dependency는 추가하지 않았다.
- Tests cover command list, paragraph/underline/color/table/link apply/remove and horizontal wheel scrolling. Notice/draft integration tests verify the same toolbar list and unchanged domain adapters.
- 후속 focused suites: editor, Notice payload/theme, Draft dialog/service; 5 files, 61 tests passed. `npm --prefix frontend run build`: passed.
- Chromium 확인: Notice와 기안양식의 toolbar command 목록 및 panel style이 같고, 글꼴/글자 크기 선택기는 없으며 글자색 `A` control은 표시된다. `git diff --check` 및 변경 파일 diagnostics도 통과했다.
- 캡처는 사용자 요청에 따라 저장하지 않았다.

## 2026-10-03 Reference UI 후속

- 굵게 trigger/command와 Notice 첨부 버튼을 공통 32×32px, 1px 테두리, theme 반경/배경 스타일로 통일했다.
- 문단 메뉴를 `본문`, `제목 1`, `제목 2`, `부제목`으로 구성했다. 본문은 기본 paragraph(16px/400), h1은 24px/700, h2는 20px/700, 부제목 h3은 18px/600으로 표시한다.
- OS 색상 picker를 기본색 초기화 action과 16개 접근 가능한 swatch를 가진 compact palette로 교체했다.
- 링크 popover에 표시 텍스트와 URL, 취소/확인을 추가했다. 선택된 텍스트 교체, 선택이 없는 링크 텍스트 삽입, URL 검증, 기존 링크 제거를 검증했다.
- Focused editor/Notice/Draft suites: 5 files, 63 tests passed. `npm --prefix frontend run build`, `git diff --check`, changed-file diagnostics passed.
- Chromium: 1280px/375px에서 팝오버가 viewport 안에 있고 document 가로 넘침이 없음을 확인했다. 375px에서 Notice toolbar panel 오른쪽 끝은 x=360, viewport는 375px이며 굵게 trigger/첨부 버튼은 32×32px로 일치했다.
- 스크린샷은 이전 요청에 따라 저장하지 않았다.

## 2026-10-03 Active State 및 최근 색상 후속

- 툴바 trigger와 command icon의 개별 border를 제거하고 toolbar panel의 외곽선은 유지했다. Notice 첨부 action은 툴바 밖의 outlined 버튼으로 유지했다.
- Editor transaction 구독으로 selection/formatting 변경 직후 `aria-pressed`와 `action.selected` 배경을 갱신한다. 굵게와 밑줄이 함께 활성화될 때 두 아이콘 모두 선택 상태로 표시된다.
- 고정 색상은 12개로 제한하고 최근 선택 색상은 중복 제거 후 최신순 최대 6개로 표시한다.
- Focused editor/Notice/Draft suites: 5 files, 65 tests passed. `npm --prefix frontend run build`, `git diff --check`, changed-file diagnostics passed.
- Chromium: 375px에서 document width 375px, toolbar panel right edge x=360, palette right edge x=345; 1280px에서도 panel과 palette가 viewport 안에 배치됐다. Toolbar button border width는 0px이며 active command는 selected 배경을 사용한다.
- 스크린샷은 사용자 요청에 따라 저장하지 않았다.

## 잔여 확인

- `git diff --check`: passed after the final documentation update.
- Notice page legacy suites에는 현재 baseline 대비 추가 실패 2개가 관찰되어 별도 검토가 필요하다.
- Browser screenshot artifacts는 사용자 요청으로 생략했다.
