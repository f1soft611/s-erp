# 요청 세대 cleanup 표현 정리 작업지시서

- 5파일의 numeric 요청 세대 cleanup에서 보고되는 exhaustive-deps 진단 6개를 정리한다.
- 숫자 ref의 prefix increment를 명시적인 `current += 1` 쓰기로 표현한다. 최신 세대를 cleanup 시점에 읽어 무효화하는 동작을 유지한다.
- mount 시 숫자를 복사하면 늦은 응답 보호가 깨지므로 값 snapshot으로 바꾸지 않는다. 규칙 억제·함수 감추기·요청/의존 배열 변경도 하지 않는다.
- 지시서 → 계획 031 → 사양 031 → lint RED → 최소 수정 → 실제 관련 회귀/typecheck/lint → 결과·작업별 커밋/push 순서다.
