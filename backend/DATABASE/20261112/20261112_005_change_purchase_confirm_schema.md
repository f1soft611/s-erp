# 구매요청확정 묶음 확정 구조 변경 이력

- 변경일: 2026-11-12
- 대상 테이블: `tb_purchase_confirm_hd`(신규), `tb_purchase_request_hd`(변경), `tb_id_sequence`(데이터)
- 변경 내용
  - 신규 `tb_purchase_confirm_hd`: 여러 구매요청을 묶어 확정하는 확정 메인. 확정번호 `MC-yyyyMMdd-NNNN`,
    확정일, 확정자, 묶음 통화, 합계금액, 비고, 사용여부(`N` = 확정 취소됨), 감사 컬럼.
  - `tb_purchase_request_hd`: `purchase_confirm_id` 추가(복합 FK `(purchase_confirm_id, tenant_id)`),
    `confirm_dt`·`confirmer_id`와 관련 FK·CHECK 삭제, `ck_purchase_request_hd_confirm_link`
    (요청 = 확정 ID 없음, 확정 = 확정 ID 있음) 추가.
  - 기존 확정 데이터 이전: 확정 요청마다 확정 메인 1건 생성, `MATERIAL_CONFIRM_NO` 채번값 맞춤.
    상세 통화가 섞인 확정 요청이 있으면 예외로 중단한다.
- 사유: 실제 업무는 여러 구매요청을 한 번에 확정하고 묶음 단위로 확정번호를 받는다(MES TMA103A).
  20261112_002에서 확정 메인을 요청 헤더에 합쳤던 결정을 변경한다.
- 영향: 구매요청확정 API·화면(묶음 확정으로 변경), 구매요청등록 단건 조회(확정일 조인). 구매요청현황은 영향 없음.
- 사전 조치: 테스트 데이터 `MR-20261112-0005`(KRW·USD 혼합 확정)는 실행 전에 확정 취소했다.
- MCP 확인: `s-erp-postgresql-readonly`로 `tb_purchase_request_hd` 제약 이름(`ck_purchase_request_hd_confirmed`,
  `fk_purchase_request_hd_confirmer`), `tb_id_sequence` PK, 확정 상태 요청 0건을 확인했다.
- 적용 상태: 2026-11-12 사용자가 개발 DB(테넌트 1)에 직접 적용했고, MCP로 신규 테이블·제약과 요청 헤더 변경을 확인했다(이전 대상 확정 데이터 0건).
- 롤백 여부: 제공함. 요청 헤더에 확정일·확정자를 복원하고 확정 메인을 삭제한다(취소 이력은 사라짐).

적용 SQL: `20261112_005_alter_purchase_confirm_schema.sql`

롤백 SQL: `20261112_005_rollback_purchase_confirm_schema.sql`
