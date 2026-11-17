# 품질관리 모듈·수입검사 메뉴 변경 이력

- 변경일: 2026-11-17
- 대상 테이블: `tb_module`, `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission` (데이터)
- 변경 항목:
  - 모듈 `QUALITY`(품질관리, 아이콘 `ClipboardCheck`, `/quality`, 정렬 5)를 추가한다(생산관리 4 다음, 기준정보 88 앞).
  - 그룹 `QUALITY_INSPECT`(수입검사, `/quality/inspect`, 정렬 10)를 모듈 직속으로 추가한다.
  - 화면 `QUALITY_INSPECT_CREATE`(자재수입검사등록, `/quality/inspect/inspect-create`, 정렬 10, READ/UPDATE), `QUALITY_INSPECT_STATUS`(자재수입검사현황, `/quality/inspect/inspect-status`, 정렬 20, READ/EXCEL)를 그룹 아래에 추가한다.
  - 역할 권한은 입고등록(`MATERIALS_RECEIPT_CREATE`)의 READ/UPDATE, 입고현황(`MATERIALS_RECEIPT_STATUS`)의 READ/EXCEL 역할 권한을 각각 복사한다.
- 대상 테넌트: 1
- 선행: `20261117_002_seed_material_receipt_menu.sql`, `20261117_003_seed_material_receipt_status_menu.sql`
- 영향: 신규 모듈·메뉴만 추가한다. 테이블 구조 변경 없음. 기존 모듈·메뉴는 변경하지 않는다. 사이드바에 품질관리 모듈이 새로 나타난다(권한이 있는 역할만).
- MCP 확인(2026-11-17): `tb_module` 조회로 테넌트 1의 모듈이 GROUPWARE(1)·SALES(2)·MATERIALS(3)·PRODUCTION(4)·COMMON(88)·SETTINGS(99)뿐이며 `QUALITY`가 없음을 확인했다. 적용 후 모듈·메뉴·권한을 재확인한다.
- 적용 상태: 사용자가 2026-11-17 실행했고 MCP `describe_table`·조회로 컬럼, 제약, 인덱스, 모듈·메뉴·권한이 스크립트와 일치함을 확인했다.
- 롤백 여부: 제공함. 화면 메뉴의 역할 권한·메뉴 권한·즐겨찾기·메뉴를 삭제하고, 비어 있으면 수입검사 그룹과 품질관리 모듈도 삭제한다.

적용 SQL: `20261117_005_seed_quality_inspect_menu.sql`

롤백 SQL: `20261117_005_rollback_quality_inspect_menu.sql`
