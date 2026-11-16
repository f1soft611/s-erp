# 구매요청확정 품목 단위 확정 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: `tb_purchase_request_dt`, `tb_purchase_request_hd`
- 변경 내용
  - `tb_purchase_request_dt`: `purchase_confirm_id` 추가(복합 FK `(purchase_confirm_id, tenant_id)` → `tb_purchase_confirm_hd`),
    인덱스 `ix_purchase_request_dt_confirm`, CHECK `ck_purchase_request_dt_confirm_link`(확정 ID와 확정수량은 함께 있거나 함께 없음).
  - `tb_purchase_request_hd`: `purchase_confirm_id`와 관련 FK·CHECK·인덱스 삭제, 상태 CHECK를
    `REQUESTED`/`PARTIALLY_CONFIRMED`/`CONFIRMED`로 교체.
  - 데이터 이전: 확정 요청의 헤더 확정 ID를 그 요청의 모든 상세 행으로 복사.
- 사유: 구매요청의 품목 행을 골라 확정하고, 같은 요청의 나머지 품목은 다른 확정번호로 확정한다(MES 방식). 수량 분할은 없다.
- 영향: 구매요청확정 API·화면(품목 행 선택), 요청 상태 라벨(부분확정), 구매요청등록 단건 조회(헤더 확정일 조인 제거).
- MCP 확인: `s-erp-postgresql-readonly`로 20261112_005 적용 결과(헤더 `purchase_confirm_id`, `ck_purchase_request_hd_confirm_link`,
  `fk_purchase_request_hd_confirm`, `ck_purchase_request_hd_status`)와 확정 데이터(`MC-20261112-0001` 1건 사용 중)를 확인했다.
- 적용 상태: 2026-11-12 사용자가 개발 DB(테넌트 1)에 직접 적용했고, MCP로 상세 확정 ID·헤더 컬럼 삭제·상태 CHECK를 확인했다.
- 롤백 여부: 제공함. 부분확정 요청이 있거나 한 요청이 여러 확정에 나뉘어 있으면 중단한다.

적용 SQL: `20261112_006_alter_purchase_confirm_item_schema.sql`

롤백 SQL: `20261112_006_rollback_purchase_confirm_item_schema.sql`
