# 공지사항 사용자별 조회수 등록 결과

## 작업 개요

공지사항 피드에서 상세 내용을 열 때 인증된 사용자별로 공지글당 최초 1회만 조회수를 증가시키도록 구현했다.

- 작업지시서: [20260921_003 공지사항 조회수 등록](../../directions/20260921/20260921_003_공지사항_조회수_등록_작업지시서.md)
- 계획서: [20260921_003 계획서](../../plan/20260921/20260921_003_공지사항_조회수_등록_계획서.md)
- 상세 사양서: [20260921_003 상세 사양서](../../spec/20260921/20260921_003_공지사항_조회수_등록_상세사양서.md)
- 상세 실행 계획: [20260921_003 상세 실행 계획](../../plan/20260921/20260921_003_공지사항_조회수_등록_상세실행계획.md)

## 주요 변경

- `tb_board_post_view_history` 신규 테이블 추가
- 중복 기준을 `(tenant_id, post_id, login_id)` 복합 유니크 제약으로 관리
- 상세 조회 시 `LoginVO.id`를 현재 테넌트의 로그인 계정으로 해석
- 조회 이력 신규 등록에 성공한 경우에만 `tb_board_post.view_count`를 원자적으로 1 증가
- 같은 사용자 반복·새로고침·동시 요청은 중복 증가하지 않도록 처리
- 목록 조회는 조회수를 증가시키지 않음
- 공지 피드 펼침 시 상세 API를 호출하고 서버 응답의 `viewCount`를 표시
- 기존 좋아요·북마크 로컬 상태는 상세 응답 병합 시 유지

## 변경 파일 범위

### 백엔드

- 공지사항 Controller, Service, ServiceImpl
- 공지사항 DAO 및 PostgreSQL MyBatis Mapper
- `NoticeBoardServiceImplTest` 조회수 회귀 테스트

### 프론트엔드

- `CommunityNoticePage.tsx` 상세 조회 및 피드 항목 갱신
- `NoticeFeedList.tsx` 비동기 펼침 콜백 타입

### DB·문서

- `backend/DATABASE/20260921/` DDL·변경 이력·rollback
- `docs/database/20260921/` 동일 SQL 문서 세트
- `docs/database/db-schema.md`

## 검증 결과

### 통과

- `mvn "-Dtest=NoticeBoardServiceImplTest" test`
  - 16 tests, 0 failures, 0 errors, 0 skipped
  - 최초 조회, 동일 사용자 재조회, 다른 사용자, 미존재 공지 검증
- `npx vitest run tests/notice-page.test.tsx tests/notice-page-local-updates.test.tsx`
  - 통과
- `npm run build`
  - 통과
- `git diff --check`
  - 공백 오류 없음
- 수정 대상 파일 정적 오류 점검
  - 오류 없음

### 기준선 또는 무관 영역 실패

- `backend: mvn test`
  - 117 tests, 1 failure, 0 errors, 2 skipped
  - 실패: `MinioStorageConfigTest.minioDefaultsMatchProjectCredentials`
  - 원인: 기존 `MinioStorageConfig.java`의 기본 secret 값과 `application-dev.properties`/테스트 기대값 불일치
  - 공지사항 변경 파일과 무관하여 수정하지 않음
- `frontend: npm run test`
  - 40 files 중 22 passed, 18 failed; 536 tests 중 394 passed, 142 failed
  - 실패 영역: 역할 알림, 테마 설정, 기존 디버그 타임아웃 등
  - 공지사항 집중 테스트는 통과했으며 `npm run build`도 통과
- 브라우저 캡처
  - 공유 브라우저 페이지 ID가 현재 도구 세션에서 조회되지 않아 Playwright 캡처를 수집하지 못함
  - DOM 기반 공지사항 집중 테스트와 프론트 빌드로 대체 검증

## 리뷰 판정

- 사양 준수: 통과
- 코드 품질: 승인
- 테넌트·사용자 식별: 서버 인증 컨텍스트의 `LoginVO.tenantId` 및 `LoginVO.id` 사용
- 동시성: DB 복합 유니크 제약과 PostgreSQL `ON CONFLICT DO NOTHING` 사용
- API 호환성: 기존 상세 API 경로·ResultVO 구조 유지, `item.viewCount`만 서버 값으로 갱신
- 잔여 리스크: 실제 DB에 신규 DDL이 적용되지 않은 환경에서는 상세 조회 시 조회 이력 등록이 실패할 수 있으므로 배포 전 migration 적용 필요

## 결론

공지사항 조회수 기능은 승인된 사용자별 최초 1회 증가 정책에 맞게 구현되었고, 관련 집중 테스트와 프론트 빌드를 통과했다. 전체 백엔드·프론트 테스트에는 이번 변경과 무관한 기존 실패가 남아 있어 전체 테스트 기준으로는 완전한 Green 상태가 아니다.
