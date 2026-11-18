# 공통 이미지 상태 경계 상세사양

## ProfileAvatar

failedImageUrl의 초기값 null과 onError의 호출자 콜백→실패 URL 기록 순서는 유지한다. 이전 imageUrl을 state로 보관하고 현재 prop과 다를 때 이전 값을 갱신하면서 failedImageUrl을 null로 조정한다. 조건은 원래 effect dependency처럼 string/null/undefined/빈 문자열을 구별한다.

같은 실패 URL과 무관한 부모 재렌더는 fallback을 유지한다. A 실패→B→A, A 실패→null→A에서는 A를 다시 전달한다. 새 URL이 로드되지 않으면 기존 fallback으로 돌아간다. name/alt·fallback child·Avatar props·ref·onError 이벤트 인수와 순서는 변경하지 않는다. inner MUI Avatar의 자체 이미지 로딩 상태를 대체하지 않는다.

## ImageViewerDialog

displaySrc state/effect를 제거하고 기존 img src 자리에 src prop을 직접 전달한다. 열린 뷰어의 외부 src 변경은 첫 commit부터 새 이미지 URL이어야 한다. 빈 src 또는 open=false이면 기존처럼 null을 반환하고 다시 열 때 최신 src를 쓴다.

CommonDialog, title/alt/닫기 콜백, surface/checker theme, overflow/contain/크기, 이미지 필터 미적용은 그대로다. Blob/object URL 생성·해제와 데이터 계약은 이 컴포넌트의 책임으로 새로 옮기지 않는다.

## 검증

아바타 재시도 회귀는 원래 계약을 검증하며 RED는 대상 lint gate로 확인한다. 뷰어는 Profiler에서 실제 img의 첫 commit src를 관찰해 이전 코드의 stale src로 실패해야 한다. Portal의 최초 mount 중 DOM 부재는 null로 관찰하고 외부 prop 변경 직전에 관찰값을 비운다.

기존 프로필/테마/피드/댓글 회귀를 실행한다. lint는 effect-state 93→91, 전체 115→113이고 deps14·refs8을 포함한 다른 진단은 동일해야 한다. typecheck/build와 source byte 일치를 확인한다. 합성 이미지·합성 이름만 사용해 실제 light/dark 뷰어를 375/768/1280px에서 확인하고 비율/색상/가로 넘침과 아바타의 정상·실패·복원을 기록한다. backend/API/DB 변경은 없다.
