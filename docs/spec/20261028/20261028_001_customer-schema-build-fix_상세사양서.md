# 거래처 Schema 빌드 오류 수정 상세사양

## 근거

- [계획서](../../plan/20261028/20261028_001_customer-schema-build-fix_계획서.md)
- [기존 분류 선택 사양](../20261027/20261027_010_master-classification-picker_상세사양서.md)

## 변경 계약

| 모델 | 필드 | 설명 | OpenAPI 노출 |
|---|---|---|---|
| CustomerInfoVO | businessKind1 | 거래처 대분류 ID | 유지 |
| CustomerInfoVO | businessKind2 | 거래처 소분류 ID | 유지 |
| CustomerInfoVO | businessKind1Name | 거래처 대분류명 | 유지 |
| CustomerInfoVO | businessKind2Name | 거래처 소분류명 | 유지 |
| CustomerInfoSaveRequestVO | businessKind1Provided | 거래처 대분류 ID 전송 여부. 서버 내부 상태 | 숨김 |
| CustomerInfoSaveRequestVO | businessKind2Provided | 거래처 소분류 ID 전송 여부. 서버 내부 상태 | 숨김 |

- 내부 플래그의 `@JsonIgnore`와 setter의 전송 여부 기록 로직을 변경하지 않는다.
- 분류 ID 미전송 시 기존 값 유지, 명시적 null은 해제라는 기존 저장 계약을 유지한다.
- `CustomerInfoChangeVO`의 상속 필드에도 같은 계약을 적용한다.
- 타입, DB 컬럼, Mapper, API 경로, 화면 동작은 변경하지 않는다. SQL/롤백 스크립트는 필요하지 않다.

## 검증

- 기존 모든 모델/상속 필드 설명 검증을 그대로 통과해야 한다.
- 생성 OpenAPI의 거래처 응답 분류 4필드는 비어 있지 않은 설명을 가진다.
- 생성 OpenAPI의 저장 요청과 변경 요청에는 분류 ID가 존재하고 내부 플래그는 없다.
- 관련 거래처 테스트 및 `mvn -B package`가 성공해야 한다.
- 백엔드 메타데이터 수정으로 화면 변경이 없어 UI 스크린샷 검증은 적용 대상이 아니다.
