# 전자결재 기능별 백엔드 패키지 분리 작업 결과

## 작업 개요

- 작업지시서: [전자결재 기능별 패키지 분리 작업지시서](../../../directions/20261022/20261022_002_document_approval_feature_package_refactor_work_instruction.md)
- 계획서: [전자결재 기능별 패키지 분리 계획서](../../../plan/20261022/20261022_002_document_approval_feature_package_refactor_plan.md)
- 상세 사양서: [전자결재 기능별 패키지 분리 상세 사양서](../../../spec/20261022/20261022_002_document_approval_feature_package_refactor_spec.md)
- 설계: [전자결재 기능별 패키지 분리 설계](../../../superpowers/specs/2026-10-22-document-approval-package-separation-design.md)

## 변경 사항

- 전자결재 서버 코드를 `write`, `status`, `shared`, `common` 기능 패키지로 나눴다. 공용 VO와 DAO는 기존 `domain` 패키지에 유지했다.
- 문서작성, 현황, 공유 기능의 Controller와 Service 계약 및 테스트를 기능별 경로로 이동했다.
- 각 기능 ServiceImpl이 실제 업무 로직을 소유하도록 구현을 분리하고, 기존 통합 `DocumentApprovalService`와 `DocumentApprovalServiceImpl` 및 이를 사용하는 위임 구조를 제거했다.
- 초안 검증·참여자·본문 이미지 처리는 common 지원 서비스로 공유하고, 작성 피드와 공유 댓글 API의 댓글 스트림 조립도 common 지원 서비스로 분리했다.
- 기능 서비스는 eGovFrame `EgovAbstractServiceImpl` 기반을 유지하고, 기존 URL·HTTP method·요청/응답·권한·tenant 및 접근 범위 동작을 변경하지 않았다.
- 작업 시작 전부터 존재한 현황 무페이징 전체조회 및 Mapper 관련 변경, 무관한 프론트엔드 변경은 보존했다.

## 검증

- `backend`: `mvn -DskipTests compile` — **성공**
- `backend`: `mvn test` — **410개 실행, 실패 0, 오류 0, 건너뜀 2**
- 현황 프론트 계약: `npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts tests/document-status-hooks.test.tsx tests/document-status-search.test.ts` — **43개 통과**
- `git diff --check` — **통과**
- 구조 테스트를 포함한 전체 백엔드 테스트에서 기존 통합 서비스 참조 및 기능별 route 회귀 검증을 확인했다.

## 후속 기동 오류 점검

- 기동 중 `GET /api/v1/groupware/approvals/files` 중복 매핑 오류가 발생해 확인한 결과, 소스에 중복 Controller는 없었지만 이전 `DocumentApprovalApiController.class`가 `target/s-erp-backend/WEB-INF/classes`에 남아 새 Controller와 함께 패키징되어 있었다.
- 실행 중인 8080 포트의 백엔드가 배포 산출물을 잠가 clean이 실패했다. 해당 프로세스를 중지한 후 `mvn clean package`로 전체 산출물을 재생성했다.
- clean package는 **410개 테스트 통과, 실패 0, 오류 0, 건너뜀 2**로 성공했다. 재생성된 exploded 배포 디렉터리와 WAR 모두에서 구 `DocumentApprovalApiController.class`가 제거되고 새 기능별 Controller만 포함됨을 확인했다.
- 새 산출물은 준비되었으며, 로컬 백엔드 프로세스는 clean 작업을 위해 중지된 상태다. 애플리케이션을 다시 시작해 기동을 확인해야 한다.

## 데이터베이스 및 스크린샷

- 이번 분리 작업에서는 DB 스키마·데이터·API 데이터 계약·Mapper SQL을 변경하지 않았다. 기존 작업 트리의 현황 전체조회 관련 Mapper 변경은 보존했으며, DB 마이그레이션이나 스키마 이력 추가는 하지 않았다.
- 이 작업은 백엔드 내부 패키지 분리이며 프론트 화면을 변경하지 않았으므로 화면 스크린샷은 해당되지 않는다.
