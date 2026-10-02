# 20261002_002 기안양식 코드 유일성 보완 이력

## 변경 정보

- 작성일: 2026-10-02
- 반영 상태: 미반영 SQL 초안
- 대상 DB: S-ERP PostgreSQL `public` 스키마
- 대상 테이블: `tb_drafting_work_category`

## 변경 내용

- `(tenant_id, cata_type_code)` 부분 unique index `uq_drafting_work_category_tenant_cata_type`를 추가한다.
- predicate는 `delete_status IS DISTINCT FROM 'Y'`로, 삭제 처리되지 않은 양식 코드만 테넌트 내에서 유일하게 유지한다. `use_at = 'N'` 비활성 행은 코드를 계속 점유한다.
- 마이그레이션은 중복 선검사를 실행하며 중복이 있으면 오류로 중단한다. 데이터를 자동 수정하거나 삭제하지 않는다.
- 기안양식 INSERT Mapper는 같은 conflict target에서 `DO NOTHING RETURNING`을 수행한다. 경합 요청에서 반환 ID가 없으면 기존 입력값 오류(HTTP 400)로 응답한다.

## 영향 및 검증 근거

- DB MCP에서 `tb_drafting_work_category` 컬럼 및 기존 인덱스를 확인했다. 같은 테넌트 양식 코드의 unique index는 없었다.
- 읽기 전용 집계에서 `delete_status IS DISTINCT FROM 'Y'` 범위의 중복 그룹은 0건이었다.
- 적용 대상 DB가 다를 수 있으므로 실제 반영 전 중복 여부를 다시 확인해야 한다.

## 롤백

- 대응 스크립트: `20261002_002_drafting_work_code_unique_rollback.sql`
- 롤백은 추가한 unique index만 제거하고 테이블/업무 데이터는 변경하지 않는다.
- 롤백 SQL은 운영 반영 및 사용자 데이터 상황을 확인하고 승인된 경우에만 실행한다.