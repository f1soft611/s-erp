# 매입마감처리 메뉴 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목:
  - 화면 `MATERIALS_RECEIPT_CLOSING`(매입마감처리, `/materials/receipt/receipt-closing`, 정렬 50)을 구매자재 모듈의 입고관리 그룹(`MATERIALS_RECEIPT`) 아래에 추가한다(입고현황 40 다음).
  - 메뉴 권한은 READ/UPDATE/EXCEL. 역할 권한은 입고등록(`MATERIALS_RECEIPT_CREATE`)의 READ/UPDATE, 입고현황(`MATERIALS_RECEIPT_STATUS`)의 EXCEL 역할 권한을 복사한다.
- 대상 테넌트: 1
- 선행: `20261117_002_seed_material_receipt_menu.sql`, `20261117_003_seed_material_receipt_status_menu.sql`
- 영향: 신규 메뉴 1건만 추가한다. 테이블 구조 변경 없음, 기존 모듈·메뉴는 변경하지 않는다. 권한이 있는 역할의 입고관리 그룹에 매입마감처리가 나타난다.
- MCP 확인(2026-11-17): 테넌트 1의 `MATERIALS_RECEIPT`(57) 그룹 아래 화면이 가입고등록(10)·가입고현황(20)·입고등록(30)·입고현황(40)뿐이며 마감 메뉴가 없음을 확인했다.
- 적용 상태: 사용자가 2026-11-17 실행했고 MCP로 컬럼·제약·인덱스(메뉴는 메뉴·메뉴 권한 3건·역할 권한 6건)가 스크립트와 일치함을 확인했다.
- 롤백 여부: 제공함. 화면 메뉴의 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제한다.

- 번호 안내(2026-11-17): 같은 날짜 폴더에 영업관리 쪽 `20261117_006`(견적 공통코드)~`20261117_010`(소수점 정책) 스크립트가 있어 이 변경의 번호 `008`과 겹친다. 두 계열은 서로 다른 작업이고 파일명이 달라 덮어쓰이지 않으며 서로 의존하지 않는다. 이미 적용한 뒤에 확인되어 번호는 바꾸지 않았다. 구매자재 쪽 적용 순서는 001 → 008, 영업 쪽은 별도로 006 → 010이다.

적용 SQL: `20261117_008_seed_receipt_closing_menu.sql`

롤백 SQL: `20261117_008_rollback_receipt_closing_menu.sql`
