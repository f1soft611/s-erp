# 운영 환경 세션 갱신 경로 오류 수정 상세사양서

근거: [작업지시서](../../directions/20261030/20261030_008_auth-refresh-context-path_작업지시서.md), [계획서](../../plan/20261030/20261030_008_auth-refresh-context-path_계획서.md)

## 경로 처리

- `AuthenticInterceptor`는 refresh 예외 판정에 `HttpServletRequest.getServletPath()`를 사용한다. 이 값은 웹 애플리케이션 context path와 분리된 서블릿 경로다.
- `/s-erp-backend/auth/refresh` 요청의 servlet path `/auth/refresh`는 인증 인터셉터를 통과해야 한다.
- `/auth/refresh` 이외의 인증 경로는 기존 사용자 인증 검사를 유지한다.
- 인터셉터 등록 URL 패턴, JWT 검증, refresh API 본문 및 응답 형식은 변경하지 않는다.

## 회귀 검증

- context path `/s-erp-backend`, request URI `/s-erp-backend/auth/refresh`, servlet path `/auth/refresh`인 Mock 요청에서 인증 사용자가 없어도 `preHandle`이 통과하는지 검증한다.
- 해당 테스트는 수정 전에 실패하고 수정 후 통과해야 한다.
- 관련 백엔드 테스트 및 WAR 패키징으로 컴파일/회귀를 확인한다.

## 범위 제외

DB/API 데이터 계약 변경이 없으므로 DB MCP 및 스키마 변경은 없다. 운영 배포나 운영 서버 데이터 변경은 수행하지 않는다.
