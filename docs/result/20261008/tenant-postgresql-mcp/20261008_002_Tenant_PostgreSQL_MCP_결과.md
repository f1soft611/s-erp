# Tenant PostgreSQL 읽기 전용 MCP 추가 결과

## 결과

- workspace `.mcp.json`에 `s-erp-postgresql-readonly-tenant-1212123312`를 추가했다.
- 기존 S-ERP MCP 항목은 그대로 유지했다.
- 새 서버 프로세스에만 `S_ERP_DB_NAME=tenant_1212123312`를 설정했다. 나머지 접속 설정은 기존 로컬 `.env`에서 읽혔으며 자격 증명은 출력하거나 기록하지 않았다.
- workspace MCP JSON 파싱과 두 서버 항목 확인에 성공했다.
- MCP stdio 클라이언트를 통해 tenant 서버의 `list_tables` 호출에 성공했다. 기본 `public` 스키마에서 테이블 이름만 출력했으며 테이블 행이나 컬럼 상세는 조회하지 않았다.

## 테이블 목록

```text
ids
ids2
tb_department
tb_document_attachment
tb_document_attachment_audit_log
tb_document_attachment_upload_session
tb_drafting_work_category
tb_drafting_work_category_authority
tb_drafting_work_category_group
tb_electronic_approval_history_like
tb_electronic_approval_history_main
tb_electronic_approval_line_info
tb_electronic_approval_main
tb_electronic_approval_open_info
tb_login_account
tb_login_account_role
tb_login_history
tb_menu
tb_permission
tb_role
tb_role_menu_permission
tb_scheduler_history
tb_schedulerconfig
tb_tenant
tb_user
```

## 검증 범위

- MCP 설정 JSON 파싱: 통과
- 원래 서버 및 tenant 서버 설정 확인: 통과
- tenant `list_tables` 실제 호출: 통과, 테이블 25개
- 데이터 행, 컬럼 설명, 자격 증명 조회: 수행하지 않음
- UI 변경 없음: 스크린샷 해당 없음
