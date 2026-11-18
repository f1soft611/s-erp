# 서버 날짜 callback commit 상세사양

## 원인 가설과 재현

기존 hook은 render 본문에서 onDateRef.current/onErrorRef.current를 갱신한다. React의 commit 전 중단 가능한 render가 같은 ref 객체를 바꾸면 현재 commit 화면이 기다리는 응답이 미반영 callback으로 전달될 수 있다.

초기 요청을 pending으로 두고 transition render에서 새 callback을 전달한 뒤 suspend한다. 새 render가 시도되었지만 commit되지 않았음을 확인하고 기존 요청을 성공/실패 완료한다. 최신 commit callback만 실행되어야 한다.

## 수정 경계

두 ref 대입만 onDate/onError를 의존하는 useLayoutEffect로 이동한다. 초기값은 useRef 인수 그대로다. layout 단계에서 commit callback을 갱신하므로 passive 조회 effect 및 commit 이후 비동기 응답/이벤트가 최신 callback을 사용한다.

이는 상태 effect를 layout effect로 바꿔 lint를 감추는 변경이 아니다. render 쓰기를 실제 commit 경계로 옮기는 것이며 이 layout effect는 ref만 갱신한다. 새로운 조회·UI state update·cleanup은 넣지 않는다.

## 보존 및 검증

enabled 조회 횟수, 안정적인 reload/markTouched 함수, 늦은 응답의 사용자 입력 덮어쓰기 방지, 실패 시 날짜 미대입, unmount 보호, 서버 날짜 원칙을 유지한다. 서비스/API/DB 계약은 바꾸지 않는다.

성공·실패 concurrent 재현 RED → GREEN, 기존 hook 및 실제 수주등록 회귀, typecheck를 확인한다. refs 10 → 8/전체 135 → 133 이외 진단은 동일해야 한다. UI 구조를 바꾸지 않는 lifecycle 정리이며 신규 화면 스크린샷 대상이 아니다.
