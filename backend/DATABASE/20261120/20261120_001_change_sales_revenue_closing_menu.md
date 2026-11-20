# 20261120_001 매출마감관리 메뉴 seed 변경 이력

## 변경 정보

- 날짜: 2026-11-20
- 변경: 영업관리 모듈에 `매출관리 > 매출마감관리` 메뉴를 등록하는 seed 추가
- 적용 대상: 실행 전에 승인된 단일 tenant. SQL 기본값은 `NULL`이며 실행하지 않음.
- 영향 테이블: `tb_menu`, `tb_menu_permission`, `tb_role_menu_permission`, `tb_user_menu_favorite`
- 스키마 변경: 없음
- DB 적용 상태: 미적용

## 메뉴 계약

| 구분 | 메뉴 코드 | 이름 | 경로 | 상위 |
| --- | --- | --- | --- | --- |
| 그룹 | `SALES_REVENUE` | 매출관리 | `/sales/revenue` | 영업관리 모듈 |
| 화면 | `SALES_REVENUE_CLOSING` | 매출마감관리 | `/sales/revenue/revenue-closing` | `SALES_REVENUE` |

화면 menu key는 프론트엔드 `revenue-closing`과 연결한다. 기존 영업 메뉴 그룹과 메뉴는 이동하거나 수정하지 않는다.

## 권한 및 안전성

- 화면 권한은 `READ`, `CREATE`, `EXCEL`을 등록한다. CREATE는 선택한 미마감 출하별 거래명세서를 생성한다.
- 같은 tenant의 활성 `SALES_DELIVERY_STATUS` 역할 권한에서 `READ`, `EXCEL`을 복사하고, 활성 `SALES_STATEMENT_CREATE`의 `CREATE` 역할 권한에서 CREATE를 복사한다.
- 메뉴 코드는 `(tenant_id, menu_code)` unique key로 중복을 막고, 연결 권한은 현재 DB의 복합 primary key에 `ON CONFLICT DO NOTHING`으로 재실행을 허용한다.
- 기존 코드가 다른 경로/상위/모듈/사용 상태로 존재하면 seed가 예외로 중단한다.
- 스크립트의 `v_tenant_id`를 승인된 값으로 직접 지정하지 않으면 예외 처리한다. 실제 DB에는 실행하지 않았다.

## 근거와 검증

- `s-erp-postgresql-readonly` MCP로 `list_tables`, `describe_table`을 호출해 메뉴/모듈/권한 연결/즐겨찾기 테이블과 컬럼을 확인했다.
- 제한된 메타데이터 조회로 메뉴 unique key와 메뉴 권한/역할 권한 복합 key를 확인했다. 거래명세서 생성 메뉴 코드는 기존 날짜별 seed와 Controller 권한 경로를 대조했다.
- 제한 조회에서 현재 SALES 메뉴 구조에 활성 `매출관리` 그룹이 없는 것을 확인하여 새 그룹과 자식 화면을 함께 등록한다. tenant 식별자나 메뉴 데이터 행은 이 변경 이력에 기록하지 않는다.
- seed와 rollback은 `docs/database/20261120` 및 `backend/DATABASE/20261120`에 동일하게 보관한다.

## 롤백

`20261120_001_rollback_sales_revenue_closing_menu.sql`에서 seed와 동일하게 승인된 tenant ID를 지정한다. 롤백은 매출마감관리 화면의 CREATE/READ/EXCEL 역할 권한, 메뉴 권한, 즐겨찾기 및 자식 메뉴를 제거한다. `매출관리` 그룹은 다른 하위 메뉴, 권한 참조, 즐겨찾기가 없고 seed의 경로/설명 표식과 일치할 때만 제거한다.
