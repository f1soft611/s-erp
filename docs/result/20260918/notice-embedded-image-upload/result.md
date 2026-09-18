# 공지사항 본문 이미지 즉시 업로드 결과

## 작업 개요

공지사항 에디터에서 클립보드 이미지를 현재 커서 위치에 삽입하고, 저장 전 MinIO 임시 객체로 업로드한 뒤 공개 URL을 본문 이미지 노드에 반영했다. 피드 접힘 상태에서는 첨부파일 영역 위 이미지 스트립을 표시하고, 펼침 상태에서는 본문 원래 위치의 이미지와 텍스트 순서를 유지한다.

## 관련 문서

- 작업지시서: [20260918*007*공지사항*본문이미지*즉시업로드\_작업지시서.md](../../../directions/20260918/20260918_007_공지사항_본문이미지_즉시업로드_작업지시서.md)
- 계획서: [20260918*007*공지사항*본문이미지*즉시업로드\_계획서.md](../../../plan/20260918/20260918_007_공지사항_본문이미지_즉시업로드_계획서.md)
- 사양서: [20260918*007*공지사항*본문이미지*즉시업로드\_사양서.md](../../../spec/20260918/20260918_007_공지사항_본문이미지_즉시업로드_사양서.md)
- 진행 원장: [progress.md](progress.md)

## 주요 변경

- 백엔드 임시 이미지 업로드 API 추가: `POST /api/v1/groupware/boards/notice/embedded-images/temp`
- PNG/JPEG/GIF/WebP signature, MIME, 최대 크기 검증 및 공개 URL 응답
- 게시글 저장 payload의 `embeddedImages` 역직렬화 및 `tb_board_file.file_usage_type=EMBEDDED` 귀속
- 임베드 파일과 일반 첨부파일의 피드 표시 분리
- Tiptap Image 확장, 현재 커서 위치 placeholder 삽입, 업로드 성공 교체 및 실패 제거
- 이미지 resize node view와 width/height sanitization
- 접힌 피드 이미지 스트립, 펼친 피드 원문 이미지, 이미지 로드 실패 대체 문구
- 375px 모바일 및 1280px 데스크톱 Playwright 검증 스크립트/캡처 추가

## DB 변경

- [backend SQL](../../../../backend/DATABASE/20260918/20260918_007_add_board_file_usage_type.sql)
- [backend rollback](../../../../backend/DATABASE/20260918/20260918_007_add_board_file_usage_type_rollback.sql)
- [변경 이력](../../../../backend/DATABASE/20260918/20260918_007_add_board_file_usage_type_change_schema.md)
- [docs SQL](../../../database/20260918/20260918_007_add_board_file_usage_type.sql)
- [누적 스키마](../../../database/db-schema.md)

## 검증 증거

- 백엔드 집중 테스트: `mvn "-Dmaven.resources.skip=true" "-Dtest=NoticeEmbeddedImageServiceImplTest,NoticeBoardServiceImplTest" test` - 9건 통과
- 프론트 집중 테스트: 관련 3개 파일 - 15건 통과
- 프론트 빌드: `npm run build` - 성공
- 브라우저: `node scripts/verify-notice-embedded-image.js` - `Embedded image browser verification passed.`
- 캡처:
  - [작성 에디터 이미지](screenshots/01_composer-embedded-image.png)
  - [접힌 피드 데스크톱](screenshots/02_feed-collapsed-desktop.png)
  - [펼친 피드 데스크톱](screenshots/03_feed-expanded-desktop.png)
  - [펼친 피드 모바일](screenshots/04_feed-expanded-mobile.png)

## 테스트 제한 및 잔여 리스크

- 전체 프론트 스위트는 40개 파일 중 19개 파일, 516건 중 152건이 실패했다. 실패 예시는 메뉴/테마 초기화, 임시 디버그 테스트, 기존 공지 댓글 기대와 관련되어 이미지 집중 테스트와 무관하다. 이번 작업의 변경 범위에는 포함하지 않았다.
- 백엔드 전체 테스트는 실행 명령이 완료 보고되었으나 도구가 최종 요약과 exit code를 제공하지 않아 전체 통과로 판정하지 않았다. 집중 테스트 결과만 완료 근거로 사용한다.
- 임시 MinIO 객체의 TTL 정리 작업과 token-사용자 매핑의 영속 저장은 추가 운영 저장소/스케줄러 설계가 필요하다. 현재 구현은 tenant + uploadToken object key prefix 검증을 수행한다.
- 공개 URL은 인증 없이 접근 가능하므로 운영 환경에서 민감한 이미지를 업로드하지 않는 정책과 공개 endpoint 설정이 필요하다.

## 코드 리뷰 판정

- 사양 준수: 집중 기능 범위 통과
- 코드 품질: Critical/Important 지적 반영 후 집중 테스트·빌드·브라우저 재검증 통과
- 보류 항목: 임시 객체 TTL 및 영속 token 소유권 정책
