# 공통 이미지 상태 경계 정리 계획

## 설계

ImageViewerDialog의 displaySrc는 src로 초기화하고 src effect에서만 덮어쓰며 사용자 수정이 전혀 없다. 별도 key state나 remount 대신 prop을 직접 쓰는 것이 최소 변경이다. ProfileAvatar의 실패 상태는 사용자 이미지 error에서 바뀌므로 필요하다. 기존 failedImageUrl과 onError는 유지하고 이전 imageUrl이 바뀐 경우에만 failedImageUrl을 null로 조정한다.

failedImageUrl을 초기화하지 않고 비교만 유지하면 A 실패→B→A에서 A를 다시 시도하지 못한다. key remount는 Avatar/ref identity와 호출자 props를 불필요하게 바꾸므로 선택하지 않는다. 경고 우회를 위한 helper·타이머·layout effect·disable도 사용하지 않는다.

## 순서

- [x] 기존 지시·사양과 운영 2파일, 기존 테스트 2파일을 확인했다.
- [x] Profiler 첫 commit src 회귀와 아바타 A 실패→동일 A→B→A 및 빈 URL 경계 회귀를 추가했다.
- [x] 기존 코드에서 뷰어 회귀 1개와 대상 lint 2개의 RED를 확인했다. 아바타 사례는 기존 재시도 계약을 보존하는 회귀다.
- [x] 아바타의 조건부 실패 상태 초기화, 뷰어의 순수 prop 표시만 구현했다.
- [x] 관련 6파일/126개·typecheck/build, lint 115→113·다른 진단 동일, source 890파일 byte 일치/변경 경계를 확인했다.
- [x] 실제 light/dark 뷰어 3폭과 아바타의 정상/실패/복원 상태를 확인했다.
- [x] 결과·스크린샷·scope 근거를 기록했다. 이 검증 경계로 별도 commit/push한다.
