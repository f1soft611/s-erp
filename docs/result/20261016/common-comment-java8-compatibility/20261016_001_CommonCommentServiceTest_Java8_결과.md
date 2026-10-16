# CommonCommentServiceTest Java 8 호환성 수정 결과

## 근거 및 범위

- [계획서](../../../plan/20261016/20261016_001_CommonCommentServiceTest_Java8_계획서.md)
- [상세사양서](../../../spec/20261016/20261016_001_CommonCommentServiceTest_Java8_상세사양서.md)
- 수정 파일: [CommonCommentServiceTest.java](../../../../backend/src/test/java/egovframework/com/common/service/CommonCommentServiceTest.java)

## 재현, 원인 및 해결

수정 전 기존 테스트를 JDK 19의 `javac --release 8`로 컴파일하여 441/442행에서 `cannot find symbol: Map.of(String,long,String,long)` 두 건을 재현했다.

프로젝트 compiler source/target은 1.8이지만 테스트 fixture에 Java 9 이후 API인 `Map.of`가 사용되었다. JDK 19에서 source/target만 지정한 컴파일과 Java 8 API 기준 컴파일은 다르므로 API 호환성 검증을 별도로 수행했다.

두 호출을 명시적인 `HashMap<String, Object>` 생성 및 `put`으로 교체했다. `ownerId`, `totalCount`, Long 값, 반환 행 순서, 기존 assertion을 모두 유지했다. 서비스 동작, JDK/POM 설정, SQL, DB 및 API 계약은 변경하지 않았다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| 수정 전 `javac --release 8` | 예상한 `Map.of` 심볼 오류 두 건 재현 |
| 수정 후 동일 컴파일 | 종료 코드 0 |
| `mvn -f backend\pom.xml "-Dtest=CommonCommentServiceTest" test` | BUILD SUCCESS, 21 tests, failures 0, errors 0, skipped 0 |
| `git diff --check` | 통과 |

Java 8 API 기준 컴파일은 기존 `backend\cp.txt`의 의존성과 `backend\target\classes`를 classpath로 사용했다. 실제 JDK 8 런타임에서 테스트를 실행한 것은 아니며, Maven 테스트 실행 JDK는 19.0.1이다. Maven은 테스트 소스 63개를 컴파일하고 해당 클래스 21개 테스트를 실행했다.

테스트 도구는 해당 Java 파일의 테스트를 발견하지 못해 Maven으로 검증했다. Maven에서 기존 의존성 relocation, source 8 bootstrap classpath, 다른 테스트의 deprecated/unchecked 경고가 출력되었으며 본 작업에서 변경하지 않았다.

## 최종 점검

- 기존 owner별 그룹, 댓글 순서, 이전 페이지, cursor, count assertion을 유지했다.
- UI 변경이 없어 스크린샷 및 프론트엔드 검증은 비대상이다.
- 테스트 fixture 생성 문법만 수정하여 DB MCP 확인 및 SQL/스키마 이력 변경은 비대상이다.
- 다른 미커밋 변경을 수정하거나 되돌리지 않았다.
