# 20261015_003 커뮤니티 게시글 테넌트 및 공통 분류 스키마 변경 이력

- 변경 일자: 2026-10-15
- 변경 내용: `tb_board_post.notice_gubun_code`를 `category_code`로 변경하고, 필수 `tenant_id`를 추가해 기존 게시글을 단일 tenant로 백필
- 적용 대상 테이블: `tb_board_post`, `tb_tenant`
- 영향 범위: 공지사항/자료실 게시글의 테넌트 소유권, 게시판 종류별 조회 인덱스, 공통 분류코드 저장
- 백필 안전성: 트랜잭션 시작 후 `tb_tenant`를 SHARE 잠금하여 tenant 추가를 차단하고, 정확히 한 행인 경우에만 게시글을 해당 tenant로 백필한다. 행 수가 1이 아니면 예외로 전체 트랜잭션이 롤백된다.
- 제약 및 인덱스: `tenant_id` NOT NULL 및 `tb_tenant(tenant_id)` FK, `(tenant_id, board_type_code, created_at DESC, post_id DESC)` 인덱스 추가
- 롤백: `20261015_003_rollback.sql`은 `tb_board_post`를 잠근 뒤 서로 다른 tenant에 할당된 게시글이 2개 이상이면 중단한다. 안전한 경우 인덱스/FK/tenant 컬럼을 제거하고 `category_code`를 `notice_gubun_code`로 복구한다.
- 적용 상태: 마이그레이션 초안이며 실제 DB 적용 전 검토 및 배포 절차가 필요하다.
