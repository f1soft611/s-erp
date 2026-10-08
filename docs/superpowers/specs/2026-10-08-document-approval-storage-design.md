# 문서 결재 저장 구조 설계

## 목적

문서작성 화면의 초안/결재선 저장과 결재 처리 알림을 S-ERP PostgreSQL에 저장한다. 기존 공통 첨부·댓글 구조를 재사용하고, tenant DB의 레거시 결재 스키마를 그대로 복제하지 않는다.

## 확인된 현재 계약

- `s-erp_central`에는 `tb_drafting_work_category`, `tb_drafting_work_category_authority`, `tb_drafting_work_category_group`이 이미 존재한다. 신규 생성하지 않고 기존 기안 업무 분류 계약을 참조한다.
- `s-erp_central`에는 `tb_common_file`, `tb_common_comment`가 존재한다. 파일/댓글 메타데이터와 API가 `tenant_id`, `owner_type`, `owner_id`를 사용한다.
- `tb_common_comment`는 댓글 작성자/내용, 대댓글, soft delete 및 수정 행위자 필드를 갖는다. 문서 일반 댓글은 현재 필드로 표현 가능하다.
- tenant `tb_electronic_approval_main`에는 S-ERP에서 아직 계약하지 않은 다수의 레거시 필수 코드/상태 필드가 있다. 이를 그대로 이식하지 않고 현재 문서작성 기능에 맞는 S-ERP 계약을 정의한다.
- tenant `tb_electronic_approval_line_info`는 결재 참여자와 단계별 처리 상태/시각을 포함하지만, 반복되는 행위를 별도 append-only 이벤트 행으로 저장하는 구조는 아니다.
- tenant `tb_electronic_approval_history_main`은 결재 행위/의견 성격의 레거시 테이블이며 일반 문서 댓글이 아니다. `tb_electronic_approval_history_like`는 그 이력 행에 종속된 좋아요다. 둘 다 이번 생성 범위에서 제외한다.

## 승인된 범위

1. S-ERP 문서 본문/초안 테이블 `tb_electronic_approval_main` 생성.
2. 문서별 결재 단계/참여자 테이블 `tb_electronic_approval_line_info` 생성.
3. 일반 댓글은 기존 `tb_common_comment` 재사용.
4. 공통 댓글에 사용자 댓글과 시스템 결재 이벤트를 구분할 필드를 추가한다.
5. 신규 `tb_common_comment_like`를 만들어 일반 댓글 좋아요를 저장한다.
6. 시스템 결재 메시지에는 좋아요를 허용하지 않는다.
7. 파일 첨부는 기존 `tb_common_file`을 `owner_type='APPROVAL'`, `owner_id=<electronic_approval_id>`로 재사용한다. `tb_document_attachment`는 생성하지 않는다.
8. 기안 업무 분류 세 테이블, `tb_electronic_approval_history_main`, `tb_electronic_approval_history_like`는 생성하지 않는다.

### 공통 댓글과 별도 이벤트 테이블 결정

- 승인 처리 메시지는 일반 댓글과 같은 화면 타임라인에 표시하는 시스템 댓글로 저장한다. 따라서 이번 범위에서는 결재 이벤트 전용 테이블을 추가하지 않는다.
- 이는 사용자 댓글과 시스템 처리 메시지를 함께 표시하고 결재선 테이블과의 이벤트 원장 중복을 피하기 위한 선택이다.
- `tb_common_comment` 시스템 행은 append-only로 취급하지만, 기존 일반 댓글의 soft-delete 수명주기와 같은 테이블에 있으므로 별도의 법적/감사 원장으로 간주하지 않는다.
- 향후 규정상 독립적이고 변경 불가한 처리 이력이 요구되면 전용 결재 이벤트 테이블을 별도로 설계하고, 공통 댓글에는 화면 표시용 메시지를 복제할지 여부를 재검토한다.

## 데이터 흐름과 책임

### 초안/문서 저장

- 문서 본문 테이블에서 문서 ID를 발급한다.
- 선택한 기존 기안 업무 분류, 제목, 본문 HTML/JSON, 작성자/부서 스냅샷, 초안/상신 상태, 생성/수정 감사 정보를 저장한다.
- 결재 단계의 각 참여자를 `tb_electronic_approval_line_info`의 별도 행으로 저장한다. 합의 그룹은 동일한 단계 번호와 합의 유형을 공유하며 단계 내 참여자 순서를 별도로 보존한다. 현재 작성 화면의 참조자도 저장/재조회 시 보존할 수 있도록 같은 테이블에 별도 `REFERENCE` 참여 유형으로 저장하고, 결재 처리 대상에서는 제외한다.
- 본문과 결재선은 동일한 트랜잭션에서 저장한다.
- 첨부파일 업로드는 문서 ID를 확보한 후 공통 파일 API에 연결한다. 저장 전 임시 첨부를 허용하려면 별도 임시 소유권 승격 계약을 후속 설계한다.

### 결재 처리와 시스템 메시지

- `tb_electronic_approval_line_info`에는 각 결재 참여자의 처리 상태, 처리 유형, 처리 시각 및 처리 의견 등 결재자가 어떻게 처리했는지와 현재 결재선 화면에 필요한 값을 저장한다. 이 테이블은 승인/반려 등 각 참여자의 처리 결과를 보관하고, 결재 이벤트 댓글은 같은 처리 결과의 사람이 읽는 타임라인 표현을 제공한다.
- 성공한 결재 처리마다 `tb_common_comment`에 시스템 이벤트 행을 append-only로 추가한다. `owner_type='APPROVAL'`, `owner_id=<electronic_approval_id>`, `comment_type='SYSTEM'`, 안정된 `event_type` 코드, 행위자 ID/이름 스냅샷과 표시 메시지를 저장한다.
- 사용자 일반 댓글은 `comment_type='USER'`로 저장하며 기존 대댓글·수정·삭제 흐름을 유지한다.
- 결재선 상태 변경과 시스템 이벤트 추가는 같은 DB 트랜잭션에서 처리한다. 둘 중 하나가 실패하면 둘 다 rollback한다.
- `line_info`는 결재 참여자별 구조화된 처리 결과의 원본이다. 시스템 댓글은 문서 타임라인에 처리 알림을 제공하되, 별도 감사 원장이나 승인 상태의 대체 원본으로 사용하지 않는다.

### 댓글 좋아요

- `tb_common_comment_like`는 tenant, comment, 사용자별 좋아요를 저장하며 `(tenant_id, comment_id, user_id)` 유일성을 보장한다.
- 사용자 ID는 인증된 S-ERP 사용자 키를 사용하고, 클라이언트 입력 사용자 ID를 신뢰하지 않는다.
- 시스템 이벤트 댓글에 대한 좋아요 등록은 service/API에서 거부한다.
- 좋아요 수는 원장 컬럼에 중복 저장하지 않고 좋아요 행을 집계한다. 좋아요 취소/삭제 정책과 사용자 키 컬럼 타입은 상세 사양에서 확정한다.

## 공통 댓글 컬럼/호환성

- 기존 행은 일반 댓글로 해석되도록 신규 유형 컬럼의 기본값을 `USER`로 둔다.
- 시스템 이벤트 구분용 `event_type`은 일반 댓글에서 NULL이고 시스템 이벤트에서는 필수로 검증한다.
- `content`, 기존 writer/last-modified 필드, 대댓글 및 soft-delete 계약은 보존한다.
- 시스템 이벤트는 일반 댓글 수정/삭제 서비스에서 변경할 수 없도록 백엔드 서비스 계층에서 차단하고, 승인 처리 전용 서비스 경로만 시스템 이벤트를 생성한다.
- 프론트엔드는 `comment_type`으로 `[시스템]` 표시와 편집/삭제/좋아요 액션 비노출을 결정한다.

## 권한 및 보안 요구사항

- 기존 공통 댓글/파일 API는 인증 및 tenant 정보를 확인하지만, 코드 조사에서 결재 문서 단위 권한 확인이 확인되지 않았다. 전자결재 UI와 연결하기 전 문서 열람/참여 권한 검사를 API/service 경계에 추가하거나 기존 권한 가드를 재사용해야 한다.
- 사용자는 문서 접근 권한이 없으면 해당 문서의 댓글, 시스템 메시지, 좋아요, 첨부파일도 조회/변경할 수 없어야 한다.
- 행위자 ID/이름은 인증 principal에서 설정한다. 시스템 메시지 내용을 요청자가 임의로 제출하도록 허용하지 않는다.
- 테이블은 `tenant_id`를 포함하고 모든 조회/변경은 인증된 tenant에 한정한다.

## 마이그레이션 산출물

- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema.sql`
- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema_change_schema.md`
- `backend/DATABASE/20261008/20261008_003_create_document_approval_schema_rollback.sql`
- 동일한 세 파일을 `docs/database/20261008/`에도 보관한다.
- `docs/database/db-schema.md`에 신규 테이블과 공통 댓글 추가 컬럼을 반영한다.
- DDL 스크립트만 작성하며 MCP나 다른 도구로 실제 DB에 적용하지 않는다.

## 상세 사양 확정 전 해결할 항목

- S-ERP 문서 ID, tenant/user/department 키 타입 및 기존 기안 분류 FK 계약.
- 문서 본문 저장 포맷과 임시저장/상신 상태 전이 및 필수 필드.
- 결재/합의 참여자별 상태 값과 그룹 내 순번, 동시/순차 합의 처리 규칙.
- `comment_type`/`event_type` 제약값, 시스템 메시지 코드와 생성 시점.
- 좋아요 사용자 키, FK/삭제 정책 및 unlike 동작.
- 문서별 API 인가 규칙과 기존 공통 댓글/파일 API를 확장하는 방법.

## 비목표

- 실제 승인, 반려, 회수, 재상신 API 구현.
- 전자결재 감사 이벤트 전용 별도 테이블.
- `tb_document_attachment` 및 레거시 history 테이블 생성.
- 기안 분류 테이블 중복 생성 또는 기존 운영 DB로 DDL 직접 적용.
