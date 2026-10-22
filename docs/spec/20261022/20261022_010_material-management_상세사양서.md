# 20261022_010 품목관리 상세사양서

## 기준 및 승인

### Java 컴파일 호환성

`backend/pom.xml`의 source/target은 1.8이다. 품목 코드와 테스트는 Java 8 API를 사용한다. 소비기한 허용값 집합은 변경 불가능한 `Collections.unmodifiableSet(new HashSet<>(Arrays.asList(...)))`으로 유지하고, 테스트의 길이 초과 문자열도 Java 8 방식으로 생성한다. 최신 JDK의 source/target만으로는 최신 JDK API 사용을 차단하지 못하므로 실제 소스의 Java 8 API 컴파일 회귀 테스트를 포함한다.

[작업지시서](../../directions/20261022/20261022_010_material-management_작업지시서.md) → [계획서](../../plan/20261022/20261022_010_material-management_계획서.md)를 따른다. 2026-10-22 사용자에게 품목 전용 구현/거래처 UI 패턴/6자리 자동채번/삭제 제외 설계를 제시하고 승인받았다.

## DB 계약

지정 tenant MCP 메타데이터 확인 기준이다. 컬럼은 snake_case, API는 아래 camelCase를 사용한다.

| 필드 | 타입/길이 | 편집 규칙 |
| --- | --- | --- |
| materialId, tenantId | bigint | DB 기본 시퀀스/인증 tenant, 입력 불가 |
| materialCode | varchar(20) | 신규 빈 값이면 eGov 6자리 채번, 수정 필수, tenant 내 유일 |
| materialName | varchar(200) | trim 후 필수 |
| materialEngName, materialModelName, searchItemName | varchar(200) | 선택 |
| materialSpec, materialSpec2, etc, manufactory | varchar(100) | 선택 |
| materialWeight | bigint | 선택 정수, 프론트 안전 정수 범위 |
| unit, materialQuality | varchar(6) | 선택 |
| materialTypeCode | varchar(14) | trim 후 필수, 품목계정코드 |
| customerCode, warehouseCode, drawing | varchar(10) | 선택, 각각 제조사 코드/창고코드/도면번호 |
| safeInvoice | double precision | 선택, 유한 실수, 안전재고 |
| accountingCode | varchar(7) | 선택 |
| partNo | varchar(30) | 선택 |
| matCataType | varchar(10) | 품목분류, 빈 문자열 허용(기존 default) |
| location | varchar(1000) | 선택 |
| itemType | varchar(10) | 선택, 확인되지 않은 옵션을 생성하지 않음 |
| itemBarcode, materialNo, kfdaReportNo | varchar(20) | 선택 |
| materialKind, storeMethod | varchar(50) | MATERIAL_TYPE/STORE_METHOD 공통코드 |
| expiryedStatus | varchar(10) | NONE/DAY/MONTH/YEAR, 신규 NONE |
| expiryedCount | integer | 선택 또는 양의 정수, 2147483647 이하 |
| deleteStatus, deletedAt | varchar(10), timestamp | 클라이언트 저장 제외, 신규 N/null, 삭제기능 제외 |
| createdBy, updatedBy | varchar(10) | 인증 사용자 ID 문자열, 길이 검증 |
| createdAt, updatedAt | timestamp | 서버 설정 |

조회/수정은 `tenant_id` 및 `delete_status = 'N' AND deleted_at IS NULL`로 제한한다. 코드 중복 검사는 삭제 행도 포함한다(기존 unique와 일치). 품목 PK/FK/unique 및 소비기한 CHECK를 유지한다. 숫자 선택값은 빈 입력을 null로 전송하고 0을 보존한다. 음수 중량/안전재고의 임의 금지는 추가하지 않는다(현재 DB 계약에 해당 제한 없음).

중량/소비기한계산숫자의 JSON 역직렬화는 전용 정수 역직렬화기로 소수부와 범위 초과를 거부한다. Jackson 기본 소수점 절삭으로 값이 바뀌지 않도록 한다. 신규 IDS 키의 초기값 `000000`은 발급하지 않고 초기화 SQL 적용을 명시적으로 안내한다.

## 검색 및 화면

- 기본검색: keyword 하나로 코드/명/영문명/모델명/통합검색명을 OR 부분검색한다.
- 상세검색: materialSpec(부분), materialTypeCode(부분), matCataType(부분), customerCode(부분), warehouseCode(부분), itemBarcode(부분), materialKind/storeMethod/expiryedStatus(정확).
- 모든 상세조건과 keyword는 AND로 결합한다. 코드/ID 오름차순으로 현재 필터 전체 목록을 반환한다.
- 목록 주요 필드: No, 코드, 명, 모델, 규격, 단위, 계정코드, 분류, 품목유형, 안전재고, 보관방법, 소비기한기준.
- 모든 업무 필드는 기본정보/규격·분류/재고·위치/기타·소비기한 그룹의 행 폼에 표시한다. ID/tenant/감사/삭제 필드는 입력하지 않는다.
- `PageHeader`, `PageSearchArea`, `PageMessageArea`, F1-Grid와 미저장 확인 다이얼로그를 재사용한다. 삭제/복제 액션은 제공하지 않는다.
- 공통코드 옵션은 해당 tenant의 활성 그룹/항목만 조회한다. 소비기한 기준은 DB CHECK의 네 값만 허용하며 공통코드명이 있으면 표시한다. 옵션에 없는 기존 품목 값은 로딩만으로 바꾸지 않는다.
- 선택형 선택 업무 필드는 빈 값으로 해제할 수 있다. 기존 품목의 비활성/미등록 코드는 코드 자체를 표시해 편집으로 유실하지 않는다. create/update 메뉴 권한은 기존 행과 신규 행의 편집 가능 여부에도 각각 적용한다.
- 로딩 및 오류를 명시하며 저장 중 중복 요청을 막는다. 실패하면 dirty를 보존하고, 성공 후 적용 검색으로 재조회한다.

## API

기존 ResultVO/ResultVoHelper 응답 포맷을 따른다.

| 메서드/경로 | 입력 | 응답 |
| --- | --- | --- |
| GET `/api/v1/co/master/materials` | 위 검색 query | resultList: MaterialInfoVO[] |
| GET `/api/v1/co/master/materials/options` | 없음 | resultList: {groupCode,itemCode,itemName}[] |
| POST `/api/v1/co/master/materials` | 업무 필드 | 201, item: MaterialInfoVO |
| PUT `/api/v1/co/master/materials/{materialId}` | 업무 필드 | 200, item: MaterialInfoVO |
| POST `/api/v1/co/master/materials/save-batch` | materials: {insertedRows,updatedRows,deletedRows} | item: {materials: MaterialInfoVO[]} |

배치 신규 행의 materialId는 로컬 문자열 ID, 수정은 양의 bigint 문자열이다. 삭제 배열은 비어 있어야 한다. 전체 신규/수정을 단일 트랜잭션으로 저장하며 중간 실패 시 전부 롤백한다. 자동채번은 기존 IDS의 `tb_material_info` 키, 6자리/block size 1이며 999999 초과 및 중복 재시도 소진은 입력 오류로 표시한다.

서버는 인증 principal에서 tenant/감사값을 정한다. 등록/수정은 tenant admin만 가능하며 UI는 메뉴 create/update도 함께 확인한다. 기존 프로젝트의 메뉴 API 권한 검사 구조를 유지한다. 일반 입력 오류는 400, 관리자 위반 403, 미존재/다른 tenant/삭제품목 수정은 404다.

## DB 변경 및 검증

- 품목 테이블 DDL 변경 없음. IDS 초기화만 별도 날짜별 SQL로 기록한다. 기존 숫자 1~6자리 품목코드 최댓값 다음 값을 초기값으로 사용하고 기존 높은 카운터를 낮추지 않는다.
- 롤백 시 발급된 코드 재사용을 막기 위해 카운터를 제거하거나 낮추지 않는다. 읽기 전용 MCP로 SQL 적용하지 않는다.
- 프론트/백엔드에서 검색, tenant 격리, 필수값/길이/숫자, 중복 및 채번, 삭제 금지, 배치 원자성, 권한, 오류/dirty 보존을 테스트한다.
- 375/768/1280px 실제 브라우저에서 폼/검색/목록과 페이지 가로 overflow를 확인한다. DB 저장을 직접 검증하지 못하면 결과에 구분한다.
