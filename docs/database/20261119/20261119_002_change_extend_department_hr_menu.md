# 20261119_002 부서 확장·HR 모듈/부서관리 메뉴 변경 이력

- 날짜: 2026-11-19
- 작업: 인사관리 1단계 부서관리 ([작업지시서](../../directions/20261119/20261119_008_hr-department_작업지시서.md))
- 스크립트: `20261119_002_extend_department_hr_menu.sql` / 롤백 `20261119_002_rollback_extend_department_hr_menu.sql`

## 변경 내용
| 대상 | 변경 |
|---|---|
| `tb_department` | `manager_user_id BIGINT`(→`tb_user.user_id`, ON DELETE SET NULL), `department_dc VARCHAR(500)`, `created_by`, `updated_by` 추가 |
| `tb_department` 인덱스 | `ux_department_root_name`(tenant_id, department_nm / 최상위), `ux_department_child_name`(tenant_id, parent_department_id, department_nm / 하위) 부분 유일, `idx_department_manager_user` |
| `tb_module` | `HR`(인사관리, 아이콘 Business, `/hr`, 정렬 6) 테넌트 1 |
| `tb_menu` | `HR_DEPARTMENT`(그룹, `/hr/department`), `HR_DEPARTMENT_MANAGE`(부서등록, `/hr/department/department-manage`) |
| `tb_menu_permission` / `tb_role_menu_permission` | 부서등록 메뉴에 READ·CREATE·UPDATE, 역할 권한은 `CO_WAREHOUSE`에서 복사(삭제 권한 없음) |

## 영향 범위
- `tb_department`를 참조하는 `tb_user`, `tb_warehouse`, `tb_purchase_request_hd`, `tb_purchase_order_hd`, `tb_purchase_arrival_hd`, `tb_purchase_receipt_hd`, `tb_quality_inspection_hd`는 구조 변경이 없다. 새 컬럼은 모두 null 허용이라 기존 INSERT가 깨지지 않는다.
- 적용 시점 `tb_department` 0건(2026-11-19 DB MCP 조회). 적용 직전에 건수를 다시 확인한다.
- 다른 테넌트에는 메뉴를 만들지 않는다(기존 메뉴 시드와 동일하게 테넌트 1).

## 롤백
롤백 스크립트로 가능하다. 입력된 부서장·설명·감사정보는 사라지고 부서 행은 유지된다.
