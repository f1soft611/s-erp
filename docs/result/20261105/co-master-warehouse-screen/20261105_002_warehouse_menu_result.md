# 20261105_002 창고관리 메뉴/권한 등록 결과

참고: [[20261105_002_change_warehouse_menu]]

## 처리 내용

- DB 변경 스크립트 작성 완료: `backend/DATABASE/20261105/20261105_002_seed_warehouse_menu.sql` (+ rollback, change-log), `docs/database/20261105/`에 동일 파일 미러링.
- `s-erp-postgresql-readonly` MCP로 메뉴 계층(`CO_COMMON` 하위 `sort_order` 10/20/30/40 사용 중 확인) 및 현재 역할 4종(`PLATFORM_ADMIN`,`ADMIN`,`ROLE_INFO_MANAGER`,`DEFAULT_USER`)을 조회해 반영.
- 메뉴: `CO_WAREHOUSE`('창고관리', `/co/master/warehouse`, `CO_COMMON` 하위 `sort_order=50`).
- 권한: 사용 중인 역할 4종 전체에 `READ`/`CREATE`/`UPDATE`/`EXCEL` 동일 부여(삭제 미지원 화면이라 `DELETE` 제외, `CO_CUSTOMER`/`CO_MATERIAL` 기준과 동일).

## 미실행 안내 (중요)

제가 가진 DB 도구는 읽기 전용(`s-erp-postgresql-readonly`)이라 **SQL을 직접 실행하지 못했습니다.** `backend/DATABASE/20261105/20261105_002_seed_warehouse_menu.sql`을 DB 클라이언트에서 직접 실행해 주세요(이전 `tb_warehouse` 재생성 때와 동일한 방식).

## 추가 반영: 구 메뉴 정리

사용자 확인 후, 코드가 삭제된 구 테스트 화면의 잔존 메뉴(`ST_WAREHOUSE`, 비활성 `use_at='N'`)를 같은 스크립트의 0번 단계에서 함께 삭제하도록 반영했습니다. FK `ON DELETE CASCADE`로 연결된 `tb_role_menu_permission` 매핑도 함께 삭제됩니다.
