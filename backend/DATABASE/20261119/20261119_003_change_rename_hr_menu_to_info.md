# 20261119_003 인사관리 메뉴 "인사정보" 그룹 통합 변경 이력

- 날짜: 2026-11-19
- 작업: 인사관리 1단계 부서관리 ([작업지시서](../../directions/20261119/20261119_008_hr-department_작업지시서.md))
- 사유: 20261119_002 적용 후, 인사 화면 3개(부서관리·사원정보·인사명령)를 그룹 메뉴 "인사정보" 하나에 담기로 결정(사용자, 2026-11-19)
- 스크립트: `20261119_003_rename_hr_menu_to_info.sql` / 롤백 `20261119_003_rollback_rename_hr_menu_to_info.sql`

## 변경 내용 (테넌트 1, 메뉴 ID 유지)
| 변경 전 | 변경 후 |
|---|---|
| `HR_DEPARTMENT` 부서관리 `/hr/department` (그룹) | `HR_INFO` 인사정보 `/hr/info` (그룹) |
| `HR_DEPARTMENT_MANAGE` 부서등록 `/hr/department/department-manage` | `HR_INFO_DEPARTMENT` 부서관리 `/hr/info/department-manage` |

이후 단계에서 `HR_INFO_EMPLOYEE`(사원정보), `HR_INFO_ORDER`(인사명령)를 같은 그룹에 추가한다.

## 영향 범위
- `tb_menu` 2행의 menu_code·menu_nm·menu_url·menu_dc만 변경한다. 메뉴 ID가 같아 `tb_menu_permission`(3건), `tb_role_menu_permission`(12건)은 그대로이다.
- 프론트는 URL 마지막 구간 `department-manage`로 화면을 찾으므로 화면 코드 변경은 없다.
- 즐겨찾기 등 메뉴 ID 참조는 유지된다. 코드·URL로 저장된 값이 있었다면 영향을 받지만 적용 직후라 사용 이력이 없다.

## 롤백
롤백 스크립트로 이름을 되돌린다. 20261119_002 롤백보다 먼저 실행한다.
