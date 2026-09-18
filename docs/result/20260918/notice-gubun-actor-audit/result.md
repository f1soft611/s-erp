# 공지사항 구분코드 및 행위자 감사정보 결과

## 작업 개요

`NOTICE_GUBUN` 공통코드를 공지사항 목록 필터와 작성/수정 화면에 연결하고, 공지사항 및 댓글/답글의 등록·수정·삭제 행위자 정보를 백엔드 인증 사용자 기준으로 저장하도록 보완했다.

## 관련 문서

- 작업지시서: [20260918*008*공지사항*구분코드*행위자감사정보\_작업지시서.md](../../../directions/20260918/20260918_008_공지사항_구분코드_행위자감사정보_작업지시서.md)
- 계획서: [20260918*008*공지사항*구분코드*행위자감사정보\_계획서.md](../../../plan/20260918/20260918_008_공지사항_구분코드_행위자감사정보_계획서.md)
- 사양서: [20260918*008*공지사항*구분코드*행위자감사정보\_사양서.md](../../../spec/20260918/20260918_008_공지사항_구분코드_행위자감사정보_사양서.md)

## 주요 변경

- 공지사항 API 타입과 백엔드 VO/Mapper에 `notice_gubun_code` 계약 추가
- 공지 목록 query에 `noticeGubunCode` 필터 추가
- 작성/수정 모달 제목 위에 공통코드 구분 선택 추가
- 공지 등록·수정·삭제는 Controller의 `LoginVO.id/name`을 서비스에 전달
- 공지 payload의 `writerId`/`writerName`은 서버 저장값으로 사용하지 않음
- 댓글/답글 수정·삭제 최신 행위자 ID/이름 저장 추가
- 기존 댓글 작성자 ID 기반 수정·삭제 권한 조건 유지
- 공지 첨부 SQL을 `tb_board_file`이 아닌 `tb_common_file` 기준으로 정정
- `tb_common_file.file_usage_type`을 유지해 일반 첨부(`ATTACHMENT`)와 본문 이미지(`EMBEDDED`)를 구분
- `tb_board_post`, `tb_common_comment` 마이그레이션 및 롤백 세트 작성

## 검증 결과

### 통과

- 파일 진단: 관련 Java/TypeScript/XML 파일 오류 없음
- `mvn "-Dmaven.resources.skip=true" "-Dtest=CommonCommentServiceTest" test`: 16개 통과
- `mvn "-Dmaven.resources.skip=true" "-Dtest=NoticeBoardServiceImplTest" test`: 7개 통과
- `npm run test -- tests/notice-composer-payload.test.ts --reporter=dot`: 8개 통과
- `mvn "-Dmaven.resources.skip=true" "-Dtest=NoticeBoardServiceImplTest,CommonFileServiceTest,CommonCommentServiceTest" test`: 28개 통과
- MCP에서 `tb_common_file.file_usage_type` 계약 확인 후 SQL/XML 오류 없음
- DB 스키마 추적 문서의 `file_usage_type` 대상 테이블을 `tb_common_file`로 통일하고 Backend/Docs SQL·롤백·변경이력을 정정
- `mvn -q "-Dmaven.resources.skip=true" "-Dtest=NoticeBoardServiceImplTest,CommonFileServiceTest,CommonCommentServiceTest" test`: 23개 통과

### 차단 또는 잔여 이슈

- `npm run build`: 최신 재실행에서 오류 없이 통과했다.
- 공지 페이지 회귀 테스트: `notice-page-local-updates.test.tsx`는 23개 통과. `notice-page.test.tsx`는 기존 댓글 이전 로더 기대 테스트 16개가 실패했다.
- 브라우저 검증: `http://127.0.0.1:4173/login`까지 접근했으나 백엔드 `/auth/refresh`가 CORS/연결 실패하여 인증 후 공지 화면 캡처를 생성하지 못했다.

## DB 변경 이력

- [Backend SQL](../../../backend/DATABASE/20260918/20260918_008_notice_gubun_actor_audit.sql)
- [Backend 롤백](../../../backend/DATABASE/20260918/20260918_008_rollback.sql)
- [Backend 변경 이력](../../../backend/DATABASE/20260918/20260918_008_notice_gubun_actor_audit_change_schema.md)
- [Docs SQL](../../../database/20260918/20260918_008_notice_gubun_actor_audit.sql)
- [누적 스키마](../../../database/db-schema.md)

## 리뷰 판정

- 사양 준수: 부분 통과. 백엔드 계약, 공통코드 연결, 첨부 용도 타입 정정, 프론트 빌드는 통과했으나 기존 페이지 회귀 테스트와 브라우저 검증은 미완료.
- 코드 품질: 관련 파일 진단 및 핵심 백엔드 테스트 통과. 전체 빌드와 페이지 회귀 테스트 차단 이슈를 해결한 후 최종 승인 필요.
- 통합: 사용자 선택 전 현재 브랜치 상태를 유지한다.
