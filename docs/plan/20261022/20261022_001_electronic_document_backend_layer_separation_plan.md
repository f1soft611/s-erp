# 20261022_001 전자결재 문서작성·현황 백엔드 계층 분리 계획서

> 작업지시서: [전자결재 백엔드 계층 분리 작업지시서](../../directions/20261022/20261022_001_electronic_document_backend_separation_work_instruction.md)  
> 설계: [Document Approval Backend Separation Design](../../superpowers/specs/2026-10-22-document-approval-backend-separation-design.md)  
> 상세 계획: [Electronic Approval Backend Separation Implementation Plan](../../superpowers/plans/2026-10-22-document-approval-backend-separation.md)  
> 상세 사양서: [전자결재 백엔드 계층 분리 사양서](../../spec/20261022/20261022_001_electronic_document_backend_layer_separation_spec.md)

## 목표

문서작성과 문서현황의 백엔드 요청 처리를 기능별 Controller/Service 계층으로 분리하고, 공유 상세·결재 업무는 공통 계층으로 유지한다. 기존 API, 데이터 계약, tenant/사용자 권한 및 DB 스키마는 변경하지 않는다.

## 설계 요약

- 문서작성: 초안, 작성 목록/피드, 고정, 요약, 임시 본문 이미지
- 문서현황: 기존 `/documents/search` 검색, 조건·정렬·범위 검증 및 목록 조회
- 공유 문서업무: 상세, 결재 액션, 댓글, 첨부 및 관련 파일/이미지 접근
- 공통 접근 서비스: 인증 사용자, 기안자/참여자 접근 및 초안 소유 검증
- DAO/Mapper는 공유하고 SQL 변경을 피한다.
- 서비스 구현은 eGovFrame `EgovAbstractServiceImpl`을 상속하고 생성자 주입/트랜잭션 패턴을 적용한다.
- 현재 작업 트리의 문서현황 전체조회 변경과 테스트를 그대로 보존한다.

## 구현 순서

1. 승인된 작업지시서/설계/사양을 확인하고 기존 Controller, Service, Mapper 및 프론트 API 계약 테스트를 기준선으로 실행한다.
2. 문서현황 및 공유 접근 회귀 테스트를 먼저 준비하고, status Controller/Service와 공통 접근 검증을 분리한다.
3. 문서작성 Controller/Service를 분리해 초안 저장·수정, 목록/피드, 고정, 요약, 임시 이미지 책임을 이동한다.
4. 상세·결재·댓글·첨부 책임을 공유 interaction Controller/Service로 이동하고 권한/트랜잭션 검증을 유지한다.
5. 기존 통합 Controller/Service/Impl 및 테스트를 새 계층으로 이관한 후 삭제하고 Spring 등록 및 경로 중복 여부를 확인한다.
6. 관련 Maven 테스트, 전체 `mvn test`, 문서작성/문서현황 프론트엔드 계약 테스트를 실행한다.
7. 브라우저에서 기존 페이지의 375px·768px·1280px 화면을 확인하고 결과 폴더에 스크린샷과 결과 문서를 남긴다.

## 변경 대상

- 신규 Controller: `DocumentApprovalWriteApiController`, `DocumentApprovalStatusApiController`, `DocumentApprovalInteractionApiController`
- 신규 Service/API: 문서작성, 문서현황, 공유 interaction, 공통 접근 서비스별 인터페이스 및 구현
- 기존 통합 Controller/Service/Impl 및 대응 테스트: 새 책임 계층으로 테스트와 구현을 이전한 뒤 제거
- 기존 `DocumentApprovalDAO`, `DocumentApproval_SQL_postgresql.xml`, `DocumentApprovalMapperTest`: 공유 상태 유지. 미커밋된 status SQL/테스트 변경을 보존하며 쿼리를 재설계하지 않는다.
- 프론트엔드 소스와 데이터베이스 스키마: 변경하지 않는다.
- 결과 폴더: `docs/result/20261022/document-approval-backend-separation/`

## 검증 기준

- 각 기존 URL/HTTP method가 정확히 하나의 Controller에 매핑된다.
- `GET /documents`의 작성 목록과 `GET /documents/search`의 현황 검색 계약이 구분되어 그대로 유지된다.
- 전체조회 요청은 `offset`/`limit` 없이 제한절을 생략하고, 페이지 요청은 기존 범위 검증을 유지한다.
- 기안자/결재 참여자 및 tenant 접근 제한, 문서 상태별 허용 액션, 댓글/첨부 소유 검증에 회귀가 없다.
- 모든 새 ServiceImpl이 `EgovAbstractServiceImpl`을 상속하고, 변경하지 않은 DAO/Mapper가 동일 SQL 계약을 유지한다.
- 백엔드 전체 테스트 및 문서작성/문서현황 프론트엔드 계약 테스트가 통과한다.
- 테스트와 브라우저 확인 결과 및 데이터베이스 메타데이터 확인 근거가 결과 문서에 기록된다.

## 제외 범위

- API 경로·파라미터·응답 형태 변경
- 문서작성/현황 UI 변경
- DB DDL/마이그레이션/데이터 변경
- 결재 정책 변경 또는 Mapper SQL 재설계
