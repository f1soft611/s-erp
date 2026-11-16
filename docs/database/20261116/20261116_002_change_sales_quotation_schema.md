# 견적서 스키마 변경 이력

- 변경 일자: 2026-11-16
- 변경 내용: 테넌트별 견적 헤더·상세 저장 구조와 견적관리 메뉴 seed를 추가한다. 품목 마스터 참조는 선택 사항이며, 직접 입력한 품목은 견적 상세 스냅샷으로 저장한다.
- 적용 대상 테이블: `tb_sales_quotation_hd`, `tb_sales_quotation_dt`, `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission`
- 영향 범위: 견적 등록·조회·수정·현황 API, 견적 화면, 승인된 테넌트의 메뉴 트리 및 기존 수주 메뉴 기준 역할 권한 연결. 기존 수주 헤더의 `quot_no` 및 수주 데이터 구조는 변경하지 않는다.
- 롤백 여부: 견적 테이블 롤백은 견적 데이터 제거 전 백업·보존 검토가 필요하다. 메뉴 롤백은 메뉴·권한 행을 삭제하지 않고 지정 테넌트의 견적 메뉴 세 건을 비활성화한다. 견적 메뉴 코드가 seed 적용 전부터 존재했다면 해당 롤백을 실행하지 않는다.
- 적용 상태: 본 작업에서는 DDL/seed를 실제 데이터베이스에 적용하지 않았다. 메뉴 seed 실행 전 `v_tenant_id`에 승인된 대상 테넌트 ID를 지정해야 한다.

## 계약 확인 근거

- 설계 시점 MCP 조회에서는 견적 테이블이 없음을 확인했다. 메뉴 seed 확장 검토 시점의 `list_tables`에서는 `tb_sales_quotation_hd`, `tb_sales_quotation_dt`가 보였으나 이 작업에서 DDL을 적용하지 않았으므로 반영 주체·시점은 확인하지 않았다.
- `describe_table`로 수주·품목·거래처·ID 시퀀스와 `tb_menu`, `tb_module`, `tb_menu_permission`, `tb_permission`, `tb_role`, `tb_role_menu_permission`의 메타데이터를 확인했다. 수주에는 nullable `quot_no`가 있고, 수주 상세의 품목 ID는 필수이므로 견적 상세에서는 직접 입력 경로를 위해 nullable로 설계한다.
- 테넌트·업무 데이터 행은 조회하지 않았다. 기존 수주·품목 테이블의 tenant 복합 FK 패턴은 `docs/database/20261026/20261026_008_create_sales_order_schema.sql`을, 메뉴 seed·권한 연결 패턴은 `backend/DATABASE/20261104/20261104_001_seed_sales_delivery_menu.sql`을 참고했다.

## 변경 사항

- 견적 헤더는 테넌트별 견적번호 유일성, 거래처 tenant FK, 사용 여부 및 감사 컬럼을 가진다.
- 견적 상세는 헤더와 tenant 복합 FK로 연결하고, 마스터 품목 선택 시에만 nullable `material_id` FK를 사용한다.
- 견적번호 검색과 거래처/작성일 검색을 위한 헤더 인덱스, 품목 ID 검색 인덱스를 추가한다.
- 견적관리 부모 메뉴와 작성·현황 leaf 메뉴를 승인된 테넌트의 활성 `SALES` 모듈 아래 seed한다. 역할별 권한은 같은 테넌트의 수주 작성·현황 메뉴에서 대응 권한만 복사한다.
- 스크립트: `20261116_002_create_sales_quotation_schema.sql`
- 메뉴 seed/롤백: `20261116_002_seed_sales_quotation_menu.sql`, `20261116_002_rollback_sales_quotation_menu.sql`
- 스키마 롤백: `20261116_002_rollback_sales_quotation_schema.sql`
