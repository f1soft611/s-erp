# 20261106_001 창고관리 메뉴 설명 문구 변경 이력

## 변경 일자

2026-11-06

## 변경 내용

- `CO_WAREHOUSE` 메뉴(`menu_dc`)를 `'테넌트별 창고 마스터(창고코드/창고명/창고구분 등)를 관리합니다.'`에서
  `'창고 정보(창고명/창고구분 등)를 관리합니다.'`로 변경 (`20261106_001_update_warehouse_menu_description.sql`).
- 화면 상단 설명 문구(`PageHeader` description)에 직접 반영되는 값으로, 사용자 요청에 따라 간결하게 수정.

## 적용 대상 테이블

- `tb_menu` (row 1건 수정: `CO_WAREHOUSE`의 `menu_dc`)

## 영향 범위

- `/co/master/warehouse` 화면 상단 설명 텍스트만 변경됨. 다른 동작에는 영향 없음.

## 롤백 여부

- 가능. `20261106_001_rollback.sql` 실행 시 변경 전 문구로 복원.

## 관련 문서

- [[20261105_002_change_warehouse_menu]]
