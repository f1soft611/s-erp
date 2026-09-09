# PostgreSQL 읽기 전용 MCP 서버 구성 계획서

## 근거 문서

- 작업지시서: [20260909*002_PostgreSQL*읽기전용*MCP*서버*구성*작업지시서.md](../../directions/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_작업지시서.md)

## 구현 범위

1. `tools/mcp-postgresql-readonly`에 TypeScript stdio MCP 서버와 패키지 설정을 생성한다.
2. PostgreSQL 드라이버 `pg`와 MCP TypeScript SDK를 사용해 환경변수 기반 연결을 구현한다.
3. `list_tables`, `describe_table`, `query_readonly` 도구를 구현한다.
4. SQL 검증 모듈을 분리하고 단일 읽기 전용 문장 외의 모든 SQL을 차단한다.
5. Vitest로 SQL 검증 규칙과 도구 동작을 검증한다.
6. `.env.example`, `.vscode/mcp.json`, 프로젝트 AI 지침을 갱신한다.
7. 구현 결과 및 MCP Inspector 또는 자동 테스트 결과를 `docs/result/20260909`에 기록한다.

## 제외 범위

- S-ERP 프론트엔드 및 백엔드 애플리케이션 코드 변경
- PostgreSQL 스키마 및 데이터 변경
- 쓰기, DDL, 트랜잭션 제어 MCP 도구
- 비밀번호 또는 인증 토큰의 저장소 기록

## 검증 계획

- `npm test`로 SQL 허용/거부 케이스를 검증한다.
- `npm run build`로 TypeScript 컴파일을 검증한다.
- 로컬에 비밀번호가 주입된 경우 MCP Inspector 또는 stdio 클라이언트로 메타데이터 및 제한된 SELECT를 확인한다.
