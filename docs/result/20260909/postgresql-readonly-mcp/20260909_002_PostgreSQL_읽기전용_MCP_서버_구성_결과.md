# PostgreSQL 읽기 전용 MCP 서버 구성 결과

## 작업 결과

- `tools/mcp-postgresql-readonly`에 TypeScript 기반 stdio MCP 서버를 추가했다.
- `.vscode/mcp.json`에 `s-erp-postgresql-readonly` 서버를 등록했다.
- 서버는 `list_tables`, `describe_table`, `query_readonly` 도구를 제공한다.
- `query_readonly`는 단일 `SELECT` 또는 `WITH ... SELECT`만 허용하고, 주석, 세미콜론, DML, DDL, DCL 및 데이터 변경 CTE를 거부한다.
- 데이터베이스 세션에 `default_transaction_read_only = on`과 5초 statement timeout을 적용하며, 반환 행은 최대 1,000건으로 제한한다.
- 접속값은 `S_ERP_DB_*` 환경변수 또는 서버 시작 디렉터리의 로컬 `.env`에서 읽고, 이미 설정된 환경변수는 `.env` 값으로 덮어쓰지 않는다.
- `.env.example`에는 비밀번호를 기록하지 않았다.

## 실행 절차

1. `tools/mcp-postgresql-readonly/.env.example`을 참고해 같은 디렉터리의 로컬 `.env`에 `S_ERP_DB_PASSWORD`를 설정한다.
2. `tools/mcp-postgresql-readonly`에서 `npm install`과 `npm run build`를 실행한다.
3. VS Code MCP 서버 목록에서 `s-erp-postgresql-readonly`를 시작한다.

## 검증 결과

| 항목                                                        | 결과                            |
| ----------------------------------------------------------- | ------------------------------- |
| SQL 허용/차단, 데이터베이스 서비스, `.env` 로딩 단위 테스트 | 통과: 3개 파일, 31개 테스트     |
| TypeScript 빌드                                             | 통과                            |
| `git diff --check`                                          | 통과                            |
| MCP 관련 파일의 실제 비밀번호 문자열 검사                   | 일치 항목 없음                  |
| MCP `list_tables` 실제 원격 데이터베이스 호출               | 통과: `public` 테이블 13개 반환 |

## 스크린샷

이 작업은 화면을 제공하지 않는 stdio MCP 서버 구성이다. 비밀값을 노출하지 않기 위해 MCP Inspector 또는 VS Code 연결 화면 캡처는 생성하지 않았다.

## 보안 참고

기존 백엔드 설정 파일에 포함된 비밀값은 이번 MCP 구성 작업의 변경 범위 밖이다. 해당 값의 제거 및 환경변수 전환은 별도 보안 개선 작업으로 관리해야 한다.
