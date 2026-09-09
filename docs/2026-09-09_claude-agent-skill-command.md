# 2026-09-09 · Claude Code Agent / Skill / Command 생성 기록

`s-erp` 프로젝트에 CRUD 개발 자동화를 위한 **Agent 2개 · Skill 4개 · Command 1개** 를 만든 과정 기록.
레퍼런스 패턴(`system/modules`)을 그대로 복제해 새 도메인의 소스 set 을 생성하는 파이프라인이다.

---

## 1. 대화 흐름 (요청 순서)

| # | 요청 | 결과 |
|---|---|---|
| 1 | PostgreSQL MCP 설정 (`s-erp_central`) | `~/.claude.json` local 스코프, `postgres` 서버(읽기 전용) |
| 2 | 연결 확인 + 테이블 목록 | `public` 11테이블 확인 |
| 3 | `tb_warehouse` DDL 생성 (기존 패턴에 맞춰) | `20260909_001` 마이그레이션 세트 |
| 4 | DDL 실행 (1회 승인) | `tb_warehouse` 생성 완료 |
| 5 | 커밋 | `feature/tb-warehouse-schema` `315d716` |
| 6 | **`modules` 참고해서 Agent-FE-Dev+skill-view, Agent-BE-Dev+skill-impl, skill-orm 생성 / `/dev:crud-temp1` 로 실행 / Task 나눠 subagent 진행** | Agent 2 + Skill 3 + Command 1 |
| 7 | `/dev:crud-temp1 tb_warehouse 기준으로 생성` | warehouse BE 8파일 + FE 6파일 |
| 8 | `module` 메뉴 확인 → `skill-reg-menu` 생성 | Skill 1 + warehouse 메뉴 seed 세트 |
| 9 | 메뉴 등록만 실행 승인 | `20260909_002` seed 실행 완료 |

---

## 2. 산출물 (`.claude/` 구조)

```
.claude/
├─ commands/
│  └─ dev/
│     └─ crud-temp1.md        → 슬래시 명령 /dev:crud-temp1 (오케스트레이터)
├─ agents/
│  ├─ Agent-BE-Dev.md         → 백엔드 CRUD 소스 set 개발 서브에이전트
│  └─ Agent-FE-Dev.md         → 프론트 CRUD 화면 소스 set 개발 서브에이전트
└─ skills/
   ├─ skill-impl/SKILL.md     → 백엔드 Java 7파일 (controller/service/impl/VO×3/DAO)
   ├─ skill-orm/SKILL.md      → MyBatis 매퍼 XML (EgovSystem<Entity>_SQL_postgresql.xml)
   ├─ skill-view/SKILL.md     → 프론트 4파일 (Page/Panel/service/types) + DashboardContent 배선
   └─ skill-reg-menu/SKILL.md → 신규 화면 메뉴 등록 seed SQL (tb_menu/tb_menu_permission/tb_role_menu_permission)
```

의존 관계:

```
/dev:crud-temp1 ──┬─ Agent-BE-Dev ──┬─ skill-impl (Java)
                  │                 └─ skill-orm  (매퍼 XML)
                  └─ Agent-FE-Dev ──── skill-view (화면)

skill-reg-menu ── 위 산출물이 만든 화면을 사이드바에 노출 (별도 실행)
```

---

## 3. 어떻게 만들었나 — 방법론

### 3-1. 핵심 아이디어

**"레퍼런스 1세트를 정본으로 삼고, 그 패턴을 규칙·템플릿으로 문서화한 Skill 을 만든다."**
Skill 이 지식을 담고, Agent 는 Skill 에 위임만 하며, Command 는 Agent 를 오케스트레이션한다.

| 레퍼런스 (정본) | 담당 Skill |
|---|---|
| `backend/src/main/java/egovframework/let/system/modules/` (Java 7파일) | skill-impl |
| `backend/src/main/resources/egovframework/mapper/let/system/modules/EgovSystemModule_SQL_postgresql.xml` | skill-orm |
| `frontend/src/pages/settings/system/modules/` (4파일) | skill-view |
| `20260831_004_seed_module_menu.sql` + `tb_menu` 계열 | skill-reg-menu |

### 3-2. 제작 절차

1. **레퍼런스 정독** — 병렬 서브에이전트 2개(`fe-pattern-analysis`, `be-pattern-analysis`)를 띄워 FE / BE+ORM 패턴을 각각 분석. (요청 #6 의 "Task 나눠서 subagent" 반영)
   - 산출: 파일별 구조, 네이밍 규칙, 관례, gotcha, "warehouses" 워크드 예시, 재현 체크리스트
2. **Skill 작성** — 분석 결과를 `SKILL.md` 한 파일에 인코딩:
   - frontmatter: `name`, `description`(언제 쓰는지), `allowed-tools`
   - 본문: 토큰 정의표 → 생성 파일 목록 → 파일별 템플릿(플레이스홀더) → 불변 규칙 → 완료 체크리스트 → gotcha
3. **Agent 작성** — 얇게. `.claude/agents/<name>.md`:
   - frontmatter: `name`, `description`, `tools`(`Read,Write,Edit,Grep,Glob,Bash,Skill`), `model: sonnet`
   - 본문: 레퍼런스 위치, 입력 스펙, 절차(문서확인→Skill 실행→검증→보고), 불변 규칙, 병렬성
4. **Command 작성** — `.claude/commands/dev/crud-temp1.md`:
   - frontmatter: `description`, `argument-hint`, `allowed-tools`(`Agent` 포함)
   - 본문: `$ARGUMENTS` 파싱 → 공유 계약 확정 → Agent 2개 **병렬** 스폰 → 취합/교차검증/최종빌드/보고

### 3-3. 파일 형식 요약

**Agent** (`.claude/agents/<Name>.md`)
```yaml
---
name: Agent-BE-Dev
description: >
  ...언제 자동/수동으로 쓰이는지...
tools: Read, Write, Edit, Grep, Glob, Bash, Skill
model: sonnet
---
# 본문: 역할, 레퍼런스, 입력, 절차, 규칙
```

**Skill** (`.claude/skills/<name>/SKILL.md`)
```yaml
---
name: skill-impl
description: >
  ...이 스킬이 만드는 것 + 언제 쓰는지...
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---
# 본문: 토큰표, 생성파일, 파일별 템플릿, 규칙, 체크리스트, gotcha
```

**Command** (`.claude/commands/<ns>/<name>.md` → `/<ns>:<name>`)
```yaml
---
description: ...
argument-hint: "<도메인> [필드/스펙...]"
allowed-tools: Agent, Bash, Read, Grep, Glob, Edit, Write, Skill, AskUserQuestion, TodoWrite
---
# 본문: 입력 $ARGUMENTS, 스펙확정, 병렬 실행, 취합/검증/보고
```

> 세션 도중 추가한 Agent 는 **재시작 후** `subagent_type` 으로 스폰 가능. Skill/Command 는 즉시 인식.

---

## 4. 산출물별 요약

### Agent-BE-Dev
- **역할**: 단일 테이블 CRUD API 한 벌 생성. 내부에서 `skill-impl` → `skill-orm` 순차.
- **검증**: `cd backend && mvn -q test-compile` → `mvn test` (매퍼 바인딩까지 확인)
- **불변 규칙(발췌)**: 패키지 `egovframework.let.<area>.<plural>`, 경로 `/api/v1/<area>/<plural>`, 응답 `ResultVO`, 테넌트 경계 `user.getTenantId()` + SQL `AND tenant_id = #{tenantId}`, 변경 API `requireAdmin`, **INSERT = `<select resultType="long"> ... RETURNING <pk>` + DAO `selectOne`**, 페이지네이션·Bean Validation 없음(검증은 `StringUtils.hasText` → `IllegalArgumentException`)

### Agent-FE-Dev
- **역할**: 단일 테이블 CRUD 화면 한 벌 생성 + `DashboardContent.tsx` 디스패치 배선. 내부에서 `skill-view`.
- **검증**: `cd frontend && npm install && npm run build`(TS 에러 0) → `npm run test`
- **불변 규칙(발췌)**: 화면은 react-router 라우트 아님(`AppRouter.tsx` 미변경) — 도달성은 백엔드 메뉴 row `menu_url` 마지막 세그먼트로 결정, 상태는 Page 소유·Panel 은 controlled + imperative handle, 3-타입 트라이어드(`Row`/`SavePayload`/`VO(unknown)`), 네트워크는 service 파일만, 모달 없음(그리드 컨텍스트 메뉴 + 지연 배치 저장), i18n·toast·axios·react-query 없음

### skill-impl
Java 7파일 생성. 토큰(`area/plural/Entity/Prefix/camel/singular/table/pk`) → `<Prefix>VO`·`<Prefix>SaveRequestVO`·`<Prefix>SearchConditionVO`·`<Prefix>DAO`·`<Prefix>Service`·`<Prefix>ServiceImpl`·`<Prefix>ApiController`. 컨트롤러 `@RequiredArgsConstructor`, ServiceImpl 명시적 생성자 + `@Transactional`(변경). 감사 컬럼은 테이블에 있고 스펙에 요구될 때만.

### skill-orm
`backend/.../mapper/let/<area>/<plural>/EgovSystem<Entity>_SQL_postgresql.xml` 생성. `namespace` = DAO 단순 클래스명, `resultMap` 명시, INSERT 는 `<select>` + `RETURNING`, UPDATE 는 `updated_at = now()`, nullable FK 는 `#{x, jdbcType=BIGINT}`, 모든 statement `tenant_id` 스코프. `#{...}` 키 ↔ ServiceImpl param map 키 ↔ SearchCondition 필드명 일치.

### skill-view
`frontend/src/pages/settings/system/<Feat>/` 4파일 + 밖 2파일(`DashboardContent.tsx` 필수, `dashboardData.tsx` 권장). Page(상태 전부)·Panel(`forwardRef` + F1Grid + 지연 배치 저장: 검증→POST→PUT→DELETE→reload, 멱등 Set + inFlight 가드)·service(`apiGet/Post/Put/Delete`, 봉투 벗긴 `result.resultList`)·types(트라이어드).

### skill-reg-menu
신규 화면을 사이드바에 노출시키는 **seed(데이터) SQL** 생성 — `tb_menu` 1건 + `tb_menu_permission` N건 + `tb_role_menu_permission` N건. id 하드코딩 없이 `code` 조인, `ON CONFLICT DO NOTHING` 멱등, `INSERT ... SELECT ... FROM tb_tenant WHERE tenant_code = ...` 관례. rollback = `tb_menu` 한 줄 삭제(FK CASCADE). `menu_url` 세그먼트가 FE 디스패치 게이트(`selectedModule.id` / `currentPageKey`)와 일치하는지 검증.

### /dev:crud-temp1
```
/dev:crud-temp1 <도메인> [필드/스펙...]
```
1. `$ARGUMENTS` + `docs/` + `db-schema.md` 로 **공유 계약** 확정(엔드포인트·저장 body 필드명·응답 봉투). 불명확한 것만 `AskUserQuestion`.
2. `Agent-BE-Dev` + `Agent-FE-Dev` **병렬** 스폰(각각 확정 스펙 전달).
3. 완료 후 계약 교차검증(`SaveRequestVO` ↔ `SavePayload`) + 최종 빌드 + 파일/엔드포인트/도달경로/남은작업 보고. 커밋은 요청 시에만.

---

## 5. 파이프라인 동작 예시 — `tb_warehouse`

**입력**: `/dev:crud-temp1 tb_warehouse 테이블 기준으로 생성하자.`

**스펙 확정** (`tb_warehouse` 컬럼 + 2개 질문):
- 도메인 `warehouses`, 패키지 `egovframework.let.system.warehouses`, 화면 `/settings/system/warehouses`
- 저장 body `{ warehouseNm, useAt }` (테이블에 `sort_order` 없음 → 제외)
- `warehouse_nm` = 유니크 키 → 생성 후 잠금(modules 방식) + 중복검사
- `created_by`/`updated_by` = 인증 사용자 id 기록 (`LoginVO.getUniqId()` = `tb_user.user_id` → `Long`)

**병렬 실행 결과**:

| | 생성/수정 | 검증 |
|---|---|---|
| BE | 신규 8 (Java 7 + 매퍼 XML 1), `backend/` 안에서만 | `mvn test` BUILD SUCCESS (65 tests, 0 실패) |
| FE | 신규 4 + 수정 2 (`DashboardContent.tsx`, `dashboardData.tsx`) | `npm run build` TS 에러 0 |

**메뉴 등록** (`skill-reg-menu` → `20260909_002_seed_warehouse_menu.sql` 실행):
- `tb_menu` `menu_id=12` `ST_WAREHOUSE` 창고관리 (환경설정 > 시스템 관리 하위, sort_order 4)
- `tb_menu_permission` 5건 / `tb_role_menu_permission` PLATFORM_ADMIN × 5건

→ `PLATFORM_ADMIN` 로그인 시 사이드바 "환경설정 > 시스템 관리 > 창고관리" → `/settings/system/warehouses` CRUD 화면 동작.

---

## 6. 재사용 방법

| 목적 | 방법 |
|---|---|
| 새 CRUD 한 벌 (BE+FE) | `/dev:crud-temp1 <도메인> [필드...]` |
| 백엔드만 | Agent-BE-Dev 스폰 또는 "~ CRUD 백엔드 만들어줘" |
| 프론트만 | Agent-FE-Dev 스폰 또는 "~ 관리 화면 만들어줘" |
| 매퍼 XML만 | `Skill("skill-orm")` |
| 만든 화면을 사이드바에 노출 | `Skill("skill-reg-menu")` → seed 스크립트 생성 후 실행 승인 |

---

## 7. 주의 / 배운 점

- **Skill 은 얇은 Agent + 두꺼운 지식**. Agent 는 "절차와 규칙", Skill 은 "템플릿과 gotcha". 레퍼런스 코드가 항상 우선(스킬 본문에도 명시).
- **공유 계약을 Command 가 고정**해야 BE/FE 병렬 산출물이 어긋나지 않음 (엔드포인트·필드명·응답 봉투).
- 세션 중 추가한 **Agent 는 재시작 후** 스폰 가능. Skill/Command 는 즉시.
- 서브에이전트 최종 보고가 길면 전송 중 잘림 → **파일로 쓰게** 지시하고 경로만 회신받는 편이 안전.
- DB write(스키마·seed)는 MCP `postgres`(읽기 전용)로 불가 → 실행은 매번 사용자 승인 후 별도 경로.
- 레퍼런스와 실제 테이블이 다르면(`tb_warehouse` 에 `sort_order` 없음, `created_by`/`updated_by` 있음) 스킬 템플릿을 그대로 쓰지 말고 차이를 사용자에게 확인.
