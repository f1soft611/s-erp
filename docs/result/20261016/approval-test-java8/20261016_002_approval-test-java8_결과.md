# 전자결재 테스트 Java 8 호환성 수정 결과

## 근거

- [계획서](../../../plan/20261016/20261016_002_approval-test-java8_계획서.md)
- [상세사양서](../../../spec/20261016/20261016_002_approval-test-java8_상세사양서.md)
- [수정 테스트](../../../../backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java)

## 원인 및 해결

Java 8에 없는 `Map.of`가 첨부파일 fixture 한 곳, 댓글 수 fixture 두 곳에 남아 있었다. 전체 백엔드 테스트 소스 63개를 `javac --release 8`로 컴파일하여 해당 세 곳의 심볼 오류를 확인했다.

세 fixture를 명시적인 타입의 `HashMap` 및 `put`으로 교체했다. 키/값, 빈 첨부 목록, 댓글 수 행 순서, 기존 assertion과 Mockito 검증은 유지했다. 운영 코드, DB/API 계약, JDK/POM은 변경하지 않았다.

## 검증

| 항목 | 결과 |
| --- | --- |
| 수정 전 Java 8 API 기준 전체 테스트 소스 컴파일 | 해당 파일의 `Map.of` 오류 3건 재현 |
| 수정 후 같은 컴파일 | 전체 63개 테스트 소스 통과 |
| `CommonCommentServiceTest` | 21 tests, failures 0, errors 0, skipped 0 |
| `DocumentApprovalServiceImplTest` | 48 tests, failures 0, errors 0, skipped 0 |
| Maven 합계 | BUILD SUCCESS, 69 tests, failures 0, errors 0, skipped 0 |
| `git diff --check` | 통과 |

실행 명령: `mvn -f backend\pom.xml "-Dtest=CommonCommentServiceTest,DocumentApprovalServiceImplTest" test`.

Java 8 API 검증은 JDK 19의 `javac --release 8`에서 기존 의존성 classpath와 운영 클래스 산출물을 사용했다. 처음 전체 경로를 명령 인자로 전달할 때 Windows 명령 길이 제한으로 실행되지 않아, javac 인자 파일 방식으로 재현 및 검증했다. 실제 JDK 8 런타임 테스트를 수행한 것은 아니다.

전체 테스트에서 Java 9 이상 컬렉션 팩토리(`Map/List/Set.of`, `Map.ofEntries`, `Map.entry`, `copyOf`) 사용도 검색했다. 확인된 잔여 호출은 수정한 세 곳이었다. 기존 deprecated/unchecked, source 8 bootstrap 및 의존성 relocation 경고는 변경하지 않았다.

## 비대상

화면 변경이 없어 스크린샷과 프론트엔드 검증은 비대상이다. 테스트 fixture 생성 문법만 변경하여 DB MCP와 SQL/스키마 이력 변경도 비대상이다. 기존 미커밋 변경은 보존했다.
