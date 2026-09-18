# 공지사항 첨부파일 다운로드 수정 결과

## 증상

공지사항 상세 화면에서 첨부파일을 클릭해도 파일 다운로드가 되지 않았다.

## 원인

- 프론트의 공지 첨부 다운로드가 `window.open()`으로 새 요청을 만들어 API 클라이언트의 `Authorization` 헤더와 토큰 갱신을 거치지 않았다.
- 백엔드 공통 파일 다운로드 서비스가 DB 메타데이터를 설정한 뒤 응답 헤더를 `download.bin`으로 덮어쓰고, 실제 MinIO 객체 대신 테스트용 3바이트를 응답했다.

## 수정 내역

- `apiClient`에 인증 헤더를 포함한 Blob 다운로드 함수 추가
- 공지사항 및 공통 첨부 다운로드를 인증된 Blob 다운로드 경로로 변경
- 응답 `Content-Disposition`의 파일명을 브라우저 다운로드 이름에 반영
- 공통 파일 서비스가 파일 소유자 조건으로 조회한 실제 MinIO 객체를 응답 스트림에 복사하도록 수정
- 파일이 없거나 저장소를 사용할 수 없는 경우 오류 응답을 반환하도록 수정
- 다운로드 회귀 테스트의 정상 파일 스트림 픽스처 보강

## 검증

- `cd frontend; npm run test -- tests/common-content-api.test.ts`: 7개 성공
- `cd frontend; npm run build`: 성공
- `cd backend; mvn -Dtest=CommonFileServiceTest,NoticeBoardServiceImplTest test`: 11개 성공

## 영향 범위

- 공지사항 첨부파일 다운로드
- 공통 댓글 첨부파일 다운로드
- DB 스키마 변경 없음
- 별도 SQL/Rollback 스크립트 없음

## 미실행 항목

실제 MinIO와 로그인 세션을 사용하는 브라우저 수동 다운로드 검증은 실행 환경의 인증/저장소 상태가 필요해 이번 검증에서는 수행하지 않았다.
