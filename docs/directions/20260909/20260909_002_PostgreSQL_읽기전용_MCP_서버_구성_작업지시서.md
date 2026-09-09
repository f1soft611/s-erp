# 작업지시서

## 작업명

PostgreSQL 읽기 전용 MCP 서버 구성

## 목적

VS Code의 AI 에이전트가 S-ERP 중앙 PostgreSQL 데이터베이스의 스키마와 데이터를 안전하게 조회할 수 있도록 로컬 stdio MCP 서버를 구성한다.

## 작업 내용

- TypeScript 기반 MCP 서버를 `tools/mcp-postgresql-readonly`에 추가한다.
- 테이블 목록, 테이블 정의, 단일 읽기 전용 SQL 조회 도구를 제공한다.
- `SELECT` 또는 `WITH ... SELECT` 단일 문장만 허용하고 DML, DDL, 트랜잭션 제어문, 복수 문장은 거부한다.
- 데이터베이스 접속값은 환경변수로만 읽고, 비밀값은 Git에 포함하지 않는다.
- `.vscode/mcp.json`에 VS Code stdio MCP 서버를 등록한다.

## 완료 기준

- 비밀번호 없이도 예시 환경 설정을 제공하고 실제 비밀번호는 로컬 환경변수로 주입할 수 있다.
- 쓰기 또는 DDL SQL이 MCP 도구에서 거부된다.
- 유효한 읽기 전용 SQL 실행과 메타데이터 조회를 자동 테스트로 검증한다.
- 계획서, 상세 사양서, 결과 문서에 작업 이력이 남는다.
