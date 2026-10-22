# 그룹웨어 스키마 및 공통코드 스크립트 설계

## 목표

그룹웨어 기능에 필요한 PostgreSQL 테이블 생성 기준선과 공통코드 시드 스크립트를 신규 환경 구성에 재사용할 수 있도록 정리한다. 스크립트 파일만 생성하며 현재 DB에는 적용하지 않는다.

## 설계 결정

- 공유 기반 스키마인 테넌트, 로그인 계정, 사용자, 공통코드, 공통 파일, 공통 댓글 및 댓글 좋아요 테이블은 선행 구축된 것으로 전제한다.
- 그룹웨어 전용 DDL은 커뮤니티 게시판 유형/게시글/게시글 조회이력/공지 팝업 닫기 이력(`tb_board_type`, `tb_board_post`, `tb_board_post_view_history`, `tb_notice_popup_dismissal`), 기안 업무분류 및 권한(`tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`), 전자결재 본문/결재선/템플릿/핀/조회이력(`tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_electronic_approval_line_template`, `tb_electronic_approval_line_template_info`, `tb_electronic_approval_pin`, `tb_electronic_approval_view_history`) 등 총 13개 테이블을 포함한다.
- DDL은 기존 날짜별 생성 및 변경 이력과 현재 읽기 전용 DB MCP 스키마를 기준으로 구성하고, PK/FK, 유일성·검사 제약, 기본값 및 인덱스를 반영한다.
- 공통코드 시드는 현재 그룹웨어에서 확인된 `NOTICE_GUBUN`, `WF_ARCHIVE_CATEGORY`, `WF_DOC_CATEGORY`, `WF_FORM_CATEGORY`, `WF_FORM_CYCLE` 그룹과 기존 항목을 기준으로 한다. 활성 테넌트별로 생성하고 기존 `(tenant_id, group_code)` 및 `(group_id, item_code)` 키와 충돌하지 않도록 멱등하게 작성한다.
- 전자결재 상태 및 참여자 유형처럼 현행 DB 제약과 애플리케이션 값으로 관리되는 항목은 공통코드 그룹으로 새로 만들지 않는다.
- 테이블 DDL, 코드 시드, 롤백 및 변경 이력 파일은 같은 작업 번호를 사용하고 `backend/DATABASE/20261022`와 `docs/database/20261022`에 동일하게 보관한다.
- 테이블 구조 요약은 `docs/database/db-schema.md`와 일치시킨다. 작업 결과에는 DB MCP 확인 범위, 미적용 사실 및 검증 결과를 기록한다.

## 고려한 대안

1. 공유 기반 스키마를 전제로 그룹웨어 전용 테이블을 한 기준선으로 작성하고 코드 시드를 별도 파일로 둔다. 신규 구성에서 실행 순서가 단순하고 기존 기반 스키마 중복을 피할 수 있어 선택한다.
2. 기존 날짜별 마이그레이션을 순서대로 묶는다. 과거 이력은 보존되지만 여러 변경 단계와 선행 파일 실행 순서가 필요해 신규 환경 기준선으로는 불리하다.
3. 테넌트·사용자·공통 파일·댓글까지 모두 포함하는 전체 스키마 덤프를 만든다. 독립성은 있지만 기존 공유 스키마와 중복될 위험이 있어 제외한다.

## 실행 및 검증

- 기존 스키마 이력과 관련 애플리케이션의 테이블/코드 사용을 확인한 후 날짜별 작업지시서, 계획서 및 상세사양서에 실행 조건과 대상 테이블을 명시한다.
- 읽기 전용 DB MCP 결과와 기존 DDL을 대조하여 기준 스키마의 컬럼·제약·인덱스 및 코드 그룹/항목이 일치하는지 확인한다.
- 스크립트 간 선행조건, FK 참조 대상, 생성/롤백 순서, 테넌트별 코드 중복 방지 및 두 이력 경로의 파일 동일성을 검증한다.
- 생성 스크립트는 현재 DB에 실행하지 않는다.
