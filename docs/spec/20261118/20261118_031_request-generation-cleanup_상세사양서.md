# 요청 세대 cleanup 상세사양

## 원인

진단 6개는 DOM ref node를 cleanup에서 읽는 사례가 아니다. 모두 useRef(0) numeric generation을 cleanup 시 증가시켜 이전 요청을 무효화한다. 현재 분석은 cleanup의 prefix increment를 쓰기 소유 표시로 인식하지 않아 직접 current 접근 경고를 보고한다.

## 최소 수정과 보존

해당 cleanup 6곳만 prefix increment에서 명시적인 plus-assignment로 바꾼다. 숫자 counter의 현재값에 1을 더한다는 연산과 최신값을 읽는 시점은 동일하다. ref 객체·counter 초기값·요청 시작 increment·응답 비교·effect deps·cleanup의 나머지 구문을 유지한다.

진단 안내대로 mount 시 current 숫자를 복사하지 않는다. 그러면 이후 요청의 최신 generation을 무효화할 수 없다. 새 ref/helper나 규칙 억제로 경고를 숨기지 않는다.

## 검증

소유한 5파일의 6개 진단 gate RED → GREEN, 전체 exhaustive-deps 28 → 22/전체 133 → 127을 확인한다. 같은 업무의 실제 초기 오류·저장·선택·재조회 테스트, typecheck와 최소 변경 audit를 수행한다.

화면·API·서비스·백엔드·SQL·manifest를 바꾸지 않는다. UI 구조를 바꾸지 않는 숫자 쓰기 표현 정리라 신규 스크린샷 대상이 아니다.
