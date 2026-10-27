# 품목·거래처 분류 스키마 설계

## 상태

사용자가 2026-10-27 제안 모델을 승인했다. 날짜별 작업지시서·계획서·상세사양서와 guarded DDL/rollback 초안이 작성되었으며 central DB에는 적용하지 않았다. 백엔드 API와 화면 구현은 포함하지 않는다.

## 배경 및 근거

전달된 `smart_haccp_schema_2.sql`은 품목분류를 대/중/소 3단계, 거래처분류를 대/소 2단계 자기참조 테이블로 정의한다. 하지만 마스터 테이블 이름 및 분류 컬럼은 현재 S-ERP와 다르므로 원본 SQL을 그대로 실행할 수 없다.

기본 `s-erp-postgresql-readonly` MCP로 `public` 스키마를 확인했다.

- 현재 마스터는 `tb_material_info`와 `tb_customer_info`다. 분류 테이블은 아직 없다.
- `tb_material_info`에는 `mat_cata_type`이 `VARCHAR`로 존재하지만 `item_cls_id`는 없다.
- `tb_customer_info.business_kind1/2/3`는 nullable `VARCHAR`, 기본값 없음이다. 업무값을 노출하지 않는 집계 결과에서 `business_kind1/2` 비공백 값은 0건이었다.
- tenant 전용 DB MCP는 central DB와 별도 스키마를 가진다. 이번 DDL 초안은 `.mcp.json`의 기본 `s-erp-postgresql-readonly` central DB를 기준으로 하며 tenant DB의 미존재 컬럼을 central 계약에 일반화하지 않는다.
- 사용자 요청은 분류 테이블에 tenant 범위 및 분류 ID를 두고, 거래처 분류는 기존 `business_kind1/2`를 쓰며, 품목에는 새 분류 ID 컬럼을 추가하는 것이다.

## 목표

1. 품목 및 거래처 분류를 tenant별 데이터로 분리하고, S-ERP의 surrogate `BIGINT` ID 및 audit 컬럼 규칙을 사용한다.
2. 품목 마스터에 분류를 참조할 새 nullable ID 컬럼을 추가한다.
3. central DB 거래처의 기존 `business_kind1/2`를 분류 ID 저장 컬럼으로 전환한다.
4. tenant 경계를 복합 외래 키로 보호하고, 안전한 migration 및 롤백 문서를 정의한다.
5. 기존 품목분류 문자열과 거래처의 기타 분류(`business_kind3`)는 보존하며 자동 데이터 변환을 하지 않는다.

## 제안 데이터 모델

### 분류 테이블

원본의 도메인 테이블 이름 `tb_cls_item`, `tb_cls_partner`는 유지하고, 코드 문자열 PK를 S-ERP 스타일 내부 ID로 변경한다. 별도 사람이 입력하는 분류 코드는 두지 않는다. ID는 DB가 생성하며, 사용자 화면에는 이름과 계층 경로를 표시한다.

| 항목 | `tb_cls_item` | `tb_cls_partner` |
| --- | --- | --- |
| 내부 PK | `item_cls_id BIGSERIAL` | `partner_cls_id BIGSERIAL` |
| tenant 범위 | `tenant_id BIGINT NOT NULL` | `tenant_id BIGINT NOT NULL` |
| 표시 이름 | `item_cls_nm VARCHAR(50) NOT NULL` | `partner_cls_nm VARCHAR(50) NOT NULL` |
| 계층 수준 | 1 대, 2 중, 3 소 | 1 대, 2 소 |
| 자기참조 부모 | `upper_item_cls_id BIGINT NULL` | `upper_partner_cls_id BIGINT NULL` |
| 정렬 | `sort_seq INT NOT NULL DEFAULT 0` | 동일 |
| 사용 여부 | `use_at CHAR(1) NOT NULL DEFAULT 'Y'` | 동일 |
| 감사 컬럼 | `created_by VARCHAR(10)`, `created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`, `updated_by VARCHAR(10)`, `updated_at TIMESTAMP NULL` | 동일 |

필수 제약:

- 단일 PK는 분류 ID이고, `(분류 ID, tenant_id)` 유니크 키는 tenant 복합 FK 대상이다.
- `tenant_id`는 `tb_tenant(tenant_id)`를 참조한다.
- 부모 FK는 `(upper_*_cls_id, tenant_id)`에서 `(분류 ID, tenant_id)`로 연결해 다른 tenant의 부모를 막는다.
- 분류 레벨 범위 및 `use_at IN ('Y','N')`를 CHECK로 제한한다.
- tenant/부모/정렬순서 기준의 조회 인덱스를 둔다.
- `(partner_cls_id, upper_partner_cls_id, tenant_id)` 유니크 키를 두어 거래처 마스터의 `(business_kind2, business_kind1, tenant_id)` 복합 FK가 소분류와 지정 대분류의 직접 부모 관계를 보장하게 한다.
- 품목 소분류 레벨, 각 분류의 부모-자식 레벨 연속성 및 순환 참조는 분류 저장 API가 검증한다. DB CHECK만으로 다른 행의 레벨 및 조상 관계를 검사하지 않는다.

### 품목 마스터 연결

- `tb_material_info.item_cls_id BIGINT NULL`을 추가한다.
- `(item_cls_id, tenant_id)`가 `(tb_cls_item.item_cls_id, tenant_id)`를 참조하도록 복합 FK를 둔다.
- 품목에 지정되는 분류가 소분류인지 API에서 검증한다.
- 기존 `mat_cata_type VARCHAR(10) NOT NULL DEFAULT ''`는 삭제·변경하지 않고 자동 매핑하지 않는다. 기존 값의 의미 및 이관은 별도 데이터 조사와 승인 후 별도 작업으로 한다.

### 거래처 마스터 연결

- central DB의 `tb_customer_info.business_kind1/2`를 각각 대분류 ID/소분류 ID로 사용하고, 타입을 `BIGINT NULL`로 변경한다.
- 타입 변경 시 NULL 및 공백만 NULL로 정리한다. 비어 있지 않은 값이 있으면 임의 cast하거나 데이터를 잃지 않고 migration을 명시적으로 중단한다.
- `business_kind1`은 `(분류 ID, tenant_id)` 복합 FK로 같은 tenant의 분류를 참조한다.
- `business_kind2`는 `(소분류 ID, business_kind1, tenant_id)` 복합 FK로 지정한 대분류의 직접 자식임을 DB가 보장한다.
- `business_kind2`가 설정되면 `business_kind1`도 필수로 한다. 복합 FK가 직접 부모 관계를 DB에서 보장하고 API는 레벨/활성 상태를 검증한다.
- `business_kind3`는 현재 업무 의미가 확인되지 않았으므로 유지하고 변경하지 않는다.
- 신규 선택은 대분류/소분류 레벨과 활성 상태를 API가 검증한다. 이미 저장된 연결값의 표시/비활성 처리 정책은 구현 사양서에 명시한다.

## 변경 및 롤백 안전성

- 전달 파일 전체를 실행하지 않는다. 이 파일은 기존 테이블에 `DROP TABLE ... CASCADE`를 수행하므로 운영 데이터를 삭제할 수 있다.
- 실제 변경은 날짜별 migration DDL로 작성한다. `IF NOT EXISTS`로 스키마 차이를 숨기지 않고, 예상한 기존 테이블/컬럼/제약이 다르면 중단한다.
- central MCP에서 `business_kind1/2` 비공백 값은 조회 시점에 0건이지만, migration 실행 전 데이터가 바뀔 수 있으므로 SQL 자체에 변환 전 guard를 둔다.
- 컬럼 타입 변경 및 분류 FK가 적용된 이후에는 분류 데이터가 생길 수 있으므로 롤백은 데이터가 비어 있고 FK 의존이 없을 때만 허용한다. 기존 거래처 값이 복구 불가능한 타입/형식이면 rollback을 중단한다.
- 동일 날짜 및 작업 번호로 `docs/database`와 `backend/DATABASE`에 DDL, 변경 이력, 롤백을 관리하고 `docs/database/db-schema.md`를 함께 갱신한다.
- MCP는 읽기 전용 증거다. 실제 central DB에 DDL을 적용하지 않는다.

## 대안과 선택 이유

1. `business_kind1/2 VARCHAR`를 유지해 문자열 코드로 관계: 컬럼 변환은 피하지만 DB의 ID/FK/tenant 정합성을 약하게 만든다.
2. 거래처에 분류 ID 전용 컬럼을 새로 추가하고 기존 필드를 남김: 의미는 명확하지만 사용자가 지정한 기존 컬럼 재사용 요구와 다르다.
3. **선택안:** 현재 비어 있는 central DB `business_kind1/2`를 BIGINT 분류 ID로 전환한다. 기존 컬럼을 활용하면서 tenant 복합 FK를 적용할 수 있다. migration guard와 롤백 한계를 문서화한다.

## 범위 제외

- 분류 CRUD API 및 권한 구성
- 품목/거래처 화면의 분류 편집기, 선택 UI, 검색 및 표시
- `mat_cata_type` 또는 `business_kind3`의 데이터 이관
- tenant 전용 DB의 컬럼 변경이나 동기화
- 중앙 DB에 대한 DDL 실행

## 검증 기준

- MCP로 central DB의 관련 테이블/컬럼 및 FK가 참조할 키를 다시 확인한다.
- DDL 초안에 분류 간 tenant 경계, 자기참조, 레벨/use CHECK, 마스터 복합 FK 및 인덱스가 포함되는지 검토한다.
- migration guard가 비어 있지 않은 `business_kind1/2` 값에 대해 안전하게 중단하고, NULL/공백 상태를 무손실로 변환하는지 확인한다.
- rollback은 데이터/FK 의존이 있을 때 안전하게 중단하고, 빈 신규 분류 구조에 대해서만 역순으로 수행한다.
- DDL의 transaction, precondition guard, composite FK 및 rollback 조건을 정적 검토했다. 실제 PostgreSQL 실행이나 DB 적용은 하지 않았다.

## 다음 단계

분류 CRUD API 및 관리 UI는 별도 작업지시서와 계약으로 구현한다. 실제 DB 적용은 DDL 검토/승인과 배포 절차가 별도로 완료되기 전까지 수행하지 않는다.
