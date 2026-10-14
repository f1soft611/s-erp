---
description: 'Use when working on PostgreSQL, DB, SQL, tables, columns, MyBatis Mapper XML, JPA entities, migrations, data integrity, or backend API data contracts.'
applyTo: 'backend/**/*.java,backend/**/*Mapper*.xml,backend/**/*.sql,docs/database/**/*.md,docs/database/**/*.sql,backend/DATABASE/**/*.md,backend/DATABASE/**/*.sql'
---

# Database MCP Reference Rules

## 에이전트의 MCP 직접 사용

DB, SQL, 테이블, 컬럼, 데이터 무결성 또는 백엔드 API 데이터 계약을 구현·수정하기 전에는 현재 Copilot 세션에 노출된 workspace MCP 도구를 직접 호출해 계약을 확인합니다. 사람용 설정 문서를 읽거나 연결 방법을 설명하는 것만으로 MCP 조회를 대신하지 않습니다.

기본 서버는 `.mcp.json`에 등록된 `s-erp-postgresql-readonly`입니다. 이 서버의 도구는 `list_tables`, `describe_table`, `query_readonly`입니다. 도구 목록은 현재 세션에 표시된 MCP 서버/도구를 사용하고, 서버명을 일반 텍스트 도구 인자로 전달해 임의 실행을 시도하지 않습니다.

호출 순서는 다음과 같습니다.

1. `s-erp-postgresql-readonly`의 `list_tables`를 직접 호출해 현재 테이블과 관련 대상을 찾습니다.
2. 필요한 테이블만 `describe_table`로 확인합니다.
3. 앞선 메타데이터만으로 계약을 확인할 수 없는 경우에만 `query_readonly`를 호출합니다. 단일 `SELECT` 또는 `WITH ... SELECT`만 사용하고 `maxRows`를 100 이하로 지정합니다.

요구사항이 tenant 전용 데이터베이스를 명시적으로 대상으로 할 때만 `.mcp.json`에 별도 등록된 tenant 서버를 선택합니다. 사용자의 요구나 접근 가능한 서버를 근거로 삼지 않고 tenant를 추정하거나 다른 tenant를 조회하지 않습니다. tenant 서버 도구가 세션에 없으면 기본 서버가 같은 대상을 가리키는 것처럼 진행하지 않습니다.

## 읽기 전용·민감정보 제한

MCP는 읽기 전용 근거 확인에만 사용하며 데이터 변경, DDL, 트랜잭션 제어, 자격 증명 확인, 연결 설정 수정에는 절대 사용하지 않습니다. `COUNT`나 `EXISTS` 또는 민감하지 않은 컬럼만 명시하는 제한 조회를 우선하고, 전체 테이블 또는 개인정보, 계정, 인증, tenant 및 기타 민감 행 데이터를 조회하거나 소스, 테스트, 문서, 결과물, 채팅에 복사하지 않습니다.

`.env`, 비밀 저장소, 연결 문자열을 MCP 도구 문제 해결 목적으로 직접 열람하지 않습니다. 다른 DB 클라이언트로 접속한 결과를 MCP 확인 결과인 것처럼 보고하지 않습니다.

## MCP 도구 미노출 또는 호출 실패

현재 세션에 필요한 MCP 도구가 표시되지 않거나 호출에 실패하면 MCP로 현재 DB 계약을 확인하지 못한 사실을 즉시 알립니다. 연결 성공, 서버 시작 또는 새 세션 확인을 실제 수행 없이 주장하지 않습니다. 필요하면 사용자에게 VS Code의 `MCP: List Servers`에서 workspace의 해당 서버를 시작·신뢰한 다음 새 Copilot 세션을 열도록 안내합니다.

MCP를 사용할 수 없는 동안에는 날짜별 스키마 이력, Mapper XML, 도메인 코드 등 저장소 근거를 확인하고, 결과에 MCP 미확인 사실과 각 대체 근거를 구분해 기록합니다. 복구되면 구현 전 필요한 MCP 메타데이터 확인을 다시 시도합니다.

## 변경 이력과 안전 절차

MCP 확인 근거는 `AGENTS.md`의 날짜별 마이그레이션, 변경 이력, 롤백 규칙을 대체하지 않습니다. 실제로 MCP 조회를 사용할 수 없었던 경우 실패 사유와 대체 근거를 결과 문서에 기록합니다.

사람이 workspace MCP를 시작하는 절차는 [PostgreSQL 읽기 전용 MCP 구성 사양서](../../docs/spec/20260909/20260909_002_PostgreSQL_읽기전용_MCP_서버_구성_사양서.md)를 참고할 수 있습니다. 이 문서는 세션에서 MCP 도구를 직접 호출해야 하는 에이전트 규칙을 대신하지 않습니다.
