# 잔여 lint 저위험 항목 정리 작업지시서

- 사용자 요청: “나머지도 해결해줘”. 기존 의존성 두 권고와 lint 206개를 단순 보류로 끝내지 않고 가능한 수정과 실제 차단 사유를 구분해 순차 진행한다.
- 먼저 현재 JSON 진단을 기준으로 동작 보존을 입증하기 쉬운 11개를 정리한다. 전체 206개를 이 단위에서 완료했다고 표시하지 않는다.
- 대상은 duplicate key 1, unused vars 8, extra boolean cast 1, constant binary expression 1이다.
- 기존 값·조건·예외 안내·DOM 준비 대기·render/단언을 보존한다. 미사용 변수 제거를 이유로 기존 테스트 준비 조건을 삭제하지 않는다.
- 그다음 export boundary 56, effect state 97, Hook dependency 28, refs 10, immutability 2, memoization 2는 각 소유 흐름과 검증을 갖춘 별도 단위로 진행한다.
- 규칙 비활성화, ignore 추가, hook 이름 변경으로 분석 회피, 불필요한 microtask 지연, 테스트 skip/retry/timeout 상향은 금지한다.
- 의존성은 공식 upstream 수정 또는 최소 변경의 호환성 증거를 확인한다. 단순히 audit 숫자를 줄이기 위한 major 교체·비공식 임의 패치는 하지 않는다. 지원 범위 밖 변경은 별도 사양과 실제 소비자 검증 근거가 있어야 한다.
- 순서는 지시서 → 계획 025 → 사양 025 → 최소 수정 → 관련 테스트/정적 검증 → 결과·작업별 커밋/push다.
