# 통합검색 Java 8 운영 시작 오류 수정 결과

근거: [작업지시서](../../../directions/20261102/20261102_009_통합검색_Java8호환_작업지시서.md), [계획서](../../../plan/20261102/20261102_009_통합검색_Java8호환_계획서.md), [사양서](../../../spec/20261102/20261102_009_통합검색_Java8호환_상세사양서.md).

## 원인과 수정

- 운영 시작 로그는 `UnifiedSearchServiceImpl` static 초기화 중 `NoSuchMethodError: java.util.List.of`가 발생했음을 보여 준다. Java 8에는 Java 9의 `List.of`가 없어 검색 서비스 bean 생성이 실패했고, 이 서비스에 의존하는 검색 controller와 전체 ApplicationContext 시작이 실패했다. 실시간 SSE 자체의 시작 오류로 분류하지 않는다.
- 로컬은 JDK 19.0.1이며 운영 로그는 Java 8이다. Maven의 `source/target=1.8`은 bytecode 버전만 맞추므로 새 JDK API 사용까지 차단하지 않는다.
- `UnifiedSearchServiceImpl`의 `List.of` 3곳을 Java 8 Collections/Arrays로 바꿨다. 이어서 검색 시 발생할 수 있는 Java 11 `String.isBlank` 2곳도 Spring `StringUtils.hasText`로 바꿨다.
- 유형 순서와 불변 목록, null/Unicode 공백 판정, 기존 검색 결과·권한 정책을 유지했다. 인증 또는 검색 API/SQL/Mapper/스키마는 변경하지 않았다.
- 앞서 제공된 DB close 경고는 재배포 종료 시 이미 끊어진 연결을 정리하던 경고다. 이번 시작 실패의 직접 원인은 별도로 확인된 검색 코드의 API 호환성 오류다.

## 검증

- `Java8SearchCompatibilityTest`는 검색·실시간 패키지의 production 소스를 Java 8 표준 API 대상으로 실제 컴파일한다. Lombok은 기존 annotation processor를 사용한다.
- 수정 전 `--release 8` 검사에서 `List.of` 3곳, `String.isBlank` 2곳의 API 부재로 실패했고, 수정 후 통과했다.
- 기존 검색 서비스·컨트롤러와 실시간 서버 회귀를 포함한 **30개 테스트 통과**, 실패·오류·skip 없음.
- Unicode 공백 로그인 거부와 문서 설명의 공백 제외 동작을 추가 검증했다.
- `mvn -q -DskipTests package` 통과. 재배포용 `backend/target/s-erp-backend.war`를 생성했다. 생성된 빌드 산출물을 수동 편집하지 않았다.
- 변경 diff를 직접 검토하고 `git diff --check`로 공백 오류가 없음을 확인했다.

```powershell
Set-Location backend
mvn -q "-Dtest=Java8SearchCompatibilityTest,UnifiedSearchServiceTest,UnifiedSearchApiControllerTest,RealtimeSecurityTest,RealtimePublisherTest,RealtimeStreamServiceTest,RealtimeApiControllerTest" test
mvn -q -DskipTests package
```

## 배포 및 범위

- 운영 Tomcat에서 해당 애플리케이션을 중지하고 새 `s-erp-backend.war`로 기존 배포 절차에 따라 교체한 뒤 시작한다. Manager의 Reload만으로 이전 배포 파일을 다시 시작하는 것과 구분한다.
- 새 시작 로그에 이번 `NoSuchMethodError`가 없어지고 애플리케이션 시작이 완료되는지 확인한다. 이후 통합검색 전체/각 유형과 인증된 실시간 SSE를 확인한다.
- 이 세션에서는 운영 서버에 접속하거나 재배포하지 않았다. Java 8 JVM으로 전체 WAR 기동을 직접 실행한 것은 아니며, 다른 업무·외부 라이브러리 전체의 Java 8 호환성을 보증하지 않는다. 개발 JDK는 기존 17+ 기준을 유지한다.
- UI 변경이 없으므로 프런트 빌드/브라우저/스크린샷은 해당하지 않는다.
- DB/API 데이터 계약 변경이 없는 Java 표준 API 호환성 수정이다. 이번 작업에는 DB MCP 조회나 SQL/migration/rollback 추가가 필요하지 않으며 DB 연결·스키마 확인을 수행했다고 주장하지 않는다.
