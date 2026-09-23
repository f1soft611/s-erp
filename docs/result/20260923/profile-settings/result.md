# 20260923_009 프로필 내 정보 관리·보안 설정 결과

## 작업 개요

프로필 팝오버의 `내 정보 관리`와 `보안 설정`을 실제 화면과 API에 연결했다. 이메일·프로필 이미지·도장 이미지 저장, 비밀번호 변경, 이미지 정규화, JWT 헤더 크기 회귀를 함께 처리했다.

## 관련 문서

- 작업지시서: [20260923*009*프로필*내정보*보안설정\_작업지시서.md](../../directions/20260923/20260923_009_프로필_내정보_보안설정_작업지시서.md)
- 계획서: [20260923*009*프로필*내정보*보안설정\_계획서.md](../../plan/20260923/20260923_009_프로필_내정보_보안설정_계획서.md)
- 상세 사양서: [20260923*009*프로필*내정보*보안설정\_상세사양서.md](../../spec/20260923/20260923_009_프로필_내정보_보안설정_상세사양서.md)
- 상세 실행 계획: [20260923*009*프로필*내정보*보안설정\_상세실행계획.md](../../plan/20260923/20260923_009_프로필_내정보_보안설정_상세실행계획.md)
- 작업 원장: [progress.md](progress.md)

## 주요 변경

- `DashboardPage`의 프로필 메뉴를 `/dashboard/profile`, `/dashboard/security`로 연결
- 프로필·보안 독립 페이지와 프론트 서비스/타입 추가
- 본인 프로필 조회·수정 및 비밀번호 변경 API 추가
- 이메일은 `tb_user.email_addr`, 이미지는 기존 `tb_login_account.profile_image`·`stamp_image` 컬럼 재사용
- PNG/JPEG Data URL을 서버에서 실제 디코드하고 1MB·512px 제한 및 리사이즈 적용
- 비밀번호 변경 시 현재 비밀번호 검증, 새 해시·`password_changed_at` 갱신
- 프로필 이미지 본문을 JWT access/refresh claims에서 제거
- `menus/my`는 JWT가 아닌 프로필 조회 결과로 최신 프로필 이미지를 표시하고 조회 실패 시 fallback

## 로그인 헤더 오류 원인 및 해결

프로필 이미지를 JWT claims에 저장하고 있어 이미지 Data URL이 `Authorization` 헤더로 반복 전송됐다. 이미지 저장 후 로그인/보호 API 요청에서 Tomcat의 `요청 헤더가 너무 큽니다`가 발생할 수 있었다.

`EgovJwtTokenUtil`에서 프로필 이미지 claim 저장·복원을 제거하고, 사용자 메뉴 요약에서 프로필 저장소를 조회하도록 수정했다. 20만 자의 이미지 문자열을 사용한 JWT 회귀 테스트에서 토큰이 5,000자 미만이고 프로필 이미지가 claim에 포함되지 않는 것을 검증했다.

## DB 영향

신규 테이블·컬럼·FK·마이그레이션 없음. 기존 컬럼을 재사용했다.

- `tb_user.email_addr`
- `tb_login_account.profile_image`
- `tb_login_account.stamp_image`
- `tb_login_account.password_changed_at`

## 검증 결과

- `npm run test -- tests/profile-settings.service.test.ts tests/profile-settings-page.test.tsx tests/security-settings-page.test.tsx`: 6 tests passed
- `npm run build`: passed
- `mvn "-Dtest=EgovJwtTokenUtilTest,ProfileSettingsApiControllerTest,ProfileSettingsServiceImplTest" test`: 9 tests passed
- `mvn test`: exit code 0, failed tests 없음
- `git diff --check`: passed
- Playwright `node scripts/capture-profile-settings.js`: profile/security pages reached, 6 screenshots generated

기존 `dashboard-sidebar.test.tsx`는 이번 프로필 라우트 실행 전 공통 테스트 mock에서 `프로그램 메뉴 열기` 요소를 찾지 못하는 별도 회귀가 있어 통합 검증에서 제외하고 원장에 기록했다.

## 브라우저 캡처

- [프로필 375px](screenshots/profile-settings-375.png)
- [프로필 768px](screenshots/profile-settings-768.png)
- [프로필 1280px](screenshots/profile-settings-1280.png)
- [보안 375px](screenshots/security-settings-375.png)
- [보안 768px](screenshots/security-settings-768.png)
- [보안 1280px](screenshots/security-settings-1280.png)
