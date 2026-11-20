# 문서현황 상세검색 공통 배치 적용 결과

- 범위: `documentStatusColumns.tsx` 검색 메타데이터만 변경 (결재신청일 `span: 2`, 텍스트/선택 그룹 재배치). 공통 `PageSearchArea`의 빠른 날짜 버튼(`오늘/이번주/이번달/전월/최근 30일`)이 필수 날짜 필드에 자동 적용된다.
- 기준 화면: 영업관리 수주현황/견적현황 (커밋 9a9b0729).
- 검증: `document-status-page`, `page-search-area-detail` Vitest.
- 미수행: 375/768/1280px 실제 브라우저 스크린샷 확인.

## 커밋 제안

제목: feat(frontend): 문서현황 상세검색 빠른 날짜·그룹 배치 적용
