# 거래처 Schema Maven 빌드 오류 수정

- 사용자 요청: Maven 빌드의 `CustomerInfoSchemaTest` 실패 3건을 해결한다.
- 근거: [분류 선택 사양](../../spec/20261027/20261027_010_master-classification-picker_상세사양서.md).
- 거래처 분류 응답 필드의 누락된 OpenAPI 설명을 보완한다.
- 저장 요청의 전송 여부 추적 필드는 내부 상태로 유지하고 JSON 및 OpenAPI에 노출하지 않는다.
- 저장 동작, 필드 타입, DB 구조, 프론트엔드는 변경하지 않는다.
- 작업 순서: 계획서 → 상세사양서 → 실패 테스트 확인 → 최소 수정 → Maven 검증 → 결과 기록.
- 완료 기준: 기존 Schema 검증 기준을 완화하지 않고 관련 테스트와 Maven 패키징이 성공한다.
