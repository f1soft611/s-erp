# 가입고 테이블 생성 변경 이력

- 변경일: 2026-11-16
- 대상 테이블: `tb_material_arrival_hd`(신규), `tb_material_arrival_dt`(신규)
- 변경 항목:
  - 헤더: 가입고번호 `MP-yyyyMMdd-NNNN`, 구매처·통화 1종, 담당자·부서, 부가세구분·포함여부, 공급가·세액·합계, 사용여부(취소)
  - 상세: 발주 행 연결(`purchase_order_detail_id`, 분할 입고 시 중복 가능), 수량·단가(필수, 0 허용), 공급가·세액·합계, 입고창고, 제조일·소비기한, LOT번호(빈값), 검사대상 복사본(`inspect_at`)
  - CHECK: 영세·면세는 포함 불가, 수량 > 0, 단가 ≥ 0, 소비기한 ≥ 제조일, Y/N 컬럼 값
- 선행: 발주 스키마(`20261113_002`), 부가세구분 공통코드(`20261113_001`)
- 영향: 신규 테이블만 추가한다. 기존 테이블은 변경하지 않는다. 발주 행 가입고 잔량 = 발주수량 − 유효 가입고 행 수량 합(조회 시 계산, 저장하지 않는다).
- 제외한 MES 컬럼: LOCATION, 실가입고량, SCM 확정, 수주 연계 정보(`T_ORDER_*`), 시스템 LOT 생성
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_purchase_order_hd/dt`, `tb_customer_info`, `tb_warehouse` 구조를 확인했고 가입고 테이블이 아직 없음을 목록 조회로 확인했다.
- 적용 상태: SQL 스크립트만 작성했으며 실제 DB에는 적용하지 않았다.
- 롤백 여부: 제공함. 가입고 상세와 헤더 테이블을 삭제한다(데이터가 있으면 함께 삭제).

적용 SQL: `20261116_002_create_material_arrival_schema.sql`

롤백 SQL: `20261116_002_rollback_material_arrival_schema.sql`
