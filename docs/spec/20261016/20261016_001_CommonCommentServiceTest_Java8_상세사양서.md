# CommonCommentServiceTest Java 8 호환성 상세사양서

## 근거

- [계획서](../../plan/20261016/20261016_001_CommonCommentServiceTest_Java8_계획서.md)
- [기존 배치 처리 사양서](../20261015/20261015_016_목록_조회_배치처리_상세사양서.md)

## 원인 및 수정 범위

[POM](../../../backend/pom.xml)의 compiler source/target은 1.8이다. `Map.of`는 Java 9에서 추가되어 Java 8 API에서는 존재하지 않는다. 높은 JDK에서 source/target만 지정하면 해당 API 사용을 잡아내지 못할 수 있다.

`listCommentPagesByOwnerIdsGroupsRootsAndBuildsPreviousPageMetadata`의 stub 응답만 수정한다. `HashMap`을 import하고 아래 두 `Map<String, Object>`를 생성해 기존 순서로 `Arrays.asList`에 전달한다.

| 행 | ownerId | totalCount |
| --- | --- | --- |
| 첫 번째 | `10L` | `4L` |
| 두 번째 | `20L` | `1L` |

각 Map은 `new HashMap<>()` 및 `put("ownerId", ...)`, `put("totalCount", ...)`으로 작성한다. 익명 이중 중괄호 초기화나 타입 캐스팅은 사용하지 않는다. 기존 assertion은 모두 유지한다.

## 검증 및 완료 기준

1. 수정 전 `javac --release 8`에서 두 `Map.of` 호출의 cannot find symbol 오류가 재현된다.
2. 수정 후 같은 컴파일이 성공한다.
3. `CommonCommentServiceTest` 전체가 Maven에서 통과한다.
4. owner별 그룹, 댓글 순서, 이전 페이지 여부, cursor 및 count의 기존 assertion이 유지된다.
5. `git diff --check`가 통과한다.

운영 SQL, DB 및 API 계약을 구현하거나 수정하지 않는 테스트 생성 문법 변경이므로 DB MCP 조회와 스키마 스크립트는 비대상이다. 화면 변경이 없어 스크린샷도 비대상이다.
