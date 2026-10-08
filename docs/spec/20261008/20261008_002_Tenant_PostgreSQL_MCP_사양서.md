# Tenant PostgreSQL 읽기 전용 MCP 상세 사양서

## 대상 데이터베이스

- PostgreSQL 서버: 기존 `s-erp-postgresql-readonly`와 동일
- 데이터베이스: `tenant_1212123312`
- 조회 범위: 기본 `public` 스키마의 일반 테이블 이름만

## MCP 서버 설정

workspace `.mcp.json`의 `mcpServers` 객체에 다음 이름으로 별도 항목을 등록한다.

- 서버 이름: `s-erp-postgresql-readonly-tenant-1212123312`
- 유형: `local`
- 실행 명령: `node`
- 실행 파일: 기존 `tools/mcp-postgresql-readonly/dist/index.js`
- 환경변수: 서버 프로세스에만 `S_ERP_DB_NAME=tenant_1212123312`
- 도구: 기존 서버가 제공하는 도구를 그대로 사용

`tools/mcp-postgresql-readonly/src/config.ts`는 프로세스 환경변수 값을 로컬 `.env` 값보다 우선하므로, 새 MCP 프로세스는 기존 로컬 환경 파일의 호스트, 포트, 사용자, 비밀번호, SSL 값을 상속하면서 DB 이름만 분리한다. 실제 자격 증명은 설정이나 문서에 기록하지 않는다.

## 조회 및 검증

- `list_tables`를 인수 없이 호출해 기본 `public` 스키마 테이블 목록을 확인한다.
- `describe_table`과 `query_readonly`는 호출하지 않는다.
- 설정 검증은 JSON 파싱 및 두 서버 이름 확인으로 수행한다.
- DB 접속 결과와 테이블 이름만 결과 문서에 남긴다.
- 실패 시 시작, 연결, 권한, 프로토콜 중 실패 지점을 구분하되 민감한 오류 값은 남기지 않는다.
