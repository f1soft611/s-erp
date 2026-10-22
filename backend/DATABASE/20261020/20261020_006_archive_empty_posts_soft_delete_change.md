# 20261020_006 archive empty posts soft delete

- 날짜: 2026-10-20
- 대상 테이블: `tb_board_post` (읽기 조건에서 `tb_common_file` 참조)
- 변경 범위: `board_type_code='ARCHIVE'` 이면서 활성 첨부(`owner_type='ARCHIVE'`, `file_usage_type='ATTACHMENT'`, `deleted_yn='N'`)가 없는 게시글만 `is_deleted='Y'` 처리
- 영향 범위: 자료실(ARCHIVE) 게시글만 대상, 타 게시판/공지/파일 행 직접 변경 없음
- 적용 마커: `last_modified_by`, `last_modified_by_name`에 `archive-cleanup-20261020-006` 기록
- 롤백 조건: 위 마커가 남아 있고 현재도 활성 첨부가 없는 행만 `is_deleted='N'` 복원
- 주의사항: 실제 적용 전 read-only MCP로 비식별 집계 건수 확인 필요. MCP 미확인 시 실행 중단.
