# 20261117_008 거래명세서 발행 정책 변경 이력

- 날짜: 2026-11-17
- 변경 내용: `tb_system_policy`에 테넌트별 `STATEMENT_ISSUE_MODE`(SELECT: AUTO/MANUAL, 기본 MANUAL) 행 추가, `tb_menu` "거래명세서등록" → "거래명세서발행" 명칭 변경.
- 적용 대상 테이블: `tb_system_policy`, `tb_menu` (스키마 변경 없음, 데이터 시드/수정)
- 영향 범위: 출하등록(`SalesDeliveryServiceImpl.createDelivery`)이 AUTO일 때 같은 트랜잭션에서 거래명세서를 자동 발행. 메뉴명 표시.
- 롤백: `20261117_008_rollback_statement_issue_policy.sql` (정책 삭제, 메뉴명 복원). 이미 자동 발행된 명세서는 롤백 대상이 아니다.
- MCP 확인: `tb_system_policy` 구조 및 메뉴 id 41 확인.
