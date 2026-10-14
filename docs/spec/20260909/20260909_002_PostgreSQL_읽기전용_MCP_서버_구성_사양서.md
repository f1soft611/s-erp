# 상세 사양서

## 산출물

- 서버 위치: `tools/mcp-postgresql-readonly`
- 서버 유형: VS Code가 시작하는 stdio Model Context Protocol 서버
- 언어: TypeScript
- 데이터베이스 드라이버: `pg`
- MCP SDK: `@modelcontextprotocol/sdk`
- VS Code workspace 등록: 저장소 루트 `.mcp.json`
- 환경변수 예시: `tools/mcp-postgresql-readonly/.env.example`

## 연결 방법

### 1. 로컬 접속 환경 준비

VS Code에서 S-ERP 저장소 루트를 workspace로 연다. `tools/mcp-postgresql-readonly/.env.example`을 참고해 같은 디렉터리에 로컬 `.env`를 준비하고, 실제 접속값은 개발 환경에서만 설정한다. `.env`는 저장소에 커밋하거나 문서·채팅에 값을 복사하지 않는다.

서버가 사용하는 환경변수 이름은 `S_ERP_DB_HOST`, `S_ERP_DB_PORT`, `S_ERP_DB_NAME`, `S_ERP_DB_USER`, `S_ERP_DB_PASSWORD`이며, `S_ERP_DB_SSL`은 선택값이다. 구체적인 값은 로컬 환경 설정으로 관리한다. 패키지는 VS Code가 다른 현재 디렉터리에서 시작해도 패키지 디렉터리의 `.env` 파일을 읽는다. 이미 프로세스 환경변수에 설정된 값은 `.env`의 값으로 덮어쓰지 않는다.

`net.sf.log4jdbc.DriverSpy`는 Spring 애플리케이션의 JDBC SQL 로깅용 드라이버이므로 MCP 서버에서는 사용하지 않는다. MCP 서버는 표준 PostgreSQL 클라이언트를 사용한다.

### 2. MCP 서버 설치 및 빌드

PowerShell 터미널에서 MCP 패키지 디렉터리로 이동하고 의존성을 설치한 다음 서버를 빌드한다.

```powershell
Set-Location .\tools\mcp-postgresql-readonly
npm install
npm run build
```

빌드가 끝나면 저장소 루트의 `.mcp.json`에 등록된 workspace 서버가 생성된 `dist/index.js`를 실행할 수 있다. 루트 `.mcp.json`은 stdio 전송 유형을 사용하며, `s-erp-postgresql-readonly`는 기본 읽기 전용 서버다. 별도 tenant 데이터베이스가 필요한 경우에만 workspace에 등록된 tenant 전용 항목을 선택한다. tenant 전용 항목은 해당 서버 등록에 포함된 데이터베이스 이름 override를 사용한다. 저장소 위치를 옮겼거나 다른 checkout에서 작업하는 경우, 서버 등록의 실행 경로가 해당 checkout의 빌드 산출물을 가리키는지 확인한다.

### 3. VS Code에서 서버 시작

1. MCP 패키지 설치와 빌드가 완료되었는지 확인한다.
2. VS Code 명령 팔레트에서 `MCP: List Servers`를 실행한다.
3. 사용할 workspace 서버를 선택해 시작하고, 신뢰 확인이 표시되면 내용을 확인한 뒤 신뢰한다.
4. 새 Copilot 세션을 열어 도구 목록에 `list_tables`, `describe_table`, `query_readonly`가 보이는지 확인한다.

이미 열려 있던 Copilot 세션은 MCP 서버를 다시 시작해도 이전 도구 목록을 유지할 수 있다. 설정 또는 빌드 변경 후에는 서버를 다시 시작·신뢰하고 새 세션에서 확인한다.

### 4. 연결 문제 점검

| 증상 | 확인 방법 |
| --- | --- |
| MCP 서버 목록에 항목이 없음 | VS Code에서 저장소 루트를 열었는지와 루트 `.mcp.json`에 workspace 서버가 등록되어 있는지 확인한다. |
| 서버가 시작되지 않음 | `tools/mcp-postgresql-readonly`에서 `npm install`, `npm run build`를 다시 확인하고, 루트 `.mcp.json`의 실행 경로가 현재 checkout의 `tools/mcp-postgresql-readonly/dist/index.js`를 가리키는지 확인한다. 로컬 `.env` 또는 VS Code 프로세스에 필수 환경변수가 설정되어 있는지도 확인한다. 실제 값을 채팅이나 문서로 보내지 않는다. |
| 서버는 시작됐으나 도구가 보이지 않음 | 서버를 다시 시작하고 신뢰한 뒤 새 Copilot 세션에서 확인한다. |
| 연결 또는 쿼리 오류 | 자격 증명을 공유하지 말고, 로컬 환경변수와 DB 네트워크 접근 상태를 담당 운영자와 점검한다. |

## MCP 도구

### `list_tables`

- 입력: 선택적 `schema` 문자열, 기본값 `public`
- 동작: 지정 스키마의 일반 테이블 이름과 설명을 반환한다.
- 제한: 시스템 스키마는 기본 조회 대상에서 제외한다.

### `describe_table`

- 입력: `tableName` 문자열, 선택적 `schema` 문자열
- 동작: 식별자가 검증된 테이블의 컬럼명, 타입, NULL 허용 여부, 기본값을 반환한다.
- 제한: 식별자는 영문자, 숫자, 밑줄만 허용하며 SQL 문자열 결합에는 안전한 식별자 인용을 사용한다.

### `query_readonly`

- 입력: `sql` 문자열, 선택적 `maxRows` 정수(기본 100, 최대 1,000)
- 동작: 검증을 통과한 SQL을 읽기 전용 세션에서 실행하고 행 결과를 반환한다.
- 허용: `SELECT ...`, `WITH ... SELECT ...` 단일 문장
- 거부: 빈 SQL, 세미콜론, SQL 주석, `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, `DO`, 트랜잭션 제어문 및 그 밖의 비조회 시작 구문
- 보호: 실행 연결은 `default_transaction_read_only = on`, 쿼리 시간 제한, 행 반환 상한을 적용한다.

## 오류 처리

- 필수 환경변수가 없으면 서버 시작을 중단하고 누락된 변수명만 오류로 출력한다.
- 도구 입력이 유효하지 않거나 SQL 정책을 위반하면 PostgreSQL로 전송하지 않고 정책 오류를 반환한다.
- 데이터베이스 연결 또는 실행 오류는 비밀번호와 접속 문자열을 포함하지 않는 일반 오류로 반환한다.

## 검증 기준

- `SELECT 1`과 CTE 기반 조회를 허용하는 단위 테스트가 통과한다.
- 쓰기, DDL, 주석, 세미콜론 및 복수 문장 입력을 차단하는 단위 테스트가 통과한다.
- TypeScript 빌드가 통과한다.
- 루트 `.mcp.json`이 stdio workspace 서버를 등록하고, MCP 서버 실행 파일이 빌드 산출물과 일치한다.
- 실제 데이터베이스 접속 검증은 로컬 비밀번호가 설정된 환경에서만 수행한다.
