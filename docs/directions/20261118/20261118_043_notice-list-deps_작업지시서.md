# 공지 목록 의존성 선언 작업지시서

- 근거: 잔여 lint 순차 처리 요청과 공지 목록의 exhaustive-deps 경고 2개다.
- 범위: useNoticeList.loadNoticePosts의 selectedNoticeFilter와 CommunityNoticePage의 분류명 동기화 effect의 setNoticeItems 의존성 선언만 보완한다.
- selectedNoticeFilter는 기존 loadAllPinnedPosts 의존성으로 이미 callback을 갱신한다. setNoticeItems는 useNoticeList가 useState에서 그대로 반환한 안정적인 setter다. 새로운 갱신 조건이나 요청을 만들지 않는다.
- 함수/effect 본문, 요청 세대·중복 요청 보호, 페이징·필터·고정 목록, JSX·스타일·권한·API/DB 계약은 변경하지 않는다. 다른 공지 effect-state/image/comment 경고를 함께 수정하지 않는다.
- 계획 → 사양 → 기존 runtime 기준선·대상 lint 실패 확인 → 의존성 선언만 수정 → 같은 회귀/정적 검사 → 결과·근거 → 별도 커밋·비강제 푸시 순서다.
