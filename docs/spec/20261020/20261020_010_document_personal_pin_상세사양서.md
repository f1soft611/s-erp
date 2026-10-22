# 문서작성 개인별 고정 문서 상세 사양서

## 근거 및 승인

- 작업지시서: [개인별 고정 문서 작업지시서](../../directions/20261020/20261020_010_document_personal_pin_work_instruction.md)
- 계획서: [개인별 고정 문서 계획서](../../plan/20261020/20261020_010_document_personal_pin_계획서.md)
- 통합 설계: [Personal Document Pins and Feed/List Pagination Design](../../superpowers/specs/2026-10-20-document-pin-and-feed-list-pagination-design.md)
- 사용자는 개인별 고정 테이블/API/UI를 먼저 만들고 일반 목록 페이징은 후속 단계로 분리하는 설계를 승인했다.
- 사용자는 핀 아이콘 위치를 공지사항 피드의 고정 아이콘과 동일하게 하도록 지정했다.

## 1. 사용자 요구

- 로그인 사용자가 읽을 수 있는 전자결재 문서를 개인별로 고정/해제한다.
- 개인별 고정 상태는 같은 tenant의 다른 사용자에게 공유되지 않는다.
- 현재 사용자의 모든 고정 문서를 별도 목록으로 조회한다.
- 고정 목록은 문서 최신 수정일 내림차순, 문서 ID 내림차순으로 안정 정렬한다.
- 현재 문서작성 scope, 업무구분, 선택 문서 필터를 고정 목록에도 적용한다.
- 리스트형은 기존 상단 고정 패널에 전체 고정 문서를 표시한다.
- 피드형은 고정 문서를 일반 피드보다 먼저 표시한다.
- 공지사항 피드의 PushPin 아이콘 액션 위치와 동일한 카드 액션 영역을 사용한다. 리스트형은 행 우측 액션 영역을 사용한다.
- 고정 수는 현재 필터 조건에 맞는 개인별 고정 문서 수와 일치한다.
- 별도의 최대 고정 개수는 두지 않는다. 전체 고정 목록 조회는 전체 결과를 반환한다.

## 2. 인증·권한·테넌트

- tenant ID와 user ID는 인증 `LoginVO`에서만 가져온다. 요청 파라미터로 user ID를 받지 않는다.
- 고정/해제 전에 문서가 존재하고 삭제되지 않았으며 기존 `documentReadAccess`로 현재 사용자에게 읽기 가능한지 확인한다.
- 다른 tenant 또는 읽기 권한이 없는 문서는 pin/unpin 할 수 없다. 대상 존재와 권한 실패는 기존 API 패턴에 따라 404로 처리해 문서 존재를 구분하지 않는다.
- 고정 목록은 인증 tenant/user의 pin 관계만 가져오며 각 문서에도 `documentReadAccess`와 삭제 조건을 적용한다.
- 명시 scope는 기존 문서 목록 의미를 그대로 유지한다. ALL에 암묵적인 상태 제한을 추가하지 않는다.
- 잘못된/누락 ID는 기존 승인 API 검증 규칙을 따르고, 모든 실패는 명시적인 API 오류로 반환한다.

## 3. 데이터베이스 계약

읽기 전용 DB MCP를 직접 호출했다.

- `list_tables`: `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_user`를 확인했다.
- `describe_table(tb_electronic_approval_main)`: 문서 ID, tenant ID, 수정시각, 삭제 상태가 있고 개인별 pin 컬럼은 없다.
- `describe_table(tb_electronic_approval_line_info)`: 문서 참여자 ID와 참여 유형/처리 상태를 확인했다.
- `describe_table(tb_user)`: `user_id BIGINT`, `tenant_id BIGINT` 등 사용자 메타데이터를 확인했다. 데이터 행은 조회하지 않았다.
- `describe_table(tb_tenant)`: `tenant_id BIGINT` 키를 확인했다. tenant 데이터 행은 조회하지 않았다.
- 저장소 이력 [20261008_003_create_document_approval_schema.sql](../../../backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql)은 문서에 `(tenant_id, electronic_approval_id)` 복합 FK를 사용하는 패턴을 보여 준다.

### 신규 테이블 `tb_electronic_approval_pin`

| 컬럼 | 타입 | 제약·설명 |
|---|---|---|
| `tenant_id` | bigint | 필수, 인증 사용자 tenant |
| `user_id` | bigint | 필수, 인증 `LoginVO.uniqId`에서 기존 ID 규칙으로 검증·변환한 사용자 ID |
| `electronic_approval_id` | bigint | 필수, 읽을 권한이 확인된 결재 문서 |
| `created_at` | timestamp | 필수, DB 기본 현재시각 |

- 복합 PK/unique key는 `(tenant_id, user_id, electronic_approval_id)`로 하여 동일 사용자의 중복 고정을 막는다.
- `tenant_id`는 `tb_tenant.tenant_id`, `user_id`는 `tb_user.user_id`를 참조하는 FK를 둔다.
- `(tenant_id, electronic_approval_id)`는 `tb_electronic_approval_main`의 복합 unique key를 참조하는 FK로 연결하고 실제 문서 row 물리 삭제 시 pin row를 cascade 삭제한다.
- `user_id`는 `tb_user.user_id`를 참조한다. `uniqId`가 정수 사용자 ID로 검증·변환되지 않으면 요청을 거부한다. tenant/user 경계는 인증 tenant와 ID를 함께 쓰는 모든 조회·변경 SQL에서 강제한다.
- pinned 목록 조회용 `(tenant_id, user_id)` 선두 인덱스를 보장한다. 문서 최신순 정렬은 문서 테이블의 `updated_at` 및 ID를 사용한다.
- 날짜별 DDL/변경 이력/롤백 파일 이름은 `20261020_007`로 맞추고 `docs/database`와 `backend/DATABASE`에 동일하게 둔다.
- `docs/database/db-schema.md`에 테이블 정의와 변경 이력을 반영한다. SQL 파일은 초안이며 운영 DB에는 직접 적용하지 않는다.

## 4. API

### Pin

`PUT /api/v1/groupware/approvals/documents/{electronicApprovalId}/pin`

- 인증 사용자에게 문서 읽기 권한이 있는지 확인한다.
- `(tenant_id, user_id, electronic_approval_id)`가 이미 존재해도 성공하는 멱등 동작이다.
- 성공 응답에는 해당 문서 ID와 `isPinned: true`를 포함한다.

### Unpin

`DELETE /api/v1/groupware/approvals/documents/{electronicApprovalId}/pin`

- 인증 사용자의 관계만 삭제한다. 다른 사용자의 pin에는 영향을 주지 않는다.
- 이미 삭제되었거나 없더라도 성공하는 멱등 동작이다.
- 성공 응답에는 해당 문서 ID와 `isPinned: false`를 포함한다.

### 현재 사용자 고정 목록

`GET /api/v1/groupware/approvals/documents/pinned`

| query | 의미 |
|---|---|
| `scope` | 기존 문서 scope, 기본 `ALL` |
| `documentType` | 기존 업무구분, 선택 |
| `electronicApprovalId` | 선택 문서, 선택 |
| `includeDetails` | 피드형 상세 결과 요청, 기본 `false` |

응답 envelope:

- 리스트형: `resultList`는 현재 사용자에게 보이고 필터에 맞는 `DocumentApprovalListItemVO` 목록이다.
- 피드형(`includeDetails=true`): `resultList`는 동일한 문서의 기존 `DocumentApprovalFeedItemVO` 형태다.
- 전체 결과 건수는 `totalRowCount`로 반환한다.
- 모든 결과를 최신 수정일 및 문서 ID 내림차순으로 반환한다. 이 API에는 limit/offset을 적용하지 않는다.
- 모든 query parameter는 검증하고 기존 ResultVO envelope를 유지한다.
- API는 user ID를 입력받거나 반환하지 않으며 다른 사용자의 pin 수/관계를 노출하지 않는다.

### 일반 문서 목록과의 경계

- 이 선행 하위 작업에서는 기존 일반 문서 전체 조회 API 동작을 유지한다.
- 후속 페이징 하위 작업에서 pinned ID를 일반 서버 페이지 조회에서 제외해 pin 결과가 일반 페이지 20건을 차지하지 않도록 한다.
- 서버 DB·API 모두 같은 인증 user ID와 tenant ID 기준을 사용한다.

## 5. 프론트엔드 상태 및 동작

- `useDocumentWritePage`는 현재 `scope`, 업무구분, 선택 문서 ID, reload version, view mode에 맞춰 일반 문서와 pinned 문서를 별도로 조회한다.
- pin 상태는 서버가 반환한 현재 사용자의 pinned ID 집합으로만 결정한다. 브라우저 로컬 저장을 진실 원천으로 쓰지 않는다.
- 리스트형: `PinnedItemsPanel`은 전체 고정 문서를 별도 표시하고 일반 리스트에서 중복 렌더링하지 않는다.
- 피드형: 모든 pinned feed 항목을 먼저 보여 준 뒤 일반 피드를 이어 표시한다.
- 각 문서의 PushPin 액션은 공지 피드 카드의 우측 상단 액션과 같은 위치를 사용한다. 일반 list row와 pinned row에는 우측 끝에 액션을 둔다.
- aria-label/title은 상태에 따라 `상단 고정 {title}` 또는 `상단 고정 해제 {title}`로 지정한다.
- 사용자 액션 중 같은 문서의 반복 pin/unpin 입력은 차단한다.
- 성공하면 서버에서 pinned 목록과 일반 목록을 다시 읽어 상태를 동기화한다. 실패하면 기존 NotificationContext의 error 알림을 표시하고 기존 목록은 보존한다.
- 필터 변경·모드 변경·reload 뒤 진행 중이던 이전 요청 응답은 현재 화면 상태를 덮어쓰지 않는다.
- 초기 로딩 스켈레톤과 페이지 로딩 spinner 동작은 선행/후행 요구에 맞춰 유지한다. 이 사양은 아직 pagination sentinel을 구현하지 않는다.

## 6. 테스트 및 검증 기준

### 백엔드

- Mapper: tenant/user 격리, 문서 읽기권한, 상태/삭제 조건, 필터와 최신순 정렬, unique 및 FK 구성을 검증한다.
- Service: pin 입력, 인증 사용자 ID 사용, 비권한 문서 거부, 멱등 처리, scope/type/document 필터를 검증한다.
- Controller: API 경로, 인증 사용자 전달, 응답 envelope, 오류 변환을 검증한다.

### 프론트엔드

- 서비스는 ID 검증, API 호출 경로, 응답 shape 오류를 검사한다.
- 훅은 pinned 전체 별도 조회, 필터 적용, pinned/ordinary 중복 방지, 성공 refresh, 실패 보존을 검사한다.
- 공통 list action이 없는 소비자의 기존 렌더 및 동작이 보존되는지 검사한다.
- feed/list에서 pin 상태, 액션 disabled/error/success, pinned panel/우선 정렬을 검사한다.

### 브라우저

- 기존 `http://127.0.0.1:4173` 서버를 확인 후 재사용한다.
- 375px, 768px, 1280px에서 notice 피드와 같은 아이콘 위치, 리스트 우측 아이콘, 전체 고정 패널, pin/unpin 후 이동을 확인한다.
- 테스트 data는 합성 문서/사용자 ID를 사용하고 개인정보·실제 계정·문서 내용을 스크린샷에 남기지 않는다.

## 7. 결과 문서와 후속 작업

- 결과: `docs/result/20261020/document-personal-pins/result.md`
- 스크린샷: `docs/result/20261020/document-personal-pins/screenshots/`
- 결과서에는 테스트 결과, 브라우저 크기, MCP 메타데이터 확인, DDL 초안의 DB 미적용 상태, 관련 선행 미커밋 변경 보존 여부를 기록한다.
- 개인별 고정 기능 완료 후 일반 문서 페이징은 별도 [작업지시서](../../directions/20261020/20261020_012_document_feed_list_pagination_work_instruction.md), [계획서](../../plan/20261020/20261020_012_document_feed_list_pagination_계획서.md), [상세 사양서](./20261020_012_document_feed_list_pagination_상세사양서.md) 주기로 수행한다.
