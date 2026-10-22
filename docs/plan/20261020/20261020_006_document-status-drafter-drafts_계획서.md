# 20261020_006 문서현황 기안자 역할 및 임시저장 표시 계획서

## 문제 및 원인

- 목록의 `myParticipantType`은 결재선 참여유형만 집계한다. 기안자가 결재선에도 들어 있으면 `APPROVAL`이 반환되어 화면에서 `결재`로 표시된다.
- 문서현황 기본 검색은 `submitted_at` 기간을 전송한다. 임시저장 문서는 `submitted_at`이 NULL이므로 기본 기간 검색에서 제외된다.
- DB 메타데이터상 `tb_electronic_approval_main`에는 `drafter_id`, `document_status`, `created_at`, `submitted_at`이 있으며 스키마 변경 없이 해결 가능하다.

## 구현 순서

1. **테스트 우선**
   - UI 역할 옵션에 `DRAFTER`/`기안`이 포함되는지 검증한다.
   - 목록 및 건수 SQL의 기안자 역할 조건, 임시저장 작성일 범위 fallback, 기존 개인 임시저장 접근 조건을 검증한다.
   - 서비스가 `DRAFTER` 역할을 허용하는지 확인한다.
2. **백엔드**
   - 목록 응답에서 현재 사용자가 기안자이면 결재선 역할보다 `DRAFTER`를 우선 반환한다.
   - 역할 검색 `DRAFTER`는 결재선 유형이 아닌 문서의 `drafter_id`로 필터링한다.
   - 결재신청일 범위 필터는 일반 문서의 `submitted_at`, 임시저장 문서의 `created_at`을 비교하도록 목록/건수 공통 SQL을 조정한다.
   - 기존 documentReadAccess와 tenant 조건을 유지해 타인의 임시저장은 노출되지 않게 한다.
3. **프런트엔드**
   - 상세검색 역할 옵션 및 타입에 `DRAFTER`를 추가한다.
   - F1-Grid 문서에 기안자 역할 및 임시저장 날짜 기준을 명시한다.
4. **문서 및 검증**
   - 결과 문서에 원인, 변경, 타깃 테스트 및 제한사항을 기록한다.
   - 프런트엔드 관련 Vitest 및 백엔드 관련 Maven 테스트를 수행한다.

## 영향 범위

- `frontend/src/pages/groupware/documents/status/components/DocumentStatusGrid.tsx`
- `frontend/src/pages/groupware/documents/status/types/documentStatus.types.ts`
- `frontend/tests/document-status-page.test.tsx`
- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`
- 관련 문서현황 작업 문서 및 F1-Grid 안내

## DB 및 권한

- DB MCP에서 `list_tables` 및 두 전자결재 테이블의 메타데이터를 확인했다. 행 데이터는 조회하지 않았다.
- DB 변경은 없다.
- 접근 조건은 기존 tenant + 기안자 또는 비임시저장 결재선 참여자 식을 유지한다.
