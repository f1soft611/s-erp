# 견적서 공통코드 seed 변경 이력

- 날짜: 2026-11-17
- 대상: `tb_common_code_group`, `tb_common_code_item`.
- 내용: INCOTERMS 11종, PAYMENT_TERM 5종 기본 코드 추가. CURRENCY·ITEM_UNIT 및 기존 사용자 설정은 변경하지 않는다.
- 영향: 승인한 대상 테넌트의 견적서 선택지. 테이블·컬럼·FK·기존 견적 데이터 변경 없음. 따라서 누적 `db-schema.md` 구조 수정 없음.
- MCP 근거: 기본 서버 `list_tables`, 두 테이블 `describe_table`, 그룹별 집계 조회에서 CURRENCY·ITEM_UNIT 존재 및 신규 두 그룹 부재 확인. 테넌트별 적용 여부는 별도 확인 필요.
- 적용: 승인된 DB 연결에서 `psql -X -v ON_ERROR_STOP=1 -v target_tenant_id=<승인된ID> -f 20261117_006_seed_quotation_common_codes.sql`.
- 확인: 같은 인자로 `20261117_006_verify_quotation_common_codes.sql` 실행. 네 그룹 모두 사용 중이며 활성 항목이 있어야 한다. CURRENCY·ITEM_UNIT이 대상에 없다면 기존 해당 그룹 seed/관리 절차로 먼저 구성한다.
- 멱등성: 기존 그룹·항목은 ON CONFLICT DO NOTHING. 없는 테넌트 또는 미사용/상위 그룹 참조가 있는 신규 대상 그룹은 전체 트랜잭션 실패.
- 롤백: 같은 인자로 `20261117_006_rollback_quotation_common_codes.sql`. 이번 seed 표시가 붙고 수정/참조되지 않은 행만 삭제한다.
- 주의: 문자열로 저장된 견적 참조는 FK로 판별할 수 없다. 업무 사용 후 롤백하지 않고 공통코드 관리에서 사용 여부를 조정한다.
- 이 작업은 스크립트 제공이며 실제 업무 DB에는 적용하지 않는다.
