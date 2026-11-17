# 입고 상세 수입검사 연결 컬럼 추가 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_material_receipt_dt`(컬럼 추가)
- 변경 항목:
  - `material_inspection_detail_id`(BIGINT, NULL): 입고한 수입검사 상세 행. FK `tb_material_inspection_dt(material_inspection_detail_id)` `ON DELETE SET NULL`, 유일 제약 없음(분할 입고).
  - `inspection_no`(VARCHAR(30), NULL): 검사번호 복사본(이력·화면 표시용).
  - 인덱스 `ix_material_receipt_dt_inspection_dt`.
- 선행: 입고 테이블(`20261117_001`), 수입검사 테이블(`20261117_004`)
- 영향: 컬럼만 추가한다. 기존 컬럼·제약·데이터는 바꾸지 않으며 기존 입고 행(무검사)은 두 컬럼이 NULL이다. 입고 가능량은 저장하지 않고 `합격량 − 유효 입고 합`으로 조회 시 계산한다.
- MCP 확인(2026-11-17): `s-erp-postgresql-readonly` 조회로 두 컬럼이 아직 없고 `tb_material_inspection_dt`의 PK가 `material_inspection_detail_id`임을 확인했다. 적용 후 `describe_table`로 재확인한다.
- 적용 상태: 사용자가 2026-11-17 실행했고 MCP 조회로 컬럼·FK(ON DELETE SET NULL)·인덱스·주석이 스크립트와 일치하며 기존 입고 2행의 연결 값이 NULL임을 확인했다.
- 롤백 여부: 제공함. 인덱스·FK·컬럼을 삭제한다(검사 연결 입고가 있으면 연결 정보가 사라지고 입고 행은 남는다).

- 번호 안내(2026-11-17): 같은 날짜 폴더에 영업관리 쪽 `20261117_006`(견적 공통코드)~`20261117_010`(소수점 정책) 스크립트가 있어 이 변경의 번호 `006`과 겹친다. 두 계열은 서로 다른 작업이고 파일명이 달라 덮어쓰이지 않으며 서로 의존하지 않는다. 이미 적용한 뒤에 확인되어 번호는 바꾸지 않았다. 구매자재 쪽 적용 순서는 001 → 008, 영업 쪽은 별도로 006 → 010이다.

적용 SQL: `20261117_006_add_receipt_inspection_link.sql`

롤백 SQL: `20261117_006_rollback_receipt_inspection_link.sql`
