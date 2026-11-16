# 20261116_003 페이지 선택값 공통코드 Seed 이력

- 날짜: 2026-11-16
- 영향 테이블: `public.tb_common_code_group`, `public.tb_common_code_item`
- 영향 범위: 실행자가 명시한 단일 테넌트의 없는 그룹·상세만 INSERT. DDL/기존값/업무 데이터 변경 없음.
- 기본: `ITEM_PARTNER_TRADE_TYPE` 2항목, `SALES_DELIVERY_TYPE` 2항목.
- 선택: `WORK_STANDARD_VERSION_STATUS` 3항목, `WORK_STANDARD_SHELF_LIFE_BASE` 2항목. 백엔드 미구현 화면이므로 별도 검토 후 실행.
- 미포함: 기존 14개 공통코드 그룹, 업무 상태·권한/처리 enum, 검색 전용 값, 동적 마스터. 창고 사업장 값은 ID 의미 확정 전 보류.

## 실행

psql UTF-8 스크립트이다. 실행자가 승인된 DB 연결 옵션과 `$targetTenantId`를 지정한다. 실 ID·연결정보를 파일에 저장하지 않는다.

```powershell
psql -X -v ON_ERROR_STOP=1 -v "target_tenant_id=$targetTenantId" -f .\20261116_003_seed_page_common_codes.sql
# 선택 사항 (기본 Seed에 의해 자동 실행되지 않음):
psql -X -v ON_ERROR_STOP=1 -v "target_tenant_id=$targetTenantId" -f .\20261116_003_seed_work_standard_codes_optional.sql
```

- 없는 테넌트, 미지정 변수, 비활성/부모가 있는 기존 대상 그룹은 실패한다.
- 기존 그룹/항목은 ON CONFLICT DO NOTHING으로 보존한다. 기존 비활성 항목도 활성화하지 않는다.
- 고정 도메인 목록의 등록이며 새 코드 추가만으로 서버 기능을 확장하지 않는다.
- 그룹·항목에 `page-select-seed:20261116-003` 설명 표식을 남긴다.
- 한 번의 트랜잭션으로 처리하며 코드 테이블 쓰기를 잠근다. 관리용 유지보수 시간에 실행한다.
- 현재 페이지 조회 로직을 변경하지 않았다. 화면 연결은 별도 작업이다.

## 롤백

```powershell
psql -X -v ON_ERROR_STOP=1 -v "target_tenant_id=$targetTenantId" -f .\20261116_003_rollback_page_common_codes.sql
```

- 기본/선택 Seed를 함께 대상으로 한다.
- 표식과 원본 이름·순서·활성·부모·감사 필드가 유지된 소유 행만 제거한다.
- 다른 항목의 부모로 참조되는 항목, 자식 그룹/남은 항목이 있는 그룹은 남긴다. 수정된 행, 기존 데이터, 다른 테넌트는 보존한다.
- 기타 FK 참조가 있다면 전체 트랜잭션이 실패한다. 무시하고 강제 삭제하지 않는다.
- **업무 사용 전 복구용**이다. 문자열 코드 사용처는 FK로 탐지할 수 없으므로 화면 연동/업무 사용 이후에는 별도 영향 분석 없이 실행하지 않는다.
- 완전 원복이 아닌 보존형 롤백이다. 보존된 행은 별도 검토 대상이며, 원본 정의가 바뀐 행을 덮어쓰거나 강제 삭제하지 않는다.

## MCP 근거

기본 서버에서 `list_tables` → 그룹/상세 `describe_table` → 컬럼 길이와 제안 그룹 `EXISTS`, `pg_constraint` 메타데이터를 조회했다. 현재 PK 시퀀스 기본값, NULL 허용, 코드 50자/이름 200자/설명 500자, UNIQUE `(tenant_id, group_code)`/`(group_id, item_code)`, 부모·그룹 RESTRICT FK 계약을 확인했다. 제안한 그룹명의 기존 유무는 연결 DB 전체의 존재 여부일 뿐 대상 테넌트 보급 상태를 보증하지 않는다. 테넌트 데이터 행·인증정보는 수집하지 않았다.

테이블 제약/FK의 테스트 기준은 저장소 원본 `20260911_003_create_common_code_schema.sql`이다. MCP 메타데이터 확인과 격리 재현은 서로 구분하며, 실제 운영 적용은 하지 않았다.

## 검증

로컬 PostgreSQL 18의 새 임시 클러스터/전용 포트에서 합성 테넌트와 원본 공통코드 DDL로 실행했다. 기존 서버·운영 DB·연결 파일을 사용하지 않았다.

```powershell
# 새로 만든 일회용 test_page_common_codes DB에서만 실행:
psql -X -v ON_ERROR_STOP=1 -d test_page_common_codes -f .\20261116_003_verify_page_common_codes.sql
```

검증 SQL은 DB 이름을 검사하고 기존 테이블이 있으면 실패한다. 운영 DB에서 실행하면 안 된다.

- Seed 부재로 실패하는 것을 먼저 확인한 뒤 구현했다.
- 기본/선택 항목 수·값·라벨·순서, 기본에서 선택 그룹 제외, 재실행 중복 방지, 기존 이름·비활성값 보존을 확인했다.
- 다른 테넌트 불변, 수정/부모참조 행 보존, 미변경 Seed 전체 롤백, 롤백 후 재적용을 확인했다.
- 별도 psql 세션으로 변수 미지정, 없는 테넌트, 비활성 기존 그룹을 거부하고 부분 데이터가 남지 않는 것을 확인했다.
- 기본 스크립트 없이 선택 스크립트만 실행해 5항목이 등록되는 것을 확인했다.
- 기타 업무 FK가 Seed 상세를 참조하면 롤백이 실패하고 부분 삭제가 남지 않는 것을 확인했다.
- 두 DB 폴더의 5개 파일 해시 동일 및 `git diff --check` 통과를 확인했다.
- 테스트 클러스터는 `pg_ctl -m fast -w stop`으로 종료하고 전용 포트 해제를 확인했다.
- UI/Java/스키마 DDL은 변경하지 않아 프론트·백엔드 빌드, 브라우저 캡처 및 `db-schema.md` 구조 갱신은 해당하지 않는다.
