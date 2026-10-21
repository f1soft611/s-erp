# 문서작성 피드형·리스트형 페이징 결과

## 구현 요약
- 문서작성 `/documents`: `offset`/`limit`(1~20, 기본 20) 페이지 응답(`resultList`, `totalRowCount`). 고정 문서는 서버에서 제외하고 일반 문서만 페이징.
- 문서 현황은 기간 조회이므로 `/documents/search`로 분리(기존 limit 200 유지).
- 프론트: `useDocumentWritePage`의 `loadMore`/`retryLoadMore`, 공통 `ViewModePagination`(IntersectionObserver, 스피너, 오류 재시도)을 `FeedView`/`ListView`에 연결.

## 검증
- 백엔드: `mvn "-Dtest=DocumentApprovalApiControllerTest,DocumentApprovalServiceImplTest,DocumentApprovalMapperTest" test` 통과.
- 프론트: `tsc -b`, `npm run build` 통과. 관련 테스트(`document-approval-service`, `use-document-write-page*`, `common-view-mode`, `document-status-service`, `document-file-page`, `document-status-page`) 통과.
- 훅 회귀: offset 20 append, 중복 제거, 종료 조건, 중복 loadMore 차단, 실패 후 같은 offset 재시도.
- 남은 실패: `document-status-page`의 "derives detailed search fields…"(컬럼 메타 10 vs 11)는 본 작업 이전부터 있던 미커밋 그리드 작업과 관련되며 페이징과 무관.
- 전체 `npm run test`의 다른 실패(menu-management, dashboard-sidebar 등)는 본 변경 범위 밖.
- 브라우저(375/768/1280px) 스크린샷 검증은 이번 결과에 포함하지 않았음(미수행).

## DB
- 스키마 변경 없음. DB MCP `s-erp-postgresql-readonly`로 `tb_electronic_approval_main`, `tb_electronic_approval_pin`, `tb_electronic_approval_line_info`를 `list_tables`/`describe_table`로 확인.

## 이력
- `/documents` 공용 사용 충돌 발견 → 사용자 지시로 문서 현황 전용 `/documents/search` 분리.
