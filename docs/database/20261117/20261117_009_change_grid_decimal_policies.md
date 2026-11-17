# 20261117_009 모듈별 그리드 소수점 정책 시드 변경 이력

- 날짜: 2026-11-17
- 변경 내용: `tb_module` 사용 모듈별 `GRID_DECIMAL_{module_code}` NUMBER 정책(기본 2, 최소 0, 최대 6, 단위 "자리")을 `tb_system_policy`에 시드. 정책 관리 목록에 모듈별로 노출되어 값만 수정하면 된다.
- 적용 대상 테이블: `tb_system_policy` (데이터만 추가, 스키마 변경 없음)
- 영향 범위: 정책 관리 화면 목록, `GET /api/v1/system/policies/grid-decimals`. 신규 모듈은 이 스크립트를 다시 실행하거나 정책 추가로 등록.
- 롤백: `20261117_009_rollback_grid_decimal_policies.sql` (GRID_DECIMAL_* 일반 정책 삭제)
- MCP 확인: `tb_module` 모듈 7건(GROUPWARE, SALES, MATERIALS, PRODUCTION, QUALITY, COMMON, SETTINGS) 확인.
