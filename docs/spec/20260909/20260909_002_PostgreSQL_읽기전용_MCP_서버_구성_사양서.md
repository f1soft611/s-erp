# 상세 사양서

## 산출물

- 서버 위치: `tools/mcp-postgresql-readonly`
- 서버 유형: VS Code가 시작하는 stdio Model Context Protocol 서버
- 언어: TypeScript
- 데이터베이스 드라이버: `pg`
- MCP SDK: `@modelcontextprotocol/sdk`
- VS Code 설정: `.vscode/mcp.json`
- 환경변수 예시: `tools/mcp-postgresql-readonly/.env.example`

## 접속 설정

서버는 다음 환경변수만 사용한다. 실제 비밀번호는 로컬 `.env` 또는 VS Code 프로세스 환경변수로 주입하며, 저장소에 기록하지 않는다.

| 변수                | 값                           |
| ------------------- | ---------------------------- |
| `S_ERP_DB_HOST`     | `218.155.74.34`              |
| `S_ERP_DB_PORT`     | `5433`                       |
| `S_ERP_DB_NAME`     | `s-erp_central`              |
| `S_ERP_DB_USER`     | `postgres`                   |
| `S_ERP_DB_PASSWORD` | 로컬에서만 설정하는 비밀번호 |
| `S_ERP_DB_SSL`      | 선택값, 기본 `false`         |

`net.sf.log4jdbc.DriverSpy`는 Spring 애플리케이션의 JDBC SQL 로깅용 드라이버이므로 MCP 서버에서는 사용하지 않는다. MCP 서버는 표준 PostgreSQL 클라이언트를 사용한다.

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
- `.vscode/mcp.json`이 개발 모드 실행 명령과 환경변수 이름을 참조한다.
- 실제 데이터베이스 접속 검증은 로컬 비밀번호가 설정된 환경에서만 수행한다.
