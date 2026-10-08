# Tenant PostgreSQL 읽기 전용 MCP 추가 작업지시서

## 작업 목적

기존 S-ERP PostgreSQL 읽기 전용 MCP 서버 접속 정보를 재사용하여 `tenant_1212123312` 데이터베이스를 조회할 별도 workspace MCP 서버를 추가하고, 해당 데이터베이스의 테이블 목록을 확인한다.

## 작업 범위

- `.mcp.json`에 `s-erp-postgresql-readonly-tenant-1212123312` 서버를 추가한다.
- 기존 서버 실행 파일과 로컬 `tools/mcp-postgresql-readonly/.env`를 재사용한다.
- 새 서버 프로세스에만 `S_ERP_DB_NAME=tenant_1212123312`를 설정한다.
- 새 MCP 서버의 `list_tables`를 기본 `public` 스키마에 호출한다.

## 제한 사항

- 기존 `s-erp-postgresql-readonly` 설정과 로컬 `.env`를 변경하지 않는다.
- 비밀번호, 연결 문자열 또는 다른 자격 증명을 MCP 설정/문서/채팅에 복사하지 않는다.
- 테이블 행, 개인정보, 계정 데이터 및 테이블 상세 구조는 조회하지 않는다.
- DB 쓰기, DDL 또는 스키마 변경을 수행하지 않는다.

## 완료 기준

1. `.mcp.json`은 유효한 JSON이며 원래 서버와 tenant 서버가 별도 항목으로 존재한다.
2. tenant 서버 프로세스만 `tenant_1212123312` DB 이름으로 실행된다.
3. `list_tables` 연결 성공 여부와 반환된 테이블 이름만 결과 문서에 기록한다.
4. 연결에 실패하면 민감정보를 제외하고 실패 단계를 결과 문서에 기록한다.
