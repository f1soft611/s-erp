# 공지사항 우측 상세 접힘 동작 수정 결과

## 원인

우측 상세 패널이 `NoticeFeedList`를 렌더링할 때 `expandedNoticeId={selectedNotice.id}`를 고정 전달하고 있었다. 사용자가 `접기`를 눌러 `expandedNoticeId`를 `null`로 변경해도 다음 렌더링에서 선택 게시글 ID가 다시 전달되어 계속 펼쳐진 상태로 보였다.

## 수정

- `CommunityNoticePage`의 상세 패널 연결을 고정된 `selectedNotice.id`에서 실제 `expandedNoticeId` 상태를 전달하도록 변경했다.
- 기존 `handleToggleNoticeExpand` 로직과 피드형 동작은 유지했다.
- 제어형 접힘 회귀 테스트를 추가했다.

## 검증

- `npx vitest run tests/notice-page.test.tsx -t "allows a controlled expanded notice to collapse after opening"`: 1 passed
- 관련 상세/오버레이 테스트: 3 passed, 25 skipped
- `npm run build`: 통과
- 변경 파일 정적 오류: 없음

## 영향 범위

공지사항 우측 상세 패널의 `더보기`/`접기` 표시와 본문 확장 상태만 수정했다. API, DB, 권한, 게시글 기능 계약은 변경하지 않았다.
