# 전자결재 순차 상신 및 시스템 이력 설계

## 배경

문서작성 화면은 임시저장까지 구현되어 있으며, 결재선 참여자와 단계 순서를 함께 저장한다. 다음 단계인 결재신청에서는 지정한 순서대로 처리 대상을 활성화하고, 문서 상태·결재선 상태·시스템 이력이 서로 어긋나지 않도록 해야 한다.

기존 UI는 일반 결재자를 각각 별도 단계로 배치하고, 한 합의 단계에는 여러 참여자를 배치할 수 있다. 기안자는 변경 불가한 첫 번째 결재 단계이며, 참조자는 마지막 단계 뒤에 배치된다. 사용자가 확정한 정책은 기안자 단계 상신 자동 완료, 합의자 동시 처리 및 전원 동의 후 진행, 반려 종료, 보완요청 후 기안자 수정·재상신이다.

## 검증된 현재 구조

### S-ERP 중앙 PostgreSQL

워크스페이스에 이미 등록된 `s-erp-postgresql-readonly` MCP 서버를 통해 테이블 목록, 컬럼 메타데이터, 제약조건을 읽기 전용으로 확인했다. 확인 과정에서 행 데이터는 조회하지 않았다.

- `tb_electronic_approval_main`에는 `document_type`, `document_status`, `submitted_at`이 있고 `eabus_no`는 없다.
- `document_status` CHECK는 `DRAFT`, `PENDING`, `IN_PROGRESS`, `REVISION_REQUESTED`, `COMPLETED`를 허용하며 `REJECTED`는 허용하지 않는다.
- `tb_electronic_approval_line_info`에는 `stage_order`, `participant_order`, `action_status`, `action_at`, `action_comment`가 있고 `pending_at`은 없다.
- 결재선 CHECK는 `WAITING`/`PENDING`의 `action_at` 및 `action_comment`를 NULL로 제한한다. 승인·반려·보완 처리 상태는 `action_at`을 요구한다.
- 결재선에는 문서별 참여자·위치 unique 제약이 있다. 이는 순서 데이터의 중복 방지이지 단계 전이를 실행하지는 않는다.
- `tb_common_comment`의 현재 이벤트 CHECK에는 `APPROVED`, `REJECTED`, `RETURNED`, `DRAFT_SAVED`가 허용된다. 상신·재상신·완료 이벤트는 추가해야 한다.
- 기존에 보고된 `DRAFT_SAVED` 제약 오류와 이번 연결에서 확인한 현재 제약은 서로 다르다. 이번 메타데이터 조회만으로 오류 발생 당시의 연결 또는 migration 적용 시점은 판단할 수 없다.

### 현재 S-ERP 구현

- 초안 저장 서비스는 본문 및 결재선을 한 요청으로 저장하지만, 모든 결재·합의 참여자의 초기 `action_status`를 `WAITING`으로 저장한다.
- 컨트롤러와 서비스에는 현재 초안 생성·수정 API만 있으며 상신과 결재 처리에 따른 상태 전이·다음 단계 활성화는 없다.
- 저장 요청의 `stage_order`와 `participant_order`는 작성 화면의 단계·참여자 순서를 보존한다.

### 레거시 참고

레거시 HACCP 프로젝트는 `exe_seq`와 `arrival_at`으로 현재 처리 차례를 구분하고, 처리 뒤 다음 단계에 도착 시각을 기록한다. 시스템 메시지는 처리 상태 변경과 함께 결재 이력 테이블에 추가한다.

다만 레거시 서비스는 기안·검토·승인 순서를 고정된 순번과 업무 코드에 결합한다. S-ERP에는 해당 단계 활성화 원칙만 적용하고, 레거시의 고정 결재선 구조나 HACCP 전용 프로세스는 재사용하지 않는다. S-ERP의 공통 결재선과 `tb_common_comment` 타임라인을 유지한다.

## 승인된 처리 규칙

1. 임시저장과 결재신청은 서로 구분한다. 결재신청은 작성 화면의 최신 본문과 결재선을 포함한 한 번의 요청으로 처리한다.
2. 서버는 인증된 작성자와 문서 상태를 검증하고, 문서·결재선·시스템 메시지를 하나의 DB 트랜잭션에서 갱신한다. 실패하면 전부 롤백한다.
3. 상신 시 고정된 기안자 첫 단계는 `APPROVED`로 자동 완료하고 `action_at`을 기록한다. 상신 요청 시점에 기안자 단계를 별도 `PENDING`으로 만들지 않는다.
4. 상신 후 첫 처리 단계만 활성화한다. 활성 참여자는 `PENDING`, 그 이후 단계는 `WAITING`으로 둔다.
5. 일반 결재자는 단계 순서대로 한 명씩 처리한다. 한 합의 단계의 모든 참여자는 동시에 `PENDING`으로 활성화하며, 모두 `APPROVED`가 된 뒤 다음 단계로 이동한다.
6. `REFERENCE`는 읽기/참조 대상이며 승인 처리 대상이 아니다. 처리 상태 및 처리 시각을 갖지 않는다.
7. 현재 `PENDING` 행의 지정 참여자만 처리할 수 있다. 승인 후 같은 단계에 미완료 참여자가 있으면 그 단계에 머물고, 전부 완료되면 다음 결재/합의 단계를 활성화한다.
8. 반려는 문서 상태 `REJECTED`로 종료한다. 보완요청은 `REVISION_REQUESTED`로 전환하고 기안자가 수정 후 재상신할 수 있게 한다.
9. 재상신 시 현재 회차의 결재선 상태를 새 회차 기준으로 초기화한다. 이전 회차의 상신·결재·반려·보완요청은 append-only 시스템 메시지로 보존한다. 이전 처리 시각을 구조화된 별도 테이블로 보관하는 것은 이번 범위에 포함하지 않는다.
10. 상신 시 기안자 외에 결재 또는 합의 참여자가 최소 한 명 있어야 한다. 기안자만 있는 결재선은 임시저장은 허용하지만 상신은 거부한다.

문서 상태는 상신 직후 첫 처리자의 응답을 기다리는 동안 `PENDING`, 기안자 외 참여자가 하나라도 처리한 뒤에는 `IN_PROGRESS`, 모든 단계가 완료되면 `COMPLETED`로 둔다. 기안자만 있는 결재선은 상신에서 거부하므로 상신 즉시 완료되는 문서는 만들지 않는다.

## 데이터 모델 변경

### 결재선의 활성화 시각

`tb_electronic_approval_line_info`에 nullable `pending_at TIMESTAMP`를 추가한다.

- `WAITING`: `pending_at`, `action_at`, `action_comment`는 NULL.
- `PENDING`: 활성화할 때 `pending_at`을 기록하고 `action_at`, `action_comment`는 NULL.
- 처리 완료(`APPROVED`, `REJECTED`, `RETURNED`): `action_at` 필수. 실제 `PENDING`을 거친 행은 해당 회차의 `pending_at`을 보존한다.
- 상신 시 자동 완료되는 기안자 행은 실제 대기 단계가 아니므로 `pending_at`이 NULL일 수 있다.
- 보완 후 재상신되어 다시 활성화되면 `pending_at`을 최신 회차의 활성화 시각으로 갱신한다. 지난 회차의 이력 시각은 시스템 메시지 타임라인에 남긴다.

### 문서 유형 코드

`tb_electronic_approval_main`에 `eabus_no VARCHAR(3)`를 추가한다. 선행 0을 보존해야 하므로 숫자형을 사용하지 않는다. 값은 클라이언트 요청에서 받지 않고 서버가 `document_type`으로부터 결정한다.

| `document_type` | `eabus_no` | 문서 종류 |
|---|---:|---|
| `DRAFTING` | `001` | 기안 |
| `BUSINESS_CONTACT` | `008` | 업무연락 |
| `EXPENSE_RESOLUTION` | `004` | 지출결의서 |
| `ATTENDANCE_APPLICATION` | `031` | 근태신청서 |

DB CHECK 제약으로 유형과 코드 조합을 제한한다. 기존 문서는 `document_type`을 기준으로 backfill한 후 NOT NULL을 적용한다. backfill 후 미매핑 유형이 발견되면 임의 코드로 대체하지 않고 migration을 실패시켜 확인한다.

### 문서 상태 및 시스템 이벤트

- 문서 상태 CHECK에 종료 상태 `REJECTED`를 추가한다.
- `tb_common_comment` 시스템 이벤트 CHECK에 최소 `SUBMITTED`, `RESUBMITTED`, `COMPLETED`를 추가한다. 기존 `DRAFT_SAVED`, `APPROVED`, `REJECTED`, `RETURNED`와 USER 댓글의 `event_type IS NULL` 계약은 유지한다.
- 이벤트 행의 `created_at`, `writer_id`, `writer_name`, `event_type`, `content`가 행위자와 이벤트 시각을 보존한다.
- 현재 `submitted_at`은 최초 상신 시각으로 유지한다. 재상신 시각은 `RESUBMITTED` 이벤트의 `created_at`으로 확인하므로 별도의 `last_submitted_at`, `completed_at`, `rejected_at`, `returned_at` 컬럼을 추가하지 않는다.
- `action_status`/`action_at`은 결재선의 현재 회차 처리 상태를 나타낸다. `tb_common_comment`는 변경 불가능한 시스템 타임라인이다. 사용자 댓글 기능은 별도 범위다.

## 처리 경계와 무결성

- 결재 순서와 현재 처리 자격의 최종 판단은 백엔드가 수행한다. 프런트엔드 순서 표시만으로 진행을 허용하지 않는다.
- 상신 시 서버는 단계 번호 연속성, 각 단계의 참여 유형 일관성, 단계 내 참여자 순서, 기안자 고정 첫 단계, 기안자 외 처리 참여자 존재, 활성 사용자 및 참조 행을 검증한다.
- 상신/처리 시 문서 및 현재 활성 결재선에 대한 조건부 상태 갱신 또는 행 잠금으로 중복 처리와 동시에 발생한 중복 활성화를 차단한다.
- 상태 변경, 다음 단계 활성화, `tb_common_comment` 시스템 이벤트 삽입은 동일 트랜잭션에 둔다.
- 단계 전이 실패, 이력 삽입 실패, 유효하지 않은 상태에서의 재요청은 성공 모양의 fallback 없이 오류로 반환한다.
- `REVISION_REQUESTED` 문서를 편집·재상신할 때 작성자 검증을 메인 문서, 결재선, 일반 첨부, 임베디드 이미지 접근 경로에 일관되게 적용한다. 수정 권한은 기안자에게만 부여하고, 재상신 전 결재 처리는 허용하지 않는다.

## 대안과 선택

1. **기존 문서/결재선/공통 댓글 모델을 확장한다 — 선택.** 순서 컬럼과 행 상태를 재사용하고 필요한 `pending_at`, `eabus_no`, 문서 상태 및 이벤트 제약만 추가한다. 현재 UI와 공통 타임라인에 가장 적은 중복을 만든다.
2. **단계 테이블과 구조화된 처리 이력 테이블을 추가한다.** 회차별·행위별 구조화 보고에는 더 강하지만 `stage_order`, `action_status`, `tb_common_comment`와 정보가 중복된다. 다회차 감사를 행 단위로 조회해야 한다는 요구가 확정되지 않아 현재는 도입하지 않는다.
3. **화면에서 순서를 관리하고 저장된 행만 표시한다.** 서버 상태 전이와 권한 검증이 없어 순차 결재를 보장할 수 없으므로 채택하지 않는다.

## 범위 제외

- 일반 사용자 댓글, 대댓글, 좋아요 기능.
- 위임, 대결, 결재선 변경, 회수, 병렬 승인 유형 추가.
- 별도 결재 단계/처리이력 테이블 도입.
- 레거시 HACCP의 업무별 고정 검토자·승인자 흐름 이식.
- 화면별 결재함/조회 권한의 전체 확장. 상신 이후 처리를 위해 필요한 최소 결재 처리 API 및 현재 처리자 식별은 포함한다.

## 검증 기준

- 실제 PostgreSQL 계약과 migration 전제조건을 적용 전에 다시 확인한다. migration은 `backend/DATABASE/YYYYMMDD`와 `docs/database/YYYYMMDD`에 같은 SQL·변경 이력·롤백 파일로 관리한다.
- 신규 문서 상신은 기안자 행 자동 완료, 첫 처리 단계만 `PENDING`/`pending_at` 기록, 뒤 단계 `WAITING`, 시스템 상신 이력을 원자적으로 저장한다.
- 기안자 외 결재/합의 참여자가 없는 문서의 상신은 거부되고 임시저장 데이터는 보존된다.
- 단계별 결재는 오직 활성 참여자만 처리 가능하며, 한 결재자의 승인 후 다음 단계만 열리는지 확인한다.
- 합의 그룹은 전원 동시 활성화되고 전원 승인 전에는 뒤 단계가 열리지 않는지 확인한다.
- 참조 행은 활성화되지 않는지 확인한다.
- 반려는 종료 상태가 되고, 보완요청 후 기안자가 문서·결재선·첨부·본문 이미지를 수정·재상신할 수 있는지 확인한다. 재상신 시 새 회차 상태와 최신 `pending_at`이 적용되며 이전 회차 시스템 메시지가 남아야 한다.
- 본문/결재선/상태/시스템 이력 중 하나라도 실패하면 부분 저장되지 않는지, 중복·동시 처리 요청이 거부되는지 검증한다.
- `eabus_no` 네 유형 매핑, 선행 0 보존, 문서 유형별 DB 제약 및 기존 행 backfill을 검증한다.
- `DRAFT_SAVED` 및 새 상신/처리 이벤트가 SYSTEM으로 허용되고 USER 이벤트는 NULL인 제약을 검증한다.

## 참조

- S-ERP DB 스키마: `docs/database/db-schema.md`
- S-ERP 결재 테이블 생성 초안: `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`
- S-ERP 결재 초안 저장 서비스: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`
- S-ERP 결재 매퍼: `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`
- S-ERP 결재선 UI/payload: `frontend/src/pages/groupware/documents/write/hooks/useDocumentComposer.ts`
- 레거시 결재 흐름 참고: `D:/f1soft/dev/react/haccp-cloud/backend/src/main/java/egovframework/let/documents/haccpwork/service/impl/HaccpWorkFlowServiceImpl.java`
