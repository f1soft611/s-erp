# 20260918_007 공지사항 본문 이미지 용도 구분 변경 이력

- 날짜: 2026-09-18
- 변경 내용: `tb_board_file.file_usage_type` 컬럼과 허용값 제약 추가
- 적용 대상: `tb_board_file`
- 기본값: `ATTACHMENT`
- 허용값: `ATTACHMENT`, `EMBEDDED`
- 영향 범위: 공지사항 본문 이미지와 일반 첨부파일의 조회·삭제·표시 구분
- DB 변경: 컬럼 추가 및 CHECK 제약 추가
- 롤백: `20260918_007_add_board_file_usage_type_rollback.sql`
- MCP 확인 근거: `tb_board_file.post_id`가 NOT NULL이며 `tb_board_post` FK를 가지므로 게시글 생성 전 임시 이미지를 기존 첨부 행으로 저장할 수 없어, 임시 객체 업로드 후 게시글 저장 시 메타데이터를 등록하는 방식으로 설계함.
