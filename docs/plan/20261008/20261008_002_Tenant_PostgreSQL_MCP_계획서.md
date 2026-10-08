# Tenant PostgreSQL Read-Only MCP 구성 구현 계획

> **For agentic workers:** 작업은 체크박스 순서로 수행하고, 설정 검증과 실제 읽기 전용 MCP 호출을 모두 완료한다.

**목표:** 기존 S-ERP PostgreSQL MCP 접속값을 재사용해 `tenant_1212123312` 전용 읽기 전용 MCP 서버를 추가하고 테이블 이름을 확인한다.

**구조:** 기존 `.mcp.json`과 MCP 서버 구현은 유지한다. 새 서버 항목은 기존 실행 파일을 별도 프로세스로 시작하고, 프로세스 환경변수 `S_ERP_DB_NAME`만 tenant DB 이름으로 덮어쓴다. 기존 `tools/mcp-postgresql-readonly/.env`가 나머지 접속값을 제공한다.

**기술 스택:** Copilot MCP workspace config (JSON), Node.js, 기존 `@modelcontextprotocol/sdk` PostgreSQL read-only MCP 서버.

---

### 작업 1: 날짜별 지시서 및 상세 사양서 작성

**파일:**
- 생성: `docs/directions/20261008/20261008_002_Tenant_PostgreSQL_MCP_작업지시서.md`
- 생성: `docs/spec/20261008/20261008_002_Tenant_PostgreSQL_MCP_사양서.md`

- [x] **1단계: 작업지시서에 범위와 완료 기준 기록**

  목적은 workspace `.mcp.json`에 tenant 전용 서버를 추가하고 `list_tables` 결과에서 테이블 이름만 확인하는 것이다. 사용자 지시에서 명시된 동일 PostgreSQL 서버와 `tenant_1212123312`만 범위에 포함한다. DB 행 데이터, 스키마 상세, 자격 증명 출력은 금지한다.

- [x] **2단계: 사양서에 설정 계약 기록**

  새 서버 이름은 `s-erp-postgresql-readonly-tenant-1212123312`로 한다. 기존 `node` 실행 파일과 인수를 재사용하고, 새 서버 프로세스에만 `S_ERP_DB_NAME=tenant_1212123312`를 설정한다. 비밀번호나 다른 자격 증명을 새 설정에 복사하지 않는다.

### 작업 2: Workspace MCP 서버 추가

**파일:**
- 수정: `.mcp.json`

- [x] **1단계: 새 서버 항목 추가**

  기존 서버 항목은 변경하지 않고 `mcpServers`에 다음 항목을 추가한다.

  ```json
  "s-erp-postgresql-readonly-tenant-1212123312": {
    "type": "local",
    "command": "node",
    "args": ["D:/f1soft/dev/react/S-ERP/tools/mcp-postgresql-readonly/dist/index.js"],
    "env": {
      "S_ERP_DB_NAME": "tenant_1212123312"
    },
    "tools": ["*"]
  }
  ```

- [x] **2단계: JSON 및 기존 설정 보존 확인**

  Run: `Get-Content .mcp.json -Raw | ConvertFrom-Json`

  Expected: JSON 파싱 성공. `mcpServers` 아래에 원래 `s-erp-postgresql-readonly`와 새 tenant 서버가 모두 존재하며, 두 항목의 `S_ERP_DB_NAME` 설정은 기존 서버에 추가되지 않는다.

### 작업 3: tenant MCP 연결 및 테이블 목록 검증

**파일:**
- 생성: `docs/result/20261008/tenant-postgresql-mcp/20261008_002_Tenant_PostgreSQL_MCP_결과.md`

- [x] **1단계: 기존 MCP 서버 프로세스를 환경변수만 바꿔 실행**

  기존 `.env`를 로드하는 현재 MCP 프로세스를 별도 자식 프로세스로 시작하고 자식 프로세스에만 `S_ERP_DB_NAME=tenant_1212123312`를 덮어쓴다. 자격 증명 값이나 연결 문자열은 터미널에 출력하지 않는다.

- [x] **2단계: `list_tables`만 호출**

  스키마 인수는 생략해 기본 `public`만 조회한다. 도구 결과의 테이블 이름만 확인하며, `describe_table`과 `query_readonly`는 호출하지 않는다.

- [x] **3단계: 실패 시 원인 구분**

  시작 환경변수 누락, PostgreSQL 연결 거부, 데이터베이스 권한 오류, MCP 프로토콜 오류를 구분해 확인한다. 비밀값 또는 전체 연결 오류 컨텍스트를 결과 문서나 대화에 복사하지 않는다.

- [x] **4단계: 결과 문서에 검증 증거 기록**

  연결 성공 여부, `list_tables` 실행 여부, 반환된 테이블 이름만 기록한다. 실패하면 민감정보 없이 실패 단계와 확인 근거를 기록한다. UI 변경이 없으므로 스크린샷은 만들지 않는다.
