# 공지사항 오류 수정 진행 원장

## 범위

- 작업지시서: [공지사항 실제 브라우저 테스트 작업지시서](../../../directions/20260917/20260917_001_공지사항_실제브라우저테스트_작업지시서.md)
- 계획서: [공지사항 오류 수정 계획서](../../../plan/20260917/20260917_001_공지사항_실제브라우저테스트_계획서.md)
- 사양서: [공지사항 오류 수정 상세 사양서](../../../spec/20260917/20260917_001_공지사항_실제브라우저테스트_사양서.md)
- 실행 계획: [공지사항 오류 수정 상세 실행 계획](../../../superpowers/plans/2026-09-17-notice-crud-comments.md)

## 승인 및 진행 상태

- 작업지시서 승인: 완료
- 계획서·사양서 승인: 완료
- Worktree: 사용하지 않음, 현재 브랜치 `socra710`
- 실행 방식: Inline Execution

## 태스크 상태

- [x] Task 1: 오류 재현 및 회귀 테스트 고정
- [x] Task 2: 공지 저장·첨부·목록 위치·draft 초기화 수정
- [x] Task 3: 댓글·답글 작성 실패 상태 회귀 검증
- [x] Task 4: 최종 빌드·전체 테스트·브라우저 검증·리뷰

## 현재 검증 증거

- 기준선: 공지사항 관련 테스트 30개 통과
- Task 1 RED: 서버 목록 재조회 기대 1건, 제목 초기화 기대 1건 실패
- Task 2 GREEN: 관련 테스트 31개 통과
- Task 3 GREEN: 관련 테스트 31개 통과
- 참고 경고: 일부 댓글 테스트에서 React `act(...)` 경고가 발생하지만 테스트 실패는 없음
- 최종 관련 테스트: 공지사항 테스트 3개 파일, 31개 통과
- 최종 빌드: `cd frontend; npm run build` 성공
- 전체 테스트: 38개 파일 중 14개 실패, 120개 테스트 실패. F1-Grid·메뉴 관리 등 기존 무관 영역 실패이며 공지사항 관련 3개 파일은 통과
- 브라우저: 로그인 후 UI 클릭으로 공지사항 접근 성공
- 브라우저 뷰포트: 375px, 768px, 1280px 캡처 완료
- 작성 모달: 제목 입력 후 닫기·재개방 시 제목이 빈 값으로 초기화됨

## 변경 파일

- `frontend/src/pages/groupware/community/notice/CommunityNoticePage.tsx`
- `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`
- `frontend/tests/notice-page-local-updates.test.tsx`

## 브라우저 캡처

- [모바일](screenshots/notice-mobile.png)
- [태블릿](screenshots/notice-tablet.png)
- [데스크톱](screenshots/notice-desktop.png)
- [작성 모달](screenshots/notice-composer.png)

## DB 영향

- 테이블·컬럼·인덱스·마이그레이션 변경 없음
- DB 스크립트: 해당 없음

## 리뷰 판정

- 사양 준수: 통과
- 코드 품질: 통과
- 리뷰 보완: 첨부 업로드 실패 시 오류 메시지와 제목 draft 보존 assertion 추가 후 관련 테스트 재통과
- Critical/Important 이슈: 없음
- Minor: 전체 테스트의 무관 영역 기존 실패와 React `act(...)` 경고는 범위 밖으로 기록
