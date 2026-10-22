# 20261022_001 전자결재 문서작성·현황 백엔드 계층 분리 작업지시서

## 작업 목적

프론트엔드에서 분리된 문서작성과 문서현황 기능에 맞춰 전자결재 백엔드 책임을 분리하고, eGovFrame의 Controller → Service 인터페이스 → ServiceImpl → DAO/Mapper 패턴을 적용한다.

## 승인된 범위

- 문서작성 API, 문서현황 검색 API, 양쪽 페이지가 공유하는 문서 상세·결재·댓글·첨부 업무를 책임별 Controller와 Service 계층으로 분리한다.
- 신규 ServiceImpl은 `EgovAbstractServiceImpl`을 상속하고 기존 생성자 주입 및 트랜잭션 규칙을 따른다.
- 모든 기존 URL, HTTP method, request/response 필드, 권한 조건, tenant/user 범위와 사용자 동작을 보존한다.
- DAO와 MyBatis Mapper는 공유하여 SQL 중복 및 데이터 동작 변경을 피한다.
- 현재 작업 트리에 있는 문서현황 전체조회 동작과 관련 테스트·Mapper 변경을 보존한다. 미커밋 변경을 되돌리거나 무관한 파일을 수정하지 않는다.
- DB MCP에서 확인한 `tb_electronic_approval_main`, `tb_electronic_approval_line_info` 계약을 유지한다. DB 스키마 변경은 포함하지 않는다.

## 계층별 책임

1. **문서작성 Controller/Service**
   - 초안 저장 및 수정
   - 작성 목록/피드, 고정 목록 및 개인 고정 상태
   - 문서 요약
   - 임시 본문 이미지 업로드/삭제
2. **문서현황 Controller/Service**
   - 기존 `/documents/search` 검색 API
   - 조건 검증, 권한 범위 및 정렬 검증, 현황 조회와 전체 건수
3. **공유 문서업무 Controller/Service**
   - 문서 상세, 결재 신청/취소/처리, 삭제
   - 댓글, 댓글 첨부, 문서 첨부 및 이미지 스트리밍
4. **공유 DAO/Mapper**
   - 기존 DAO/SQL 문장을 유지하고 새 계층에서 재사용

## 작업 절차

1. 설계 문서와 본 작업지시서, 날짜별 계획서 및 상세 사양서를 확인한다.
2. 기존 Controller/Service/Mapper 테스트를 실행하고 현재 작업 트리의 변경을 보존한다.
3. 상태 검색과 작성 목록의 Controller/Service 회귀 테스트를 먼저 작성하거나 보완한다.
4. 문서현황 Controller/Service를 분리하고 현황 검색 검증, 권한 범위, 정렬 및 전체조회 동작을 유지한다.
5. 문서작성 Controller/Service를 분리하고 초안·목록·피드·고정·요약·임시 이미지 동작을 유지한다.
6. 공유 문서업무 Controller/Service를 분리하고 상세·결재·댓글·첨부 접근 권한과 트랜잭션을 유지한다.
7. 중복되지 않는 기존 경로를 새 Controller에 배치하고 모든 응답 래퍼를 유지한다. 프론트엔드 URL/DTO는 변경하지 않는다.
8. 관련 Controller/Service/Mapper 테스트, 전체 Maven 테스트 및 필요 프론트엔드 서비스 테스트를 실행한다.
9. 결과 문서에 변경 범위, DB MCP 확인 근거, 보존된 작업트리 변경, 테스트 결과를 기록한다.

## 제외 범위

- API 경로·요청/응답 계약 변경
- 프론트엔드 화면 변경
- DB DDL, 마이그레이션 또는 데이터 변경
- 전자결재 권한·업무 규칙 및 Mapper SQL 재설계

## 완료 기준

- 문서작성, 문서현황, 공유 문서업무가 각각 독립된 eGovFrame Controller/Service 계층에서 처리된다.
- 공통 문서 상세 및 업무 기능은 두 페이지에서 기존 권한 조건과 함께 재사용된다.
- 기존 API 및 DB 계약과 현재 문서현황 전체조회 동작이 회귀 없이 유지된다.
- 관련 테스트와 `mvn test`가 통과하고, 프론트엔드 API 서비스 테스트가 통과한다.
- 날짜별 결과 문서가 변경 범위와 검증 근거를 정확히 기록한다.

## 관련 문서

- 승인 설계: [Document Approval Backend Separation Design](../../superpowers/specs/2026-10-22-document-approval-backend-separation-design.md)
- 계획서: [전자결재 백엔드 계층 분리 계획서](../../plan/20261022/20261022_001_electronic_document_backend_layer_separation_plan.md)
- 상세 사양서: [전자결재 백엔드 계층 분리 상세 사양서](../../spec/20261022/20261022_001_electronic_document_backend_layer_separation_spec.md)
- 실행 계획: [Electronic Approval Backend Separation Implementation Plan](../../superpowers/plans/2026-10-22-document-approval-backend-separation.md)
