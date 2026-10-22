# 20261022_002 전자결재 기능별 패키지 분리 상세 사양서

> 작업지시서: [전자결재 기능별 패키지 분리 작업지시서](../../directions/20261022/20261022_002_document_approval_feature_package_refactor_work_instruction.md)  
> 계획서: [전자결재 기능별 패키지 분리 계획서](../../plan/20261022/20261022_002_document_approval_feature_package_refactor_plan.md)  
> 승인 설계: [전자결재 기능별 패키지 분리 설계](../../superpowers/specs/2026-10-22-document-approval-package-separation-design.md)

## 패키지 계약

| 패키지 | Controller | 실제 Service 책임 |
|---|---|---|
| `approval.write` | 임시저장 생성/수정, `/documents` 작성 목록, 고정/요약, 임시 본문 이미지 | 초안 저장, 작성 목록·피드, pinned 목록, 요약, 편집기 이미지 |
| `approval.status` | `/documents/search` | 검색 조건 검증, 정렬 allow-list, tenant/참여자 범위, 결과와 전체 건수 |
| `approval.shared` | 상세, 상신/액션/취소/삭제, 댓글, 첨부, 관련 파일 및 문서 이미지 | 공유 문서 상호작용과 해당 접근 제어 |
| `approval.common` | 별도 외부 route 없음 | 인증/소유권/참여자 확인, 작성·상신이 함께 쓰는 초안 처리, 피드·댓글 공통 댓글 스트림 조립 |
| `approval.domain` | 해당 없음 | 기존 공용 VO, DAO와 Mapper 연결 |

각 ServiceImpl은 실제 구현 책임을 보유하며 `DocumentApprovalServiceImpl`을 호출하는 단순 위임 facade가 아니다. 초안 저장과 상신이 함께 쓰는 검증·참여자·본문 이미지 처리는 `approval.common`의 지원 계약으로 공유하며, 기능 서비스끼리 직접 의존하거나 해당 로직을 복제하지 않는다.

작성 피드와 공유 댓글 API가 공통으로 사용하는 댓글 스트림 조립도 `approval.common` 지원 서비스로 추출한다. 이를 통해 write/shared 서비스 사이 직접 의존과 중복 조립을 방지한다.

## 유지할 API 및 데이터 동작

- 기본 경로는 `/api/v1/groupware/approvals` 그대로 유지한다.
- `/drafts`, `/documents`, `/documents/search`, 상세/결재/댓글/첨부 경로의 HTTP method 및 파라미터는 변경하지 않는다.
- `ResultVO` 필드, `resultList`, `item`, `totalRowCount`, 파일 응답과 HTTP 상태를 유지한다.
- 인증된 `LoginVO`에서 tenant/user scope를 유도하는 기존 규칙과 문서 소유/참여자 정책을 유지한다.
- 현황 검색에서 `offset`과 `limit`이 모두 누락된 요청은 무제한 전체조회 조건으로 유지하고, 페이징 요청은 현재 범위 검증을 유지한다.
- DAO/Mapper SQL과 DB 스키마는 수정하지 않는다.

## 구현 및 테스트 사양

- 각 Controller, Service 인터페이스, ServiceImpl 및 기능 테스트의 package 선언과 import가 기능 디렉터리와 일치한다.
- 모든 신규 기능 ServiceImpl은 `EgovAbstractServiceImpl`을 상속한다.
- Controller 단위/route 테스트는 기존 URL들이 새 Controller에 각각 한 번 매핑되는지 검사한다.
- Service 테스트는 기존 `DocumentApprovalServiceImplTest`의 작성, 상태, 공유 상호작용 assertion을 기능별 테스트로 보존한다.
- 공통 접근 서비스는 미인증, 다른 사용자 소유 문서, 접근 가능한 참여 문서 조건을 기존 상태 코드로 검증한다.
- 통합 Service 제거 이후 이전 서비스 타입에 대한 프로덕션 참조가 남지 않는다.

## 비기능/범위

- 데이터베이스 DDL/DML, Mapper 쿼리, frontend, 신규 API는 범위 밖이다.
- 오류는 기존 예외와 HTTP 상태로 전달하며 위임 또는 기본값으로 성공처럼 처리하지 않는다.
- 모든 수정은 승인 설계와 현재 미커밋 작업을 함께 고려하며, 무관한 변경을 건드리지 않는다.
