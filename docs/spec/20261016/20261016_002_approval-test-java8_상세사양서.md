# 전자결재 테스트 Java 8 호환성 상세사양서

- [계획서](../../plan/20261016/20261016_002_approval-test-java8_계획서.md)
- [기존 피드 사양](../20261015/20261015_016_목록_조회_배치처리_상세사양서.md)

## 수정

`feedListHydratesDocumentWithoutRecordingView`에 Java 8에서 제공하지 않는 `Map.of`가 세 곳 남아 있다. 명시적인 타입의 `HashMap`과 `put`을 사용한다.

1. `Map<Long, List<CommonFileVO>> attachmentsByOwnerId`: `77L`은 기존 attachment 단일 목록, `78L`은 기존 빈 목록을 유지한다.
2. `Map<String, Object> firstOwnerCount`: `ownerId=77L`, `totalCount=4L`.
3. `Map<String, Object> secondOwnerCount`: `ownerId=78L`, `totalCount=1L`.

두 카운트 행은 기존 순서의 `Arrays.asList`로 반환한다. 기존 assertion과 Mockito 검증은 모두 유지하며, helper나 의존성을 추가하지 않는다.

## 검증

- 수정 전 전체 테스트 소스의 Java 8 API 컴파일에서 해당 세 호출의 심볼 오류를 재현한다.
- 수정 후 63개 테스트 소스가 `javac --release 8`로 컴파일된다.
- 공통 댓글 및 전자결재 서비스 테스트 클래스를 함께 실행해 댓글/첨부 매핑, 페이지 메타데이터 및 배치 호출 검증을 유지한다.
- `git diff --check`를 통과한다.

DB/SQL/API 계약을 구현하거나 수정하지 않는 테스트 문법 수정이므로 DB MCP 및 스키마 스크립트는 비대상이다. 화면 변경이 없어 스크린샷은 비대상이다.
