# 전자결재 테스트 Java 8 호환성 수정 계획서

## 근거 및 목표

사용자가 보고한 `DocumentApprovalServiceImplTest` 92행 컴파일 오류를 해결한다. [목록 조회 배치 처리 작업지시서](../../directions/20261015/20261015_016_목록_조회_배치처리_작업지시서.md)의 피드 응답 및 배치 호출 검증은 유지한다.

## 실행 순서

1. 백엔드 전체 테스트 소스 63개를 `javac --release 8`로 컴파일해 동일 원인의 오류를 확인한다.
2. [상세사양서](../../spec/20261016/20261016_002_approval-test-java8_상세사양서.md)에 세 fixture의 키/값과 검증 범위를 기록한다.
3. [전자결재 테스트](../../../backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java)의 `Map.of` 세 곳을 명시적인 `HashMap` 및 `put`으로 교체한다.
4. 전체 테스트 소스의 Java 8 API 컴파일을 다시 수행한다.
5. `mvn -f backend\pom.xml "-Dtest=CommonCommentServiceTest,DocumentApprovalServiceImplTest" test` 및 `git diff --check`를 실행한다.
6. [결과 폴더](../../result/20261016/approval-test-java8/)에 결과를 기록한다.

## 비범위

운영 코드, SQL, DB/API 계약, JDK/POM 설정 및 다른 미커밋 변경은 수정하지 않는다. UI 변경이 없어 스크린샷은 비대상이다.
