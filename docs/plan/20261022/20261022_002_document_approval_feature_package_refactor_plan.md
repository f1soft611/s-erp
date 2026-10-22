# 20261022_002 전자결재 기능별 패키지 분리 계획서

> 작업지시서: [전자결재 기능별 패키지 분리 작업지시서](../../directions/20261022/20261022_002_document_approval_feature_package_refactor_work_instruction.md)  
> 설계: [전자결재 기능별 패키지 분리 설계](../../superpowers/specs/2026-10-22-document-approval-package-separation-design.md)  
> 상세 사양서: [전자결재 기능별 패키지 분리 상세 사양서](../../spec/20261022/20261022_002_document_approval_feature_package_refactor_spec.md)  
> 구현 계획: [전자결재 기능별 패키지 분리 구현 계획](../../superpowers/plans/2026-10-22-document-approval-package-separation.md)

## 목표

전자결재 구현을 `write`, `status`, `shared`, `common` 패키지로 나누고, 통합 ServiceImpl 위임을 제거하면서 기존 API와 데이터 동작을 유지한다.

## 작업 순서

1. 패키지 경로 및 통합 Service 의존성을 검출하는 테스트를 먼저 작성한다.
2. status Controller/Service/테스트와 공통 접근 서비스를 새 패키지로 이동한다.
3. 초안·작성목록·고정·요약·임시이미지 로직과 회귀 테스트를 write 패키지로 이전한다.
4. 상세·결재·댓글·첨부 로직과 회귀 테스트를 shared 패키지로 이전한다.
5. 작성과 상신이 공유하는 초안 검증·참여자·본문 이미지 처리 보조를 common 서비스로 정리한다.
6. 통합 Service 계약/구현, 구 Controller 테스트를 제거하고 테스트 소유 위치를 기능별로 재편한다.
7. route 단일 매핑, eGovFrame 상속, 전체 Maven 테스트 및 프론트 계약 테스트를 실행한다.
8. 결과 문서를 작성하고 미커밋 사용자 변경이 보존되었는지 확인한다.

## 검증 범위

- 개별 Controller/Service/Mapper 테스트 후 백엔드 전체 `mvn test`
- 문서작성 및 문서현황 API 계약 테스트
- `git diff --check`
- URL 중복·누락, 기존 전체조회 동작, 인증/tenant/소유권 조건 확인

## 제한

DB 스키마, Mapper SQL, 프론트엔드 API 계약 및 UI 변경은 없다. 현재 미커밋된 Mapper와 문서현황 동작은 유지한다. 이 작업은 내부 패키지/서비스 소유권 리팩터링이다.
