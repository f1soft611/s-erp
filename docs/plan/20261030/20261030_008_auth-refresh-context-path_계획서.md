# 운영 환경 세션 갱신 경로 오류 수정 계획서

기준: [작업지시서](../../directions/20261030/20261030_008_auth-refresh-context-path_작업지시서.md)

## 원인

운영 WAR context path `/s-erp-backend`가 포함된 `requestURI`는 `/s-erp-backend/auth/refresh`이므로 `/auth/refresh` 접두사 조건이 일치하지 않는다. refresh 요청에는 사용자 세션 인증이 없으므로 기존 인터셉터 인증 확인이 예외/오류로 이어지고, 클라이언트는 refresh 오류를 로그아웃으로 처리한다.

## 변경 및 검증

1. 운영 context path를 포함한 refresh 요청이 인터셉터에서 통과하는 실패 테스트를 작성하고 실행해 현재 동작 실패를 확인한다.
2. `getRequestURI()` 대신 context path를 제외하는 `getServletPath()`로 refresh 경로를 판별한다.
3. 회귀 테스트와 백엔드 테스트를 실행하고 WAR 패키징을 확인한다.
4. 결과 문서에 원인, 변경, 검증, 실제 운영 재배포 미확인 상태를 기록한다.

## 비범위

JWT access/refresh 유효시간, 프론트엔드, DB 스키마, API 요청/응답 계약 및 운영 서버 배포는 변경하지 않는다.
