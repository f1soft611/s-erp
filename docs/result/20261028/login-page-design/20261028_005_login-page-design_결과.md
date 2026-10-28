# 20261028_005 로그인 페이지 디자인 개선 결과

## 1. 변경 내용

- 기존 단일 로그인 카드 흐름을 유지하면서 카드 경계, 그림자, 배경의 블루 포인트, 제목/설명 위계를 정돈했다.
- 라이트/다크 테마 palette를 사용해 카드, 안내 문구, 버튼 및 배경을 맞췄다.
- 앱의 고정 높이/overflow 숨김 셸 안에서도 로그인 화면이 남은 높이를 채우고, 화면이 짧으면 로그인 콘텐츠를 세로 스크롤할 수 있도록 인증 레이아웃을 조정했다.
- 로그인 필드, 검증 메시지, 비밀번호 토글, DEV 전용 테스트 안내, 세션 오류 및 로그인 흐름은 변경하지 않았다.

## 5. 가독성 후속 개선

사용자 피드백과 승인에 따라 세 입력의 라벨을 각 입력 위에 고정하고, 실제 입력 글씨를 18px로 확대했다. 각 필드는 56px 높이로 맞추고 `margin="none"`을 지정해 기본 TextField 여백이 겹치지 않게 했다. 라벨은 React `useId`와 `htmlFor`/`id`로 입력과 연결했다. 개발 전용 계정 안내는 내용과 DEV 노출 조건을 유지하면서 카드 안에서 더 낮은 시각적 우선순위로 표현했다.

## 2. 검증 결과

| 검증 | 결과 |
|---|---|
| AuthLayout 스크롤 회귀 테스트 | 통과 (1 test) |
| 로그인 오류/만료 테스트 선택 실행 | 통과 (2 tests) |
| 선택 실행 조합 (`AuthLayout` + 오류/만료) | 통과 3, 제외 8 |
| 전체 로그인 집중 실행 (로그인 10 + 레이아웃 1) | 통과 6, 기준선 실패 5 |
| 프론트엔드 빌드 (`npm run build`) | 통과 |
| 변경 파일 Oxlint | 통과 |
| 실제 브라우저 375/768/1280px × 라이트/다크 | 통과, 수평 넘침 없음 |
| 짧은 화면 375×568px | 통과, 세로 스크롤 및 하단 저작권 표시 접근 확인 |
| 비밀번호 표시 토글 | 통과 |
| 고정 라벨 및 입력 접근성 회귀 테스트 | 통과 (1 test) |
| 로그인 필드 + 인증 레이아웃 집중 테스트 | 통과 (2 tests) |
| 변경 파일 Oxlint | 통과 |
| 가독성 개선 후 브라우저 375/768/1280px × 라이트/다크 | 통과: 입력 18px, 필드 56px, 라벨 연결, 포커스 표시, 가로 넘침 없음 |

기존 `frontend/tests/login.test.tsx` 10개 중 5개가 수정 전 기준선부터 실패했고, 변경 후에도 동일하게 5개가 실패했다. 세 가지 동기식 assertion은 lazy route의 로딩 화면에서 필드/버튼/제목을 즉시 찾으려다 실패하며, 대시보드 이동 테스트는 테스트 환경에서 로그인 공지 팝업 fetch가 오류 다이얼로그를 띄워 종합현황 조회를 막는다. 이 UI 작업에서는 인증/라우팅 및 해당 테스트 하니스를 범위 밖으로 유지했다. 같은 테스트 실행에서 새 스크롤 회귀 테스트는 통과했다.

가독성 후속 개선 검증은 이미 실행 중이던 S-ERP Vite 서버 `127.0.0.1:4173`을 재사용했으며 서버를 종료하지 않았다. 6개 테마/폭 조합에서 라벨 연결, 18px 입력 글씨, 56px 필드 높이와 가로 넘침 여부를 확인했다. 기존과 후속 스크린샷 모두 개발 테스트 계정 정보가 노출되지 않도록 계정 안내 영역을 마스킹했다.

## 3. 스크린샷

- 라이트: [375px](screenshots/light-375.png), [768px](screenshots/light-768.png), [1280px](screenshots/light-1280.png)
- 다크: [375px](screenshots/dark-375.png), [768px](screenshots/dark-768.png), [1280px](screenshots/dark-1280.png)
- 짧은 화면 스크롤: [375×568px](screenshots/light-375-short.png)

## 4. 변경 파일

- `frontend/src/shared/components/layout/AuthLayout.tsx`
- `frontend/src/pages/auth/components/LoginForm.tsx`
- `frontend/src/shared/components/LoginFormField.tsx`
- `frontend/tests/auth-layout.test.tsx`
- `frontend/tests/login-form-field.test.tsx`
