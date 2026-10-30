# 운영 환경 세션 갱신 경로 오류 수정 작업지시서

## 목적

운영 백엔드가 `/s-erp-backend` context path로 서비스될 때 액세스 토큰 갱신 요청이 인증 인터셉터에서 막혀 프론트엔드가 로그아웃 처리하는 문제를 수정한다.

## 근거와 범위

- 운영 공개 경로 `https://f1lab.co.kr/s-erp-backend/auth/refresh`에 빈 토큰을 보내는 비변경 요청이 HTTP 500을 반환하는 것을 확인했다.
- `AuthenticInterceptor`는 `HttpServletRequest.getRequestURI()`가 `/auth/refresh`로 시작할 때만 통과시키지만, 운영 WAR 요청 URI에는 context path가 포함된다.
- 변경 범위: 백엔드 `AuthenticInterceptor` 및 해당 회귀 테스트, 날짜별 작업 문서.
- 프론트엔드 인증 흐름, JWT 유효시간, DB/API 계약은 변경하지 않는다.

## 완료 기준

- context path가 있는 `/s-erp-backend/auth/refresh`가 인증 인터셉터 검사를 우회한다.
- 일반 `/auth/*` 인증 경로의 기존 검사는 유지된다.
- 회귀 테스트가 수정 전 실패하고 수정 후 통과한다.
- 관련 백엔드 테스트와 빌드/패키징이 통과한다.
- 결과 문서에 운영 확인과 미수행 사항을 명시한다.
