# 거래처 Schema Maven 빌드 오류 수정 결과

## 근거

- [작업지시서](../../../directions/20261028/20261028_001_customer-schema-build-fix_작업지시서.md)
- [계획서](../../../plan/20261028/20261028_001_customer-schema-build-fix_계획서.md)
- [상세사양서](../../../spec/20261028/20261028_001_customer-schema-build-fix_상세사양서.md)

## 재현 및 원인

- 수정 전 `CustomerInfoSchemaTest` 9건 실행에서 사용자 보고와 동일한 실패 3건을 재현했다.
- 분류 기능 추가 시 `CustomerInfoVO.businessKind1/2`, `businessKind1Name/2Name` 및 저장 요청 내부 플래그 `businessKind1Provided/2Provided`의 `@Schema`가 누락되었다.
- 전체 필드를 검사하는 테스트는 첫 누락에서 중단하며, `CustomerInfoChangeVO`도 저장 요청을 상속하므로 내부 플래그 누락이 두 모델에서 보고되었다.
- 생성 OpenAPI를 직접 검사하는 회귀 테스트 추가 후 설명 누락에 따른 실패도 확인했다.

## 수정 내용

- 거래처 응답의 분류 ID/표시명 4필드에 설명을 추가했다.
- 내부 플래그 2필드에 설명과 `hidden = true`를 추가했다. `@JsonIgnore`와 전송 여부 추적 로직은 유지했다.
- 기존 전체 모델/상속 필드 설명 검증을 완화하지 않았다.
- 생성 OpenAPI의 응답 분류 설명과 저장/상속 요청의 내부 플래그 비노출을 회귀 검증한다.
- 화면, 저장 로직, DB 구조 및 Mapper는 변경하지 않았다.

## 검증 결과

`backend`에서 실행했다. PowerShell에서는 Maven `-D` 인자를 따옴표로 감쌌다.

| 명령 | 결과 |
|---|---|
| `mvn -B "-Dstyle.color=never" "-Dtest=CustomerInfoSchemaTest,CustomerInfoServiceImplTest,CustomerInfoBatchServiceImplTest,CustomerInfoApiControllerTest" test` | 57건, 실패/오류/건너뜀 0 |
| `mvn -B "-Dstyle.color=never" package` | 608건, 실패 0, 오류 0, 기존 건너뜀 2; BUILD SUCCESS |
| `git diff --check` | 통과 |

- 회귀 테스트 1건 추가로 전체 테스트 수는 기존 607건에서 608건이 되었다.
- `backend/target/s-erp-backend.war` 패키징 성공을 확인했다.
- 기존 MySQL 드라이버 좌표 이전 경고 등은 수정 범위에 포함하지 않았다.
- 프론트엔드와 UI 변경이 없어 프론트엔드 검증 및 화면 스크린샷은 적용 대상이 아니다.

## DB MCP 및 변경 관리

- 기본 workspace `s-erp-postgresql-readonly`의 `list_tables` → `describe_table(tb_customer_info)`를 직접 호출했다.
- `business_kind1`, `business_kind2`가 nullable bigint인 메타데이터를 확인했다. 데이터 행과 자격 증명은 조회하지 않았다.
- 분류명 응답은 기존 `CustomerInfo_SQL_postgresql.xml`의 분류 조회 및 도메인 필드와 대조했다.
- DDL, 데이터 변경, API 필드 타입 변경이 없으므로 SQL/롤백/누적 스키마 갱신은 필요하지 않다.

## 최종 확인

- [x] 작업지시서 → 계획서 → 상세사양서 → 구현 → 결과 문서 순서 준수
- [x] 원본 실패 및 회귀 테스트 실패 확인 후 최소 수정
- [x] 관련 테스트 및 전체 Maven 패키징 성공
- [x] 내부 플래그 비노출 및 기존 저장 동작 보존
- [x] DB MCP 메타데이터 확인, DB 변경 없음
- [x] 화면 변경 없음에 따른 스크린샷 비대상 명시
- [x] 자동 커밋 없음
