# 20261022_002 전자결재 기능별 패키지 분리 작업지시서

## 목적

전자결재 백엔드를 프론트엔드 문서작성·문서현황 경로처럼 기능별 패키지로 구성하고, 기능별 ServiceImpl이 실제 업무 로직을 소유하도록 분리한다.

## 승인된 범위

- `approval/write`, `approval/status`, `approval/shared`, `approval/common` 기능 경계를 적용한다.
- 문서작성, 현황 검색, 공유 문서업무 Controller·Service·ServiceImpl을 각각 해당 기능 패키지로 이동한다.
- 기존 `DocumentApprovalServiceImpl`로 위임하는 구조를 제거하고, 각 기능 ServiceImpl에 실제 동작을 이전한다.
- 인증·tenant·문서 소유/참여자 검증과 작성/상신이 공유하는 초안 검증·참여자·본문 이미지 처리는 common 서비스로 추출한다.
- 공유 VO, DAO, Mapper 및 MyBatis SQL은 기존 계약을 유지한다.
- URL, HTTP method, 파라미터, 응답, 권한, DB 스키마는 변경하지 않는다.
- 현재 작업 트리의 문서현황 전체조회 등 기존 미커밋 변경은 보존하며, 무관한 프론트 변경은 수정하지 않는다.

## 목표 패키지

```text
egovframework.let.groupware.approval
├── write/{controller,service,service/impl}
├── status/{controller,service,service/impl}
├── shared/{controller,service,service/impl}
├── common/service/impl
└── domain/{model,repository}
```

## 기능 책임

- `write`: 초안 저장/수정, 작성 목록·피드, 고정, 요약, 임시 본문 이미지.
- `status`: 기존 `/documents/search` 조회 및 검증.
- `shared`: 문서 상세, 결재·취소·삭제, 댓글, 첨부, 관련 파일 및 이미지 접근.
- `common`: 인증/접근 정책, 작성·상신이 공유하는 초안 처리, 피드·댓글 API가 함께 쓰는 댓글 스트림 조립.
- `domain`: 공용 VO, DAO; Mapper SQL은 변경하지 않는다.

## 수행 절차

1. 작업지시서, 승인 설계, 계획, 상세 사양을 확인한다.
2. 실패하는 패키지 구조 테스트를 먼저 작성하고 RED를 확인한다.
3. 현황과 접근 검증을 기능 패키지로 이동하고 무페이징 전체조회 변경을 보존한다.
4. 문서작성의 실제 로직 및 테스트를 write 패키지로 이동한다.
5. 공유 상세·결재·댓글·첨부의 실제 로직 및 테스트를 shared 패키지로 이동한다.
6. 공통 인증/초안 지원 경계를 정리한 뒤 통합 Service 인터페이스·구현체와 중복 테스트를 제거한다.
7. 기존 경로의 단일 매핑, eGovFrame 상속, API/권한 회귀, 전체 백엔드 및 프론트 API 계약을 확인한다.
8. 결과 문서에 이동 범위, 테스트, DB 변경 없음 및 보존된 작업트리 변경을 기록한다.

## 제외 범위

- 프론트엔드 UI, URL 또는 DTO 수정
- API/권한/업무 규칙 변경
- DAO/Mapper SQL 재설계
- DB 스키마 또는 데이터 변경
- 이 작업과 무관한 미커밋 변경의 정리

## 완료 기준

- 실제 업무 로직이 기능별 ServiceImpl에 있고, 새 서비스가 통합 `DocumentApprovalServiceImpl`에 위임하지 않는다.
- 기존 통합 `DocumentApprovalService`와 `DocumentApprovalServiceImpl`을 제거할 수 있다.
- 각 기존 API 경로는 정확히 한 Controller에 매핑되고 응답/권한 동작이 유지된다.
- 모든 ServiceImpl이 eGovFrame 서비스 기반 클래스를 상속하며 트랜잭션 경계가 보존된다.
- 전체 백엔드 테스트와 문서작성/현황 API 계약 테스트가 통과한다.
- 결과 문서에 검증 결과와 DB 변경 없음이 기록된다.

## 관련 문서

- 승인 설계: [기능별 패키지 분리 설계](../../superpowers/specs/2026-10-22-document-approval-package-separation-design.md)
- 계획서: [기능별 패키지 분리 계획서](../../plan/20261022/20261022_002_document_approval_feature_package_refactor_plan.md)
- 상세 사양서: [기능별 패키지 분리 상세 사양서](../../spec/20261022/20261022_002_document_approval_feature_package_refactor_spec.md)
- 실행 계획: [기능별 패키지 분리 구현 계획](../../superpowers/plans/2026-10-22-document-approval-package-separation.md)
