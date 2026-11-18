# 메뉴 imperative handle 선언 순서 정리 작업지시서

- 잔여 lint 139개 중 MenuManagementPanel의 초기화 전 변수 참조 진단 두 개를 정리한다.
- handle factory가 참조하는 columns/handleSave의 선언 뒤로 등록 블록을 이동한다.
- useImperativeHandle과 바로 뒤 dirty 알림 useEffect를 함께 원문 그대로 이동해 전체 Hook 호출 순서를 유지한다.
- 저장·권한·내보내기·행 삭제·dirty 알림·예외 처리·의존 배열은 바꾸지 않는다. 코드 위치 정리 이외의 기능 변경은 하지 않는다.
- 이 지시서 → 계획 028 → 사양 028 → 최소 이동 → 실제 메뉴 테스트/정적 검증 → 결과·작업별 커밋/push 순서다.
