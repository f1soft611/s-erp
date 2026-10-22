# 전자결재 백엔드 기능별 패키지 분리 설계

## 목적

문서작성과 문서현황의 프론트엔드처럼, 전자결재 백엔드도 기능 단위 패키지로 구성한다. Controller와 Service 클래스만 나누고 공통 ServiceImpl에서 다시 위임하는 임시 구조가 아니라, 각 기능의 업무 로직이 해당 기능 서비스에 위치하도록 분리한다.

## 현재 상태

- 프론트엔드는 `frontend/src/pages/groupware/documents/write`와 `.../status`로 기능 경로가 나뉘어 있다.
- 백엔드에는 `approval/controller`, `approval/service`, `approval/service/impl` 계층이 공통으로 있고, 문서작성·현황·결재·댓글·첨부 구현이 기존 통합 `DocumentApprovalServiceImpl`에 결합되어 있다.
- 앞선 작업에서 문서작성·현황·공유 업무용 Controller 및 Service 계약을 추가했으나, 문서작성·공유 ServiceImpl은 기존 통합 구현체로 위임한다. 이 설계에서는 그 위임을 제거하는 것을 완료 기준으로 한다.
- 기존 `/documents` 작성 목록, `/documents/search` 현황 검색, 상세와 결재 관련 경로는 서로 다른 API 계약이며 모두 유지한다.
- 문서현황 전체조회 무페이징 변경 등 현재 작업 트리의 미커밋 변경은 보존한다.
- DAO/Mapper와 DB 스키마는 이번 구조 변경의 대상이 아니다.

## 결정된 패키지 구조

기능을 최상위 경계로 두고 그 아래에서 기존 eGovFrame 계층을 구분한다.

```text
egovframework.let.groupware.approval
├── write
│   ├── controller
│   └── service
│       └── impl
├── status
│   ├── controller
│   └── service
│       └── impl
├── shared
│   ├── controller
│   └── service
│       └── impl
├── common
│   └── service
│       └── impl
├── domain
│   ├── model
│   └── repository
└── mapper resources
```

물리 경로 예:

```text
backend/src/main/java/egovframework/let/groupware/approval/write/controller/
backend/src/main/java/egovframework/let/groupware/approval/write/service/
backend/src/main/java/egovframework/let/groupware/approval/status/controller/
backend/src/main/java/egovframework/let/groupware/approval/status/service/
backend/src/main/java/egovframework/let/groupware/approval/shared/controller/
backend/src/main/java/egovframework/let/groupware/approval/shared/service/
backend/src/main/java/egovframework/let/groupware/approval/common/service/
```

- `write`: 초안 저장·수정, 작성 목록/피드, 고정 목록·상태, 요약, 임시 본문 이미지 업무.
- `status`: `/documents/search` 현황 검색, 조건·범위·정렬 검증 및 결과 조회.
- `shared`: 문서 상세, 결재 처리 및 취소, 삭제, 댓글, 첨부와 이미지 조회 등 작성/현황 화면이 함께 쓰는 문서 업무.
- `common`: 인증 사용자 및 문서 접근/소유권 검증, 작성·상신이 함께 사용하는 초안 처리 보조, 피드·댓글 API가 함께 사용하는 댓글 스트림 조립.
- `domain`: 공유 VO 및 DAO. 기능 전용 모델은 사용처와 API 바인딩 호환성을 확인한 뒤 필요한 경우 해당 기능 하위로 이동한다. Mapper SQL은 공유 DAO에서 그대로 사용한다.

기능 간 호출은 Controller를 경유하지 않는다. 각 기능 Service는 `common` 서비스와 공용 도메인/DAO를 사용할 수 있으며, 기능 간 구현체에 직접 의존하지 않도록 한다. 초안 저장과 상신이 공유하는 검증·이미지 처리 및 작성 피드와 공유 댓글 API가 공통으로 사용하는 댓글 스트림 조립은 복제하거나 기능 간 직접 의존시키지 않고 `common` 지원 서비스로 추출한다.

## 구현 기준

1. 기존 통합 `DocumentApprovalServiceImpl`의 실제 업무 메서드를 write/status/shared의 ServiceImpl로 옮긴다. 각 ServiceImpl이 기존 통합 구현체에 호출을 위임하는 형태는 허용하지 않는다.
2. 공통 인증/접근 검증과 초안 처리 보조는 `common` 서비스에서 제공하고 각 기능 서비스가 이를 사용한다.
3. 신규·이동된 ServiceImpl은 `EgovAbstractServiceImpl`을 상속하고 생성자 주입과 필요한 트랜잭션 경계를 유지한다.
4. 각 API 경로와 HTTP method는 정확히 하나의 Controller에만 매핑한다. 경로, 파라미터, 응답 필드/래퍼, HTTP 상태, 인증·tenant·사용자 범위를 변경하지 않는다.
5. 모든 업무 로직 이전 및 참조 검증이 완료되면 기존 공통 `DocumentApprovalService`와 `DocumentApprovalServiceImpl`을 제거한다.
6. 테스트도 기능별 패키지로 정리하고, 라우트 중복·누락 및 기능 동작을 검증한다.

## 호환성과 범위

- 프론트엔드 호출 경로와 DTO는 수정하지 않는다.
- 기존 MyBatis DAO 및 Mapper SQL은 공유하며 SQL을 재설계하지 않는다.
- 테이블·컬럼·인덱스 등 스키마 변경과 데이터 마이그레이션은 없다.
- 현재 미커밋된 사용자 작업을 되돌리거나 이 설계와 무관한 파일을 변경하지 않는다.
- 패키지 이동은 내부 구조 변경이며 API 동작 변경을 포함하지 않는다.

## 검증 기준

- 문서작성·문서현황·공유 업무가 대응하는 기능 패키지의 Controller → Service 인터페이스 → ServiceImpl 흐름을 사용한다.
- `DocumentApprovalServiceImpl`을 통한 기능 위임이 남아 있지 않고, 기존 통합 Service 구현체가 제거되어 있다.
- 기존 URL의 route 매핑이 하나씩 존재하며 응답·인증·권한 동작이 기존 계약과 일치한다.
- 문서현황 검색의 조건 검증, allow-list 정렬, tenant/참여자 범위 및 무페이징 전체조회 동작이 보존된다.
- 공유 DAO/Mapper 및 DB 스키마가 불필요하게 변경되지 않았다.
- 관련 기능 테스트와 전체 `mvn test`, 문서작성/현황 프론트엔드 서비스 계약 테스트가 통과한다.
- 결과 문서에 구현 범위, 검증 결과 및 보존한 작업트리 변경을 기록한다.

## 완료 전 검토가 필요한 점

문서작성/현황이 공유하는 상세 화면 업무 중 어느 API가 shared에 속하는지는 현재 승인된 경계(문서 상세·결재·댓글·첨부·이미지)를 기준으로 한다. 구현 중 새로운 교차 의존성이 확인되면 API 계약이나 기능 범위를 바꾸지 않고 shared 서비스의 책임 경계 안에서 해결한다.
