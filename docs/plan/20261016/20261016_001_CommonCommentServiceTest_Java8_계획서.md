# CommonCommentServiceTest Java 8 호환성 수정 계획서

**목표:** Java 8 API 기준에서 공통 댓글 테스트가 컴파일되도록 한다.

**근거:** 사용자가 보고한 441행 `Map.of` 컴파일 오류 및 [목록 조회 배치 처리 작업지시서](../../directions/20261015/20261015_016_목록_조회_배치처리_작업지시서.md).

**구조:** 서비스와 DB/API 계약은 변경하지 않는다. 테스트의 두 카운트 행을 명시적인 `HashMap<String, Object>`와 `put`으로 구성한다.

**기술:** Java, Maven, JUnit 5, AssertJ.

## 실행 순서

1. 기존 테스트를 `javac --release 8`로 컴파일해 오류를 재현한다.
2. [상세사양서](../../spec/20261016/20261016_001_CommonCommentServiceTest_Java8_상세사양서.md)를 작성한다.
3. [테스트](../../../backend/src/test/java/egovframework/com/common/service/CommonCommentServiceTest.java)의 두 `Map.of` 호출만 `HashMap` 생성 및 `put`으로 교체한다. 기존 키, Long 값, 행 순서, 검증문은 유지한다.
4. 동일한 Java 8 API 기준 컴파일과 `mvn -f backend\pom.xml "-Dtest=CommonCommentServiceTest" test`를 실행한다.
5. `git diff --check`를 실행하고 [결과 폴더](../../result/20261016/common-comment-java8-compatibility/)에 재현 원인 및 검증 결과를 기록한다.

## 비범위

- JDK/POM 설정, 운영 코드, Mapper, DB 스키마 및 API 계약 변경.
- 프론트엔드 및 기존 미커밋 변경 수정.
- UI 변경이 없어 브라우저 스크린샷은 비대상이다.
