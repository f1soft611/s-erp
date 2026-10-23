# 20261022_009 그룹웨어 스키마 및 공통코드 기준선

- 변경일: 2026-10-22
- 대상 테이블: `tb_board_type`, `tb_board_post`, `tb_board_post_view_history`, `tb_notice_popup_dismissal`, `tb_drafting_work_category_group`, `tb_drafting_work_category`, `tb_drafting_work_category_authority`, `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_electronic_approval_line_template`, `tb_electronic_approval_line_template_info`, `tb_electronic_approval_pin`, `tb_electronic_approval_view_history`
- 추가 데이터: 활성 테넌트별 그룹웨어 공통코드 그룹 5개와 상세 항목 23개
- 공유 선행 스키마: 테넌트/모듈/메뉴, 로그인 계정/사용자, 공통코드 그룹/항목, 공통 파일, 공통 댓글 및 댓글 좋아요
- 변경 내용:
  - 신규 환경에서 사용할 그룹웨어 전용 13개 테이블 DDL 기준선 작성
  - 현행 스키마의 PK/FK, 검사/유일성 제약, 기본값 및 조회 인덱스 반영
  - 공통코드 `NOTICE_GUBUN`, `WF_ARCHIVE_CATEGORY`, `WF_DOC_CATEGORY`, `WF_FORM_CATEGORY`, `WF_FORM_CYCLE` 시드 작성
  - 시드는 활성 테넌트만 대상으로 하고 기존 그룹/상세 코드 충돌 시 덮어쓰지 않음
- 영향 범위: 새 환경의 그룹웨어 커뮤니티, 공지 팝업, 기안분류, 전자결재 테이블과 공통코드 구성
- 기존 데이터 영향: 없음. 스크립트는 읽기 전용 MCP로 구조/코드 계약만 확인했으며 현재 DB에 적용하지 않음
- 실행 조건: 공유 선행 스키마 생성 이후, 대상 13개 그룹웨어 테이블이 없는 신규 환경에서만 기준 DDL 실행
- 롤백: 그룹웨어 테이블 13개를 FK 역순으로 제거 가능. 공통코드 시드는 기존 코드와 생성 코드의 소유를 구분할 수 없어 자동 삭제하지 않음
- 적용 상태: 작성 완료, 현재 DB 미적용
