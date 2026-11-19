# 잔여 의존성 권고 재평가 작업지시서

- [백엔드 후속 022](../../result/20261118/repository-remediation/20261118_022_backend-config-fixtures_결과.md) 완료 뒤 기존 npm 권고 두 건을 현재 exact lock 기준으로 재평가한다.
- registry 최신 버전, GitHub 공식 advisory의 영향/패치 범위, 현재 의존 경로를 확인한다. 전체 설치 집합과 dev 제외 집합을 구별한다.
- 공식 지원·호환 범위의 수정만 적용한다. 강제 major override, audit fix --force, 도구/ExcelJS의 major downgrade로 경고 수만 줄이지 않는다.
- 패치 경로가 없으면 해결됐다고 표현하지 않고 잔여 위험·확인 경계·후속 조건을 기록한다.
- 소스·lock 변경이 없으면 기존 전체 CI를 불필요하게 반복하지 않는다. 실제 의존 변경이 생기면 별도 검증 범위를 정한다.
- 작업지시서 → 계획 023 → 상세사양 023 → 지원 가능한 조치 판단 → 결과·작업별 커밋/push 순서다.
