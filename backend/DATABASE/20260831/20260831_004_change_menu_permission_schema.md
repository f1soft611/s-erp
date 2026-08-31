# 20260831_004 메뉴 권한 스키마 변경 이력

## 변경 일자

2026-08-31

## 변경 내용

- 메뉴별 제공 버튼/기능 권한 마스터인 `tb_permission` 테이블을 신규 생성한다.
- 메뉴별 허용 권한을 저장하는 `tb_menu_permission` 매핑 테이블을 신규 생성한다.
- 활성 권한 코드 `READ`, `CREATE`, `UPDATE`, `DELETE`, `EXCEL`을 초기 데이터로 등록하거나 갱신한다.

## 적용 대상 테이블

- `tb_permission` (신규)
- `tb_menu_permission` (신규)

## 영향 범위

- 메뉴 관리 API와 후속 역할 관리 화면은 메뉴별 제공 기능 목록을 `tb_permission` 및 `tb_menu_permission`에서 조회한다.
- 기존 역할-메뉴 매핑 테이블 `tb_role_menu_permission`은 변경하지 않으며, 새 테이블과 FK 의존성이 없다.
- `tb_menu_permission.menu_id`는 메뉴 삭제 시 매핑을 함께 정리하도록 `tb_menu(menu_id)`를 `ON DELETE CASCADE`로 참조한다.

## 롤백 여부

- 가능. `20260831_004_rollback.sql`은 `tb_menu_permission`을 먼저 제거한 뒤 `tb_permission`을 제거한다.
- 롤백 스크립트는 `CASCADE`를 사용하지 않으며, 역할-메뉴 매핑에는 영향을 주지 않는다.
