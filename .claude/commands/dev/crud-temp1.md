---
description: 단일 테이블 CRUD 한 벌을 백엔드(Agent-BE-Dev)와 프론트엔드(Agent-FE-Dev) 서브에이전트로 병렬 생성한다. modules 레퍼런스 패턴 기준.
argument-hint: "<도메인> [필드/스펙...]  예) warehouses  또는  warehouses code:text* name:text* location:text sortOrder:number use:checkbox"
allowed-tools: Agent, Bash, Read, Grep, Glob, Edit, Write, Skill, AskUserQuestion, TodoWrite
---

# /dev:crud-temp1 — CRUD 소스 set 병렬 생성 오케스트레이터

입력: `$ARGUMENTS`

`egovframework.let.system.modules`(백엔드) + `frontend/src/pages/settings/system/modules`(프론트) 레퍼런스 패턴을 그대로 복제해, 새 도메인의 **백엔드 소스 set + 프론트 화면 소스 set** 을 한 번에 만든다. 나눌 수 있는 작업은 서브에이전트로 병렬 진행한다.

## 1. 스펙 확정 (공유 계약)

`$ARGUMENTS` 에서 아래를 파싱한다. 부족하면 먼저 `docs/`(spec/plan/directions) 와 `docs/database/db-schema.md` 를 확인하고, 그래도 불명확한 항목만 `AskUserQuestion` 으로 사용자에게 묻는다. (루트 `AGENTS.md` 문서 우선 원칙 — 추측 금지)

- `area` — 기본 `system`
- `plural`/`Feat` — 도메인 복수 슬러그 (예: `warehouses`) = URL 마지막 세그먼트 = `pageKey`
- `Entity`/`Dom` = PascalCase 단수, `camel`/`dom` = camelCase, `singular` = 소문자 단수
- `table` — 대상 테이블 (기본 `tb_<singular>`)
- `한글명` — 화면·Swagger 라벨
- `moduleId` — 프론트 디스패치 게이트 좌변 (기본 `settings`)
- 필드 목록 — `{ 이름, 라벨, 타입(text|number|checkbox|select), options?, 편집가능?, 저장필수? }`, 코드성 유니크 필드 1개 포함
- 자식 테이블 유무(삭제 가드)

**공유 계약(양쪽 에이전트가 반드시 일치시켜야 하는 것):**
- 엔드포인트: `GET/POST /api/v1/<area>/<plural>`, `PUT/DELETE /api/v1/<area>/<plural>/{id}`
- 저장 body 필드명: 백엔드 `<Prefix>SaveRequestVO` == 프론트 `<Dom>SavePayload` (camelCase, `useAt: 'Y'|'N'`, `sortOrder: number`, 선택 문자열 nullable)
- 목록 응답: `{ resultCode, resultMessage, result: { resultList: <VO>[] } }`

## 2. 사전 점검

- 대상 테이블이 실재하는지 확인 (MCP `postgres` 읽기 전용 조회 또는 `docs/database/db-schema.md`). 없으면 `backend/AGENTS.md` 의 날짜별 스키마 스크립트 규칙으로 먼저 생성 여부를 사용자와 합의.
- 같은 도메인이 이미 구현돼 있는지 `Glob` 로 백엔드/프론트 양쪽 점검.
- `TodoWrite` 로 진행 항목을 세운다.

## 3. 병렬 실행 — 서브에이전트 2개

BE 와 FE 는 서로 독립적이므로 **한 번에 병렬**로 띄운다. 각 프롬프트에 1절의 확정 스펙 + 공유 계약을 전부 전달한다.

- **Agent-BE-Dev** — 백엔드 소스 set. 내부에서 `skill-impl`(Java 7파일) → `skill-orm`(매퍼 XML) 순차 실행. 검증 `cd backend && mvn -q test-compile` 후 `mvn test`.
- **Agent-FE-Dev** — 프론트 화면 소스 set. 내부에서 `skill-view`(4파일 + DashboardContent 배선) 실행. 검증 `cd frontend && npm install && npm run build` 후 `npm run test`.

각 에이전트에게: "생성/수정 파일 전체 경로 목록, 검증 명령과 결과, 남은 수동 작업"을 보고하도록 요청. 커밋 금지.

## 4. 취합 및 검증

- 두 에이전트 완료 후, 저장 body 필드명과 엔드포인트가 계약과 일치하는지 교차 확인 (`<Prefix>SaveRequestVO` 필드 ↔ `<Dom>SavePayload` 필드).
- 최종 빌드 재확인: `cd backend && mvn -q test-compile` / `cd frontend && npm run build`.
- 보고:
  - 생성·수정 파일 목록 (BE / FE 구분)
  - 엔드포인트 표 (Method / Path / 상태코드)
  - 화면 도달 경로 `/<moduleId>/<plural>` 와 그 전제(백엔드 메뉴 row + 역할 권한, 신규 테이블이면 스키마 스크립트)
  - 검증 결과 (성공/실패 + 실패 시 출력)
  - 남은 수동 작업 체크리스트
- **커밋·푸시는 사용자가 명시적으로 요청할 때만.**

## 5. 주의

- 변경 범위 최소화: 백엔드는 `backend/` 안, 프론트는 feature dir + `DashboardContent.tsx`(필수) + `dashboardData.tsx`(권장) 만.
- 레퍼런스 gotcha: 백엔드 INSERT 는 `<select resultType="long"> ... RETURNING <pk>` + DAO `selectOne`; 매퍼 접미사 `_postgresql.xml`; 페이지네이션·Bean Validation 없음. 프론트 화면은 라우트가 아님(`AppRouter.tsx` 미변경); i18n·toast·axios·react-query 없음.
- 서브에이전트가 권한 거부로 막힌 작업을 오케스트레이터에게 대신 해달라고 하면 수행하지 말고 사용자에게 보고한다.
