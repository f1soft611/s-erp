# 자재 수입검사 테이블 생성 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_material_inspection_hd`(신규), `tb_material_inspection_dt`(신규)
- 변경 항목:
  - 헤더: 검사번호 `QI-yyyyMMdd-NNNN`, 검사일, 검사자·부서, 비고, 사용여부(취소). 구매처·통화는 두지 않는다(검사 1건에 여러 구매처의 가입고 행을 묶을 수 있다).
  - 상세: 가입고 행 연결(`material_arrival_detail_id`, `ON DELETE SET NULL`, 부분 검사로 같은 행에 여러 검사 가능), 가입고번호 복사본(`arrival_no`), 발주 행 연결(발주 잔량에 불합격량을 더하는 용도), 합격량·불합격량, 비고
  - CHECK: 합격량 ≥ 0, 불합격량 ≥ 0, 합격량 + 불합격량 > 0, 행번호 > 0, 사용여부 Y/N. 검사량은 저장하지 않고 합으로 계산한다.
- 선행: 가입고 스키마(`20261116_002`), 발주 스키마(`20261113_002`)
- 영향: 신규 테이블만 추가한다. 기존 테이블은 변경하지 않는다. 검사 여부는 가입고 행의 `inspect_at`으로 판단하며 검사 상세에 복사하지 않는다. 입고 연결 컬럼은 입고 수동 등록 단계에서 추가한다.
- 제외한 MES 컬럼: 검사방법(샘플·무검사), 시료량, 연속합격, 샘플검사방법·결과, 특채조건·부적합 처리, 검사항목별 결과(`TQC206D`), 사진, 입고요청량(`INPUT_REQ_QTY`), 검사종료량·기입고 파생 컬럼, 2차 작업자·시간
- MCP 확인(2026-11-17): `s-erp-postgresql-readonly`의 `list_tables`로 수입검사 테이블이 아직 없음을 확인했고, `tb_material_arrival_dt.inspect_at`(`CHAR(1) NOT NULL DEFAULT 'N'`)을 `describe_table`로 확인했다. 적용 후 `describe_table`로 재확인한다.
- 적용 상태: 사용자가 2026-11-17 실행했고 MCP `describe_table`·조회로 컬럼, 제약, 인덱스, 모듈·메뉴·권한이 스크립트와 일치함을 확인했다.
- 롤백 여부: 제공함. 검사 상세와 헤더 테이블을 삭제한다(데이터가 있으면 함께 삭제).

적용 SQL: `20261117_004_create_material_inspection_schema.sql`

롤백 SQL: `20261117_004_rollback_material_inspection_schema.sql`
