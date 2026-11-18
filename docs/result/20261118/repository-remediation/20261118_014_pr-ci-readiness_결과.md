# PR·CI 준비 상태 검토 결과

- [계획서](../../../plan/20261118/20261118_014_pr-ci-readiness_계획서.md)
- [상세사양](../../../spec/20261118/20261118_014_pr-ci-readiness_상세사양서.md)
- 2026-11-18 gh 읽기 전용 조회 기준이다. 원격 상태는 이후 바뀔 수 있다.

## PR과 현재 브랜치는 별개

| 대상 | 확인 결과 |
| --- | --- |
| [PR #76](https://github.com/f1soft611/s-erp/pull/76) | OPEN, mergeable CONFLICTING, mergeStateStatus DIRTY |
| PR head → base | `9e17105f` → `24828c5f`, fix/pr75-delivery-plan-test-ci → main |
| PR 검사 | lint/build 성공, tests/frontend-required 실패, Vercel 성공 |
| 현재 로컬 기준 | socra710, bf6cf0bb |
| 현재 브랜치 최신 CI run 44222170616 | lint/build 성공, tests/frontend-required 실패 |

PR 변경은 출하계획 테스트 한 파일의 네 줄 교체와 관련 문서 네 개, 총 다섯 파일이다. 이번 미커밋 회귀 복구를 그 PR이 포함한다고 볼 수 없다. 현재 원격 CI 로그에는 복구 전 공지·문서·권한 등 실패가 남아 있으며 로컬 검증으로 원격 체크를 성공 처리하지 않았다.

PR 충돌은 원격 head와 base의 통합 문제다. 이번 공유 브랜치에서 임의 merge/rebase하지 않았다. 후속 통합 시 PR 소유 브랜치에서 최신 main에 대한 충돌을 해결하고, 이 작업을 반영한 정확한 커밋으로 CI를 다시 실행해야 한다.

## CI 공백과 다음 조치

현재 workflow는 `.github/workflows/frontend-ci.yml` 하나다. Node 22의 lock 설치 뒤 lint/build/2-worker tests를 분리하고 frontend-required가 전체 결과를 전파한다. checkout/setup-node는 SHA pin, 권한은 contents:read, checkout credential persistence는 false다. 실패 전파·시간 제한·재시도·검사 제외를 변경하지 않았다.

1. **통합 차단 유지:** PR 충돌과 실패 체크가 해소되기 전 병합하지 않는다. 원격 통합은 사용자 승인과 별도 브랜치 작업이 필요하다.
2. **Java 8 API gate 추가 제안:** JDK 17 이상과 Maven에서 backend의 `mvn -B -q -Dmaven.compiler.release=8 clean compile`을 독립 job으로 추가할 수 있다. 로컬에서 검증했지만 workflow 추가나 원격 required check 지정은 수행하지 않았다.
3. **전체 백엔드 gate는 별도:** 비공개 profile 파일을 직접 읽는 기존 두 테스트를 비민감 test fixture 기반 계약으로 정리한 뒤 `mvn test` gate를 추가한다. 현재 오류를 skip하거나 실제 설정을 CI로 복사하지 않는다. compile-only gate를 전체 테스트 gate라고 부르지 않는다.
4. **경고·테스트 타입 범위:** lint 경고 206개는 남아 있고 tsc 대상은 src/Vite 설정이며 tests는 제외다. test 타입 검증을 도입하려면 기존 fixture 타입 정리 범위를 별도 정의해야 한다.

main protection API는 404, rulesets 목록은 빈 응답이었다. 관측한 API 결과일 뿐 접근 권한·다른 보호 방식까지 포함한 보호 부재를 확정하지 않는다.

## 공개 변경 직접 검토

실제 운영 다섯 파일과 manifest/pom diff를 직접 검토했다. 메뉴 검색 초기화 persistence, 수동 logout 세션 정리, 공지 구 응답의 로컬 댓글 보존, 기안양식 권한·저장 잠금에 따른 기존 soft-disable 허용, 날짜 요청 경합 보호로 제한된다.

새 endpoint/DTO/DB/SQL·공개 props signature·권한 정책·물리 DELETE는 추가하지 않았다. 기안양식은 기존 수정 권한과 PUT 경로를 유지한다. F1Tree/F1Grid 운영 코드는 변경하지 않았고 최신 10월 사양의 정렬·필터 비활성화 계약을 유지했다. 의존성 minor 이동과 미확인 runtime 범위는 [결과 013](20261118_013_compatible-dependencies_결과.md)에 공개했다.

직접 검토에서 추가 확정 회귀는 발견하지 않았으나 모든 화면의 무영향 보증은 아니다. 전체 frontend 결과는 최종 종합 결과와 구별해 확인한다. 이번 단계는 읽기 전용 조사·문서화이므로 신규 화면 스크린샷 대상이 아니다.

## 복사용 커밋 문구

```text
docs: PR 충돌과 CI 검증 공백 및 통합 조건 기록

- PR과 로컬 검증 기준 분리
- Java 8 compile gate 및 안전한 backend test gate 후속 제안
```

커밋·푸시·병합·원격 정책 변경은 하지 않았다.
