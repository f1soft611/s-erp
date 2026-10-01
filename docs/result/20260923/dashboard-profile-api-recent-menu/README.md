# 대시보드 프로필 API 및 최근 사용 UI 개선 결과

## 구현 내용

- 기존 `GET /api/v1/menus/my` 응답의 `user` 요약에 이름, 이메일, 프로필 이미지, 그룹명, 역할명을 확장할 수 있도록 백엔드 모델을 추가했습니다.
- 로그인 시 이미 조회되는 `LoginVO`의 이메일과 프로필 이미지를 access/refresh JWT에 포함하고, JWT 인증 시 복원하도록 연결했습니다.
- 메뉴 API 응답은 인증된 `LoginVO`의 표시 정보를 사용자 요약에 주입합니다.
- AppBar 프로필 팝오버를 동적 사용자 정보 기반으로 변경했습니다.
  - 프로필 이미지 또는 이름 첫 글자 Avatar
  - 사용자명, 그룹/역할명, 이메일
  - 구분선과 아이콘이 있는 내 정보 관리, 보안 설정, 로그아웃 액션
- 사이드바 하단 최근 사용 영역을 개선했습니다.
  - 최근 사용 개수 배지
  - 메뉴명과 모듈명 2줄 표시
  - hover/focus 상태, 고정 최소 높이, 말줄임 처리
  - 기존 sessionStorage, 최대 5개, 중복 제거, 최신순 정렬, 경로 이동 유지

## 변경 범위

- DB 스키마와 데이터는 변경하지 않았습니다.
- 기존 모듈 순서, 라우팅, F1-Grid는 변경하지 않았습니다.
- 프로필 전용 신규 API는 추가하지 않고 기존 내 메뉴 API 계약을 확장했습니다.

## DB 확인 근거

읽기 전용 PostgreSQL 확인 결과 다음 기존 컬럼을 재사용했습니다.

- `tb_login_account.profile_image`: nullable text
- `tb_user.user_nm`: 사용자명
- `tb_user.email_addr`: nullable 이메일

개인정보나 실제 데이터 행은 결과물에 기록하지 않았습니다.

## 검증

성공:

- `frontend/npm run build`
- `frontend` 프로필 팝오버 단독 테스트
- `frontend` 최근 사용 메뉴 단독 테스트
- `backend/mvn -DskipTests compile`
- `backend/mvn "-Dtest=EgovJwtTokenUtilTest" test`: 3개 통과
- `backend/mvn "-Dtest=EgovJwtRefreshTokenTest" test`: 3개 통과

참고:

- 대시보드 전체 테스트 묶음은 기존 로그인 helper의 한국어 heading 인코딩/전역 상태 영향으로 일부 실행 결과가 일관되지 않았습니다. 변경 기능의 프로필·최근 사용 테스트는 단독 실행에서 확인했습니다.
- 브라우저 스크린샷은 현재 실행 중인 개발 서버가 정상 기동되지 않아 저장하지 못했습니다.
