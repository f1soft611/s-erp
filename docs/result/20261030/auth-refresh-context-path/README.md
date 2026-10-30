# 운영 환경 세션 갱신 context path 오류 수정 결과

## 원인

운영 백엔드 경로는 `/s-erp-backend` context path 아래에 배포된다. 기존 `AuthenticInterceptor`는 `request.getRequestURI()`가 `/auth/refresh`로 시작하는 경우에만 refresh를 통과시켰다. 실제 운영 URI `/s-erp-backend/auth/refresh`는 이 조건에 맞지 않아 인증이 없는 refresh 요청이 인터셉터의 세션 확인으로 넘어갔다.

운영 refresh 경로에 빈 토큰을 전달한 비변경 요청에서 수정 전 HTTP 500과 일반 오류 응답을 확인했다. 프론트엔드는 refresh 실패 시 인증 정보를 제거하고 로그인 화면으로 이동하므로 사용자가 작업 도중 로그인으로 튕기는 증상과 연결된다.

## 변경

- `AuthenticInterceptor`의 refresh 경로 판정을 context path가 제외된 `request.getServletPath()` 기준으로 변경했다.
- 운영 context path를 포함한 요청으로 재현하는 `AuthenticInterceptorTest`를 추가했다. 수정 전 테스트는 `ModelAndViewDefiningException`으로 실패했고 수정 후 통과했다.
- 인증 방식, 토큰 만료값, API 계약 및 DB는 변경하지 않았다.

## 검증

- `AuthenticInterceptorTest`: 1개 통과.
- 백엔드 전체 테스트에서 이번 변경과 무관한 `MaterialInfoJava8CompatibilityTest`는 Java 8 API 검사 중 eGovFrame 의존성을 찾지 못해 실패했고, `ProfileTestDev`/`ProfileTestProd`는 `${Globals.OsType}` 설정값 누락으로 실패했다.
- 위 세 테스트를 제외한 나머지 백엔드 테스트: 731개 실행, 실패/오류 0, skip 2.
- `mvn -DskipTests package`: 운영 배포 대상 WAR 패키징 성공.
- `git diff --check`: 통과.

## 배포 후 확인 필요

운영 서버에는 이 변경을 아직 배포하지 않았다. WAR 재배포 후 브라우저 Network에서 `POST https://f1lab.co.kr/s-erp-backend/auth/refresh` 응답이 `resultCode: "200"` 및 `jToken`을 반환하는지 확인한다. 현재 운영 서버에서 관찰된 500 응답은 수정 전 배포본의 응답이다.

UI 변경이 없어 스크린샷은 생성하지 않았다.
