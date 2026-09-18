# 공지사항 댓글 피드형 표시·입력 개선 진행 원장

## 범위

- 작업지시서: [공지사항 댓글 피드형 표시·입력 개선 작업지시서](../../../directions/20260917/20260917_002_공지사항_댓글_피드형입력_개선_작업지시서.md)
- 계획서: [공지사항 댓글 피드형 표시·입력 개선 계획서](../../../plan/20260917/20260917_002_공지사항_댓글_피드형입력_개선_계획서.md)
- 사양서: [공지사항 댓글 피드형 표시·입력 개선 상세 사양서](../../../spec/20260917/20260917_002_공지사항_댓글_피드형입력_개선_사양서.md)

## 승인 및 진행 상태

- 작업지시서 승인: 완료
- 계획서·사양서 승인: 완료
- Worktree: 사용하지 않음, 현재 브랜치에서 진행
- 실행 방식: Inline Execution

## 태스크 상태

- [x] Task 1: 깊은 답글 및 키보드 입력 실패 기준 고정
- [x] Task 2: 답글 표시 평탄화 및 최상위 부모 정규화
- [x] Task 3: 한 줄 입력창, 첨부 아이콘, Enter 등록 UX 반영
- [x] Task 4: 집중 테스트·빌드·브라우저 검증·결과 문서화

## 검증 증거

- 기준선: 공지사항 관련 기존 테스트 31개 통과
- 집중 테스트: `feed-components.test.tsx`, `notice-page.test.tsx`, `notice-page-local-updates.test.tsx`, `notice-composer-payload.test.ts` 총 38개 통과
- 빌드: `cd frontend; npm run build` 성공, TypeScript 검사 및 Vite 빌드 완료
- 브라우저 Shift+Enter: 댓글 입력 DOM이 `<p>브라우저 댓글<br>줄바꿈</p>`로 확인됨
- 브라우저 Enter: `POST /api/v1/common/comments` 요청 발생, 등록 후 입력 DOM이 빈 에디터로 초기화됨
- 반응형 측정: 375px/768px/1280px 모두 document 가로 스크롤 없음, 입력 높이 28px
- 스크린샷: `screenshots/notice-comment-mobile.png`, `notice-comment-tablet.png`, `notice-comment-desktop.png`
- 전체 프론트엔드 테스트: 120초 타임아웃으로 완료되지 않음. 출력상 F1-Grid·메뉴·테마 등 무관 영역 실패가 있었고, 공지사항 관련 테스트는 통과함.

## 변경 파일

- `frontend/src/shared/components/feed/TiptapCommentThread.tsx`
- `frontend/src/shared/components/feed/CommentThread.tsx`
- `frontend/tests/feed-components.test.tsx`

## 리뷰 판정

- 사양 준수: 통과
- 코드 품질: 통과
- Critical/Important 이슈: 없음
- 최종 리뷰 보완: Enter capture 핸들러가 에디터 DOM 대상에서만 동작하도록 제한하고, `rootCommentId` fallback을 nullish 기준으로 정리함
- 참고: Tiptap contenteditable의 Enter DOM 이벤트는 jsdom에서 직접 검증이 불안정하여 등록 조건을 `isCommentSubmitKey`로 분리해 자동 검증하고, 실제 Enter 등록은 브라우저에서 API 요청으로 검증함

## DB 영향

- 테이블·컬럼·인덱스·마이그레이션 변경 없음
- DB 스크립트: 해당 없음, 영향 검토 완료
