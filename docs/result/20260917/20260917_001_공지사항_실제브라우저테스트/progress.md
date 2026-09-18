# 20260917_001 공지사항 Task 7 진행 및 결과

## 최종 구현 상태

- 공지사항 목록 API 외부 호출 1회에서 게시글, 첨부파일, 댓글, 답글, 댓글 수를 함께 반환하도록 통합했다.
- 백엔드는 목록 응답을 조합하기 위해 게시글별 첨부·댓글·댓글 첨부를 내부 hydrate하므로 서버 내부 조회 비용은 남아 있다.
- 댓글 최근 3건 조회는 root 기준 페이지네이션으로 처리하고 `beforeCommentId`와 전체 `count`를 사용한다.
- 댓글 첨부파일 owner type은 `NOTICE_COMMENT`로 연결했다.
- 댓글/답글 편집기에 Tiptap을 적용했다.
- 댓글/답글 MoreVert 액션을 연결했다.
- 댓글/답글과 첨부파일 변경은 가능한 범위에서 부분 로컬 업데이트로 반영한다.
- 공지사항 수정 시 기존 첨부파일 삭제를 지원한다.
- 공지 첨부 삭제/다운로드는 tenantId, NOTICE, postId, fileId 소유 범위를 확인한 뒤 owner-aware 공통 파일 경로로 처리한다.
- 공지/댓글 HTML은 공유 allowlist sanitizer를 거쳐 렌더링하며 이벤트 속성, SVG/script/style, javascript/data URL을 제거한다.
- 댓글 등록/수정 API 경계에서도 sanitizer를 적용한다.
- NoticeComposerDialog는 Tiptap `editor.getJSON()`을 `contentsJson`으로 저장하고 기존 HTML/text payload를 유지한다.

## 검증 결과

- 집중 프론트엔드 테스트: 최신 공지/댓글 범위 36 tests passed.
- `frontend` build: 성공.
- `backend` `mvn test`: 91 passed, 0 failed, 0 errors, 2 skipped.
- `backend` compile: 성공.
- `backend` `mvn -q -Dtest=NoticeBoardServiceImplTest test`: 통과.
- `frontend` 집중 테스트: sanitizer, feed components, Composer payload, 공지 로컬 갱신, 공통 콘텐츠 API, 공지 서비스 범위 통과.
- `frontend` `npm run build`: 성공, 1,447 modules transformed.
- Composer 테마 통합 테스트 파일은 Tiptap/MUI jsdom 실행이 120초 내 종료되지 않아 해당 실행 결과를 passing으로 처리하지 않았다. 구현 계약은 별도 payload 단위 테스트로 검증했다.
- 전체 프론트엔드 `npm test`: 120초 timeout으로 종료되었으며 passing으로 처리하지 않았다.

## 미실행 및 잔여 주의사항

- 실제 브라우저 CRUD 시나리오와 스크린샷은 실행하지 않았다.
- 외부 초기 목록 호출은 1회로 통합했지만, 백엔드 내부에서는 게시글별 관련 데이터 hydrate 조회가 수행된다. 대량 공지 성능 최적화는 별도 범위다.
- 기존 경고는 남아 있을 수 있으며, 이번 결과의 성공 판정에는 포함하지 않았다.

DB 스키마 변경은 없다.
