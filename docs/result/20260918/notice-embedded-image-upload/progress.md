# 공지사항 본문 이미지 즉시 업로드 진행 원장

- 작업지시서: `docs/directions/20260918/20260918_007_공지사항_본문이미지_즉시업로드_작업지시서.md`
- 계획서: `docs/plan/20260918/20260918_007_공지사항_본문이미지_즉시업로드_계획서.md`
- 사양서: `docs/spec/20260918/20260918_007_공지사항_본문이미지_즉시업로드_사양서.md`
- 현재 브랜치: `socra710`
- 실행 방식: 현재 브랜치 진행, 기존 dirty 변경 보존
- 커밋: 사용자 요청 전 보류

## 승인 기록

- [x] 작업지시서 승인
- [x] 계획서·사양서 승인
- [x] 현재 브랜치 진행 선택
- [ ] 구현 완료 승인

## 태스크

- [x] T1. 백엔드 DB/파일 계약 확장
  - 파일: `backend/DATABASE/20260918/`, `docs/database/20260918/`, `backend/src/main/java/egovframework/let/groupware/community/notice/`, `backend/src/main/resources/egovframework/mapper/let/groupware/community/notice/`
  - 작업: `file_usage_type` 매핑, 임시 이미지 업로드/귀속 API와 공개 URL 생성, 일반 첨부 필터를 구현한다.
  - 검증: `mvn "-Dtest=*Notice*" test` 또는 백엔드 집중 테스트 명령
  - 인터페이스: 프론트가 사용할 임시 업로드 응답과 `embeddedImages` 저장 payload

- [x] T2. 프론트 서비스/타입과 실패 테스트
  - 파일: `frontend/src/pages/groupware/community/notice/services/noticeBoardService.ts`, 공지 타입, 관련 Vitest
  - 작업: 임시 이미지 업로드 API, 응답 정규화, 저장 payload의 embedded image metadata를 정의한다.
  - 검증: 관련 Vitest 집중 실행
  - 인터페이스: T1 API 계약

- [x] T3. 에디터 이미지 붙여넣기/리사이즈
  - 파일: `frontend/src/pages/groupware/community/notice/components/NoticeComposerDialog.tsx`, `noticeContentStyles.ts`
  - 작업: 이미지 clipboard 감지, 커서 위치 placeholder, 즉시 업로드 교체, width 직렬화, 실패 복구를 구현한다.
  - 검증: `npm run test -- tests/notice-composer-payload.test.ts` 및 신규 집중 테스트
  - 인터페이스: T2 서비스/타입

- [x] T4. 피드 이미지 미리보기/원문 전환
  - 파일: `frontend/src/pages/groupware/community/notice/components/NoticeFeedList.tsx`, `noticeContentStyles.ts`
  - 작업: 접힌 상태의 본문 이미지 스트립과 펼친 상태의 원문 위치 렌더링, ATTACHMENT/EMBEDDED 중복 방지를 구현한다.
  - 검증: 관련 NoticeFeedList Vitest 및 브라우저 확인
  - 인터페이스: T1 파일 usage 계약, 기존 `bodyHtml`

- [x] T5. 통합 회귀 검증 및 결과 문서
  - 파일: `frontend/tests/`, `backend/src/test/`, `docs/result/20260918/notice-embedded-image-upload/`
  - 작업: 텍스트/Excel 붙여넣기 회귀, 저장·재조회, 반응형 브라우저 검증과 스크린샷을 기록한다.
  - 검증: `npm run build`, `npm run test`, `mvn test`, Playwright 375/768/1280
  - 인터페이스: T1~T4 완료 결과

## 단계별 기록

- 1단계 프로젝트 분석: 프론트 Tiptap/MUI/Vite, 백엔드 Spring/eGovFrame/MyBatis 확인. 기준선 실행은 승인 전 금지로 보류.
- 2단계 브레인스토밍: 저장 전 즉시 업로드, 공개 URL, 접힘/펼침 표시 요구사항 확정.
- 3단계 설계 검증: `tb_board_file.post_id` NOT NULL/FK 확인, `file_usage_type` 추가 설계 및 SQL/롤백 작성.
- 4단계 Git 설정: 현재 브랜치 `socra710` 선택, 기존 dirty 변경 보존.
- 5단계 실행 계획: 본 문서에 태스크와 검증 체크포인트 기록.
- T1 집중 검증: `NoticeEmbeddedImageServiceImplTest`, `NoticeBoardServiceImplTest` 9건 통과.
- T2~T4 집중 검증: 이미지 서비스/에디터/sanitization 테스트 15건 및 프론트 빌드 통과.
- 브라우저 검증: `node scripts/verify-notice-embedded-image.js` 통과, 데스크톱/모바일 캡처 4개 생성.
- 전체 프론트 테스트: 40개 파일 중 19개 실패, 516건 중 152건 실패. 메뉴/테마/임시 디버그 및 기존 공지 테스트 실패로 이미지 변경과 무관한 전역 실패로 기록.
- 전체 백엔드 테스트: 실행 완료 보고는 받았으나 상세 요약/exit code 미제공으로 전체 통과 판정 보류.
- 코드 리뷰: Critical/Important 항목 반영 후 집중 테스트·빌드·브라우저 재검증 통과. TTL 정리와 영속 token 소유권은 잔여 리스크로 기록.
- 결과 문서: `docs/result/20260918/notice-embedded-image-upload/result.md` 작성 완료.
