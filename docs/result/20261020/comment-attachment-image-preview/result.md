# 댓글 첨부 이미지 분리 미리보기 작업 결과

## 작업 요약

문서작성과 공지작성 댓글·답글에서 이미지 파일은 기존 첨부 목록에 파일명과 파일 아이콘으로 유지하고, 썸네일은 목록 아래 별도 영역에 표시하도록 변경했다. 썸네일은 기존 이미지 뷰어에서 확대할 수 있다.

## 재현 조건 및 원인

- 댓글 이미지 Blob URL이 `AttachmentList`로 전달되면 첨부파일 행 안에 작은 썸네일이 표시됐다.
- 공지 댓글 어댑터는 응답 MIME 유형을 댓글 모델에 보존하지 않아 인증된 파일 Blob 미리보기 요청을 구성할 수 없었다.
- 공통 댓글 UI에는 이미지 URL을 별도 영역에 표시하고 페이지별 확대 뷰어를 호출하는 흐름이 필요했다.

## 변경 내용

- 댓글 보기 상태의 `AttachmentList`에서만 인라인 이미지를 숨기고, 다른 사용처의 기본 동작은 유지했다.
- 공통 댓글 UI에 112×76px 미리보기 버튼 영역과 로드 실패 메시지를 추가했다.
- 문서 댓글에서 이미지 미리보기 요청 실패를 사용자에게 표시하고 기존 파일 항목과 다운로드 동작을 유지했다.
- 공지 댓글에서 MIME 정보를 보존하고 현재 표시 중인 댓글 트리의 이미지 Blob만 인증된 공통 파일 경로로 조회한다. 이전 댓글 페이지를 추가 조회하지 않는다.
- 두 화면 모두 썸네일 클릭 시 기존 `ImageViewerDialog`를 열도록 연결했다.
- 화면 또는 댓글 데이터 교체·종료 시 미리보기 object URL을 정리하고, stale 비동기 결과는 현재 화면 상태를 덮어쓰지 않도록 했다.

### 변경 파일

- 공통 UI 및 API: `frontend/src/shared/components/feed/AttachmentList.tsx`, `frontend/src/shared/components/feed/TiptapCommentThread.tsx`, `frontend/src/shared/services/commonContentApi.ts`
- 공지 댓글 데이터 및 화면: `frontend/src/pages/groupware/community/notice/types/community.types.ts`, `frontend/src/pages/groupware/community/notice/data/noticePostAdapter.ts`, `frontend/src/pages/groupware/community/notice/hooks/useNoticeComments.ts`, `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`
- 문서 댓글 화면: `frontend/src/pages/groupware/documents/write/components/DocumentApprovalDetailFeed.tsx`
- 회귀 테스트: `frontend/tests/feed-components.test.tsx`, `frontend/tests/common-content-api.test.ts`, `frontend/tests/notice-post-adapter.test.ts`, `frontend/tests/use-notice-comments.test.tsx`, `frontend/tests/notice-page-local-updates.test.tsx`, `frontend/tests/document-write-page.test.tsx`

## 검증 결과

| 검증 | 결과 |
|---|---|
| `npx vitest run tests/notice-page-local-updates.test.tsx -t "notice comment image"` | 통과: 댓글 이미지 분리·뷰어·다운로드 유지·미리보기 실패 2개 테스트 |
| `npx vitest run tests/document-write-page.test.tsx -t "approval comment image previews\|approval comment image preview failures"` | 통과: 문서 댓글 뷰어 연결·실패 안내 2개 테스트 |
| `npx vitest run tests/feed-components.test.tsx` | 통과: 38개 테스트 |
| `npx vitest run tests/notice-post-adapter.test.ts tests/use-notice-comments.test.tsx` | 통과: 어댑터 및 댓글 훅 회귀 테스트 |
| `npx vitest run tests/common-content-api.test.ts -t "fetches a comment attachment Blob"` | 통과: 공통 파일 Blob 조회 경로 테스트 |
| `npm run build` | 통과: TypeScript 검사 및 Vite 프로덕션 빌드 완료. 기존 대형 번들 경고가 출력됨 |
| `npx vitest run tests/notice-page-local-updates.test.tsx` 전체 파일 | 19개 통과, 16개 실패. 실패에는 `재조회된 공지` 등 동일 텍스트를 찾는 쿼리의 중복 결과가 포함됐다. 이번 기능의 두 이미지 테스트는 별도 실행에서 통과했으며, 범위 밖 실패는 수정하지 않았다. |

이전 `common-content-api.test.ts` 전체 실행에서도 이 작업과 무관한 4개 기존 기대값 실패(다운로드 mock 인자 및 댓글 페이지 `resultCnt`)가 보고됐다. 새 owner-scoped Blob 경로 테스트는 별도 실행에서 통과했다.

## 브라우저 확인

실제 브라우저에서 개인정보나 tenant 데이터를 포함하지 않도록 합성 댓글 데이터로 공통 댓글 UI와 기존 이미지 뷰어를 렌더링했다.

- 첨부 목록 안의 이미지 `<img>` 수: 0
- 이미지 미리보기 위치: 첨부 목록 아래
- 썸네일 크기: 112×76px
- 썸네일 클릭 시 확대 뷰어 열림 및 닫기 확인
- 페이지 가로 overflow: 375px, 768px, 1280px 모두 없음

| 뷰포트 | 스크린샷 |
|---:|---|
| 375px | [attachments-375.png](./screenshots/attachments-375.png) |
| 768px | [attachments-768.png](./screenshots/attachments-768.png) |
| 1280px | [attachments-1280.png](./screenshots/attachments-1280.png) |

문서·공지 페이지별 인증 Blob 조회 및 뷰어 연결은 위의 페이지 단위 Vitest 테스트로 확인했다. 브라우저 검증은 공통 댓글 UI 합성 fixture를 대상으로 수행했으며, 실제 backend 데이터 연결은 별도로 검증하지 않았다.

## 데이터베이스 및 API 계약

데이터베이스 스키마 변경은 없다. 신규 API 계약은 추가하지 않았으며, 공지 댓글 이미지 미리보기는 기존 owner-scoped 공통 파일 Blob 조회 경로를 사용한다.
