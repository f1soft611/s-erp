---
name: skill-reg-menu
description: >
  새로 만든 화면(예: skill-view / skill-impl 로 생성한 CRUD 화면)을 s-erp 사이드바에
  노출시키기 위한 메뉴 등록 SQL 세트를 생성하는 업무 스킬. tb_menu / tb_menu_permission /
  tb_role_menu_permission 3테이블에 대한 멱등 seed 스크립트 + rollback + 변경이력 문서를
  `20260831_004_seed_module_menu.sql` 관례에 맞춰 날짜별 스키마 폴더에 만든다.
  백엔드 API 와 프론트 소스 set 이 이미 있고 화면이 메뉴에 안 보일 때 사용한다.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# skill-reg-menu — 신규 화면 메뉴 등록 SQL 생성

FE 화면은 `tb_menu` + `tb_role_menu_permission` row 가 있어야만 사이드바에 뜨고 라우팅된다. 이 스킬은 그 등록 스크립트를 만든다. **DDL 이 아니라 seed(데이터)** 다.

## 0. 배경 (레퍼런스에서 확인된 사실)

- 라우팅: FE `frontend/src/pages/dashboard/services/menuService.ts` 가 `menu_url` 을 `/` 로 분해 →
  `toModuleId = pathSegments[0]` (모듈 id), `toNodeId = pathSegments.at(-1)` (리프의 `pageKey`).
  → `DashboardContent.tsx` 의 디스패치 게이트 `selectedModule.id === '<moduleId>' && currentPageKey === '<pageKey>'` 와 **정확히 일치**해야 한다.
  예: `menu_url = '/settings/system/warehouses'` → moduleId `settings`, pageKey `warehouses`.
- 노출 조건: FE `hasEffectiveMenuPermission` — 리프 메뉴는 해당 역할에 read/create/update/delete/excel 중 **하나 이상**이 있어야 보인다. → `tb_role_menu_permission` row 없으면 영영 안 보임.
- `menu_dc` → FE `buildPageContent` 가 페이지 헤더 description 으로 사용.
- 권한 마스터(`tb_permission`): `READ`(조회) `CREATE`(등록) `UPDATE`(수정) `DELETE`(삭제) `EXCEL`(엑셀). `permission_code` 로 조인하면 id 하드코딩 불필요.
- seed 관례(`backend/DATABASE/20260831/20260831_004_seed_module_menu.sql`):
  `INSERT INTO ... SELECT ... FROM tb_tenant [JOIN tb_module / tb_menu ...] WHERE tenant_code = '<코드>' ON CONFLICT (...) DO NOTHING;` — 멱등, id 하드코딩 없음.
- `backend/AGENTS.md`: DB 변경은 `backend/DATABASE/<yyyymmdd>/` + `docs/database/<yyyy-mm-dd>/` 미러 + rollback + 변경이력 `.md` (날짜/내용/대상테이블/영향범위/롤백여부).

## 1. 시작 전

1. 현재 데이터 확인 (MCP `postgres` 읽기 전용 또는 `docs/database/db-schema.md`):
   ```sql
   SELECT module_id, module_code, module_nm, module_url FROM tb_module ORDER BY sort_order;
   SELECT menu_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, sort_order FROM tb_menu ORDER BY module_id, COALESCE(parent_menu_id,0), sort_order;
   SELECT permission_id, permission_code FROM tb_permission ORDER BY sort_order;
   SELECT role_id, role_code, role_nm FROM tb_role ORDER BY role_id;
   SELECT tenant_id, tenant_code FROM tb_tenant;
   ```
2. 대상 화면의 FE 디스패치 게이트 확인: `frontend/src/pages/dashboard/components/DashboardContent.tsx` 에서 `currentPageKey === '<X>'` 의 `<X>` 와 `selectedModule.id === '<Y>'` 의 `<Y>`.
3. 레퍼런스 seed: `backend/DATABASE/20260831/20260831_004_seed_module_menu.sql`, 최신 `backend/DATABASE/` 하위 폴더의 파일명 시퀀스.

## 2. 입력 스펙

| 항목 | 설명 | 예시 (warehouse) |
|---|---|---|
| `tenant_code` | 대상 테넌트 | `T1358606250` (에프원소프트) |
| `module_code` | 소속 모듈 (`tb_module.module_code`) | `SETTINGS` |
| `parent_menu_code` | 상위 메뉴 (`tb_menu.menu_code`), 없으면 최상위 | `ST_SYSTEM` |
| `menu_code` | 신규 메뉴 코드 (테넌트 내 유니크). 상위 접두사 관례 | `ST_WAREHOUSE` |
| `menu_nm` | 메뉴 표시명 | `창고관리` |
| `menu_url` | 라우팅 경로. **`/<moduleId>/.../<pageKey>` 형태, FE 게이트와 일치** | `/settings/system/warehouses` |
| `icon_nm` | 아이콘명 (없으면 NULL — 형제 메뉴들도 대부분 NULL) | `NULL` |
| `sort_order` | 형제 내 정렬. 기존 max + 1 | `4` |
| `menu_dc` | 메뉴 설명 (헤더 description) | `테넌트별 창고 마스터(창고명, 사용 여부)를 관리합니다.` |
| `supported_permissions` | 이 메뉴가 지원하는 버튼 권한 코드 | `READ, CREATE, UPDATE, DELETE, EXCEL` |
| `role_grants` | 역할별 부여 권한 `{role_code: [perm_code...]}` | `{ PLATFORM_ADMIN: [READ, CREATE, UPDATE, DELETE, EXCEL] }` |

- `menu_url` 의 첫 세그먼트가 FE `selectedModule.id` 와, 마지막 세그먼트가 `currentPageKey` 와 **반드시** 같아야 한다. 불일치 시 화면 흰페이지/404. 스킬은 이 검증을 먼저 한다.
- `supported_permissions` 기본값: 화면이 F1Grid CRUD 면 `READ, CREATE, UPDATE, DELETE, EXCEL` 전부 (modules 와 동일).
- `role_grants` 는 노출 대상 역할만. 최소 1개 역할에 최소 `READ` 는 있어야 사이드바에 뜬다.

## 3. 생성 파일 (4개)

날짜 = 오늘(`date +%Y%m%d`). 시퀀스 `NNN` = 해당 날짜 폴더 마지막 + 1 (없으면 `001`).
슬러그 `<slug>` = pageKey (예: `warehouse`).

```
backend/DATABASE/<yyyymmdd>/<yyyymmdd>_<NNN>_seed_<slug>_menu.sql
backend/DATABASE/<yyyymmdd>/<yyyymmdd>_<NNN>_rollback.sql
backend/DATABASE/<yyyymmdd>/<yyyymmdd>_<NNN>_change_<slug>_menu.md
docs/database/<yyyy-mm-dd>/  ← 위 3개 파일 동일 미러 (cp)
```
> 같은 날짜 폴더에 이미 `_NNN_` 파일이 있으면 시퀀스를 이어간다 (예: warehouse DDL 이 `20260909_001` 이면 메뉴 seed 는 `20260909_002`).

## 4. seed SQL 템플릿 (`_seed_<slug>_menu.sql`)

```sql
-- <yyyymmdd>_<NNN>_seed_<slug>_menu.sql
-- 대상 DB: s-erp_central (PostgreSQL)
-- 목적: '<menu_nm>' 화면(<menu_url>)을 <tenant_code> 테넌트 사이드바에 등록
-- 참고: 20260831_004_seed_module_menu.sql 관례 (INSERT ... SELECT ... ON CONFLICT DO NOTHING)

-- 1) 메뉴 노드
INSERT INTO tb_menu (tenant_id, module_id, parent_menu_id, menu_code, menu_nm, menu_url, icon_nm, sort_order, use_at, menu_dc)
SELECT t.tenant_id, m.module_id, p.menu_id,
       '<menu_code>', '<menu_nm>', '<menu_url>', <icon_nm|NULL>, <sort_order>, 'Y',
       '<menu_dc>'
FROM tb_tenant t
JOIN tb_module m ON m.tenant_id = t.tenant_id AND m.module_code = '<module_code>'
JOIN tb_menu   p ON p.tenant_id = t.tenant_id AND p.menu_code   = '<parent_menu_code>'
WHERE t.tenant_code = '<tenant_code>'
ON CONFLICT (tenant_id, menu_code) DO NOTHING;
-- 최상위 메뉴(상위 없음)면 위에서 `JOIN tb_menu p` 제거하고 SELECT 의 p.menu_id 를 NULL 로.

-- 2) 이 메뉴가 지원하는 버튼 권한 (tb_menu_permission)
INSERT INTO tb_menu_permission (menu_id, permission_id)
SELECT mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t   ON t.tenant_id = mn.tenant_id
JOIN tb_permission pm ON pm.permission_code IN (<'READ','CREATE','UPDATE','DELETE','EXCEL'>)
WHERE t.tenant_code = '<tenant_code>' AND mn.menu_code = '<menu_code>'
ON CONFLICT (menu_id, permission_id) DO NOTHING;

-- 3) 역할별 부여 권한 (tb_role_menu_permission) — 역할마다 한 블록
INSERT INTO tb_role_menu_permission (role_id, menu_id, permission_id)
SELECT r.role_id, mn.menu_id, pm.permission_id
FROM tb_menu mn
JOIN tb_tenant t ON t.tenant_id = mn.tenant_id
JOIN tb_role   r ON r.tenant_id = mn.tenant_id AND r.role_code = '<role_code>'
JOIN tb_permission pm ON pm.permission_code IN (<역할별 부여 코드들>)
WHERE t.tenant_code = '<tenant_code>' AND mn.menu_code = '<menu_code>'
ON CONFLICT (role_id, menu_id, permission_id) DO NOTHING;
```

주의:
- `tb_role` 은 `tenant_id` 컬럼이 있다 (테넌트별 역할). `PLATFORM_ADMIN` 등 시스템 역할도 각 테넌트 row 로 존재하는지 0절 쿼리로 확인하고, 아니면 `r.tenant_id` 조인을 뺀다.
- `tb_menu_permission` / `tb_role_menu_permission` 은 감사/타임스탬프 컬럼이 `DEFAULT NOW()` 이므로 INSERT 에서 생략.
- 전부 `ON CONFLICT ... DO NOTHING` — 재실행 안전.

## 5. rollback SQL 템플릿 (`_rollback.sql`)

```sql
-- <yyyymmdd>_<NNN>_rollback.sql
-- 주의: '<menu_nm>' 메뉴와 그 권한 매핑이 삭제됩니다. (tb_menu 삭제 시 FK ON DELETE CASCADE 로
--       tb_menu_permission / tb_role_menu_permission 도 함께 삭제됨)
DELETE FROM tb_menu
WHERE menu_code = '<menu_code>'
  AND tenant_id = (SELECT tenant_id FROM tb_tenant WHERE tenant_code = '<tenant_code>');
```
(`tb_menu_permission.menu_id` FK 는 `ON DELETE CASCADE`, `tb_role_menu_permission` 의 3개 FK 도 `ON DELETE CASCADE` — 메뉴 한 줄 삭제로 정리됨.)

## 6. 변경이력 `.md` 템플릿 (`_change_<slug>_menu.md`)

`backend/DATABASE/20260831/20260831_003_change_module_menu_schema.md` 형식:
```md
# <yyyymmdd>_<NNN> <menu_nm> 메뉴 등록 이력

## 변경 일자
<yyyy-mm-dd>

## 변경 내용
- `<tenant_code>` 테넌트에 `<menu_nm>`(`<menu_url>`) 메뉴 등록 (`<...>_seed_<slug>_menu.sql`)
- 지원 버튼 권한: <supported_permissions>
- 역할 부여: <role_grants 요약>

## 적용 대상 테이블
- `tb_menu` (row 추가), `tb_menu_permission` (row 추가), `tb_role_menu_permission` (row 추가)

## 영향 범위
- FE: `<menu_url>` → `DashboardContent.tsx` 게이트 `selectedModule.id === '<moduleId>' && currentPageKey === '<pageKey>'` 로 라우팅, 부여 역할 사용자 사이드바에 노출.
- 스키마 변경 없음(seed only).

## 롤백 여부
- 가능. `<...>_rollback.sql` — `tb_menu` 한 줄 삭제 시 FK CASCADE 로 권한 매핑 동반 삭제.

## 관련 문서
- 백엔드 API: `/api/v1/system/<plural>` (별도 작업)
- 프론트 소스 set: `frontend/src/pages/settings/system/<plural>/`
```

## 7. 검증

1. `menu_url` 첫/마지막 세그먼트 == FE 게이트 `selectedModule.id` / `currentPageKey` 인지 `grep` 로 대조.
2. seed 실행은 **DDL 과 동일하게 사용자 승인 필요** — MCP `postgres` 는 읽기 전용이므로 실행하려면 별도 인가된 방법(psycopg 등)으로. 스킬은 스크립트 생성까지가 기본.
3. 실행 후 확인 쿼리:
   ```sql
   SELECT mn.menu_id, mn.menu_code, mn.menu_url, mn.parent_menu_id, mn.sort_order,
          (SELECT string_agg(pm.permission_code, ',' ORDER BY pm.sort_order)
             FROM tb_menu_permission mp JOIN tb_permission pm ON pm.permission_id = mp.permission_id
            WHERE mp.menu_id = mn.menu_id) AS supported,
          (SELECT string_agg(r.role_code || ':' || pm.permission_code, ' ')
             FROM tb_role_menu_permission rmp
             JOIN tb_role r ON r.role_id = rmp.role_id
             JOIN tb_permission pm ON pm.permission_id = rmp.permission_id
            WHERE rmp.menu_id = mn.menu_id) AS role_grants
   FROM tb_menu mn
   WHERE mn.menu_code = '<menu_code>';
   ```
4. (배포 환경이면) 부여 역할 계정으로 `GET /api/v1/menus/my` 응답에 새 노드가 오는지, 사이드바 → `<menu_url>` 진입 시 화면이 뜨는지.

## 8. 완료 체크리스트

- [ ] 0절 쿼리로 module_id / parent menu_code / permission_code / role_code / tenant_code 실제값 확인
- [ ] `menu_url` ↔ FE 디스패치 게이트 일치 확인 (불일치면 중단하고 보고)
- [ ] 4개 파일 생성 (`backend/DATABASE/<date>/` 3개 + `docs/database/<date>/` 미러 3개) — 날짜 폴더 시퀀스 이어받기
- [ ] 모든 INSERT 가 `tenant_code` 로 스코프 + `ON CONFLICT DO NOTHING`
- [ ] rollback 은 `tb_menu` 한 줄 삭제(FK CASCADE 의존)
- [ ] 변경이력 `.md` 에 날짜/내용/대상테이블/영향범위/롤백여부 포함
- [ ] 실행은 사용자 승인 후. 실행했으면 7절 확인 쿼리 결과 첨부
- [ ] `backend/` · `docs/` 밖 미변경, 커밋은 요청 시에만

## 9. 주의

- 스키마(DDL)가 아니라 **seed(데이터)**. 파일명 `_seed_` / `_change_..._menu`.
- 절대 id 를 하드코딩하지 말 것 — 전부 `code` 조인.
- `tb_menu.menu_url` 의 세그먼트 구조가 FE 라우팅의 유일한 계약. 화면 소스 set(skill-view)의 게이트와 세트로 움직인다.
- 시스템 역할(`PLATFORM_ADMIN` 등)이 테넌트별 row 인지 전역 row 인지 0절에서 확인 후 조인 결정.
