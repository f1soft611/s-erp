# 쪽지 이모지 JSON 응답 오류 수정 결과

근거: [지시서](../../../directions/20261102/20261102_010_쪽지_이모지_응답오류_작업지시서.md), [계획서](../../../plan/20261102/20261102_010_쪽지_이모지_응답오류_계획서.md), [사양서](../../../spec/20261102/20261102_010_쪽지_이모지_응답오류_상세사양서.md).

## 원인 및 해결

- 실제 MVC converter의 UTF-8 바이트 응답에서 사용자 로그와 동일한 `latestContent` 경로의 `Unmatched first part of surrogate pair (0xd83d)`를 재현했다.
- 원인은 DB 문자셋이 아니라 공통 `HtmlCharacterEscapes`다. Jackson이 Unicode 문자의 UTF-16 단위를 확인할 때 모든 문자를 개별 SerializedString으로 반환해 이모지의 surrogate pair를 분리했다.
- 별도 escape가 없는 문자에 null을 반환해 Jackson 기본 Unicode 인코딩을 사용하도록 수정했다. 기존 ASCII JSON escape 설정을 그대로 유지하며 HTML escape 정책을 새로 추가하지 않았다.
- supplementary emoji, 피부색 modifier, ZWJ 조합, 한글, 따옴표, 개행 및 `<>&`의 JSON 왕복 보존을 검증했다. 이모지를 삭제하거나 본문을 수정하지 않는다.
- 추가로 쪽지 알림 미리보기의 497 UTF-16 units 절단이 emoji 중간을 자르는 경우를 재현했다. 해당 경계만 한 칸 앞당겨 surrogate pair를 보존하며 기존 제한과 줄임표를 유지했다.

## 검증 및 배포

- converter 오류와 알림 미리보기 경계 회귀 각각 수정 전 실패, 수정 후 통과를 확인했다.
- `HtmlCharacterEscapesTest`, `DirectMessageServiceImplTest`, `DirectMessageMapperXmlTest`, `NotificationServiceImplTest`, `Java8SearchCompatibilityTest`: **39개 통과**, 실패/오류/skip 없음.
- `mvn -q -DskipTests package` 통과. `backend/target/s-erp-backend.war`를 다시 생성했다.
- `git diff --check` 공백 오류 없음. 공통 converter 수정은 응답 처리에 적용되며 프런트 변경이나 스크린샷은 해당하지 않는다.
- 새 WAR 재배포 뒤 기존 이모지 쪽지 목록 조회와 이모지 신규 발송·답장을 확인해야 한다. 운영 재배포 자체는 이 세션에서 수행하지 않았다.

## DB 및 범위

- 기본 읽기 전용 MCP `list_tables` → `describe_table(tb_notification)`을 직접 호출해 summary 문자열 컬럼을 확인했다. 데이터 행·계정·자격 증명 조회 없이 metadata만 확인했다.
- SQL/스키마/API 구조/권한 변경은 없으며 migration/rollback 스크립트는 필요하지 않다. 기존 데이터의 임의 수정은 하지 않았다.
- 공통 JSON serializer 문제가 원인이므로 다른 화면의 정상 이모지 응답에도 같은 수정이 적용된다. 별도의 이모티콘 선택 UI를 추가한 작업은 아니다.
