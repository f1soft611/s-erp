# 로그인 저장 Implementation Plan

> **For agentic workers:** 이 세션에서 executing-plans 방식으로 단계별 실행한다.

**Goal:** 로그인 성공 시 선택적으로 업체코드와 사용자 ID를 기억한다.

**Architecture:** 기존 `useLoginForm`에서 브라우저 저장소 읽기와 성공 후 쓰기를 담당한다. `LoginForm`은 체크박스를 표시하고 `LoginPage`가 상태와 콜백을 연결한다. 인증 서비스와 저장된 인증 세션은 수정하지 않는다.

**Tech Stack:** React, TypeScript, MUI, localStorage, Vitest, Playwright.

근거: [작업지시서](../../directions/20261029/20261029_008_login-remember_작업지시서.md)

## 1. 상세 사양 확정

- [x] `docs/spec/20261029/20261029_008_login-remember_상세사양서.md`에 저장 시점, 허용 필드, 삭제, 오류 및 검증 기준을 명시한다.
- 브라우저 재시작에도 유지되는 localStorage를 사용한다. sessionStorage는 요구에 부족하고 서버 저장은 불필요한 API 변경이므로 사용하지 않는다.

## 2. 테스트 우선 구현

- [x] `frontend/tests/login-remember.test.tsx`에 `renderHook`으로 `useLoginForm`을 검증하고 인증 서비스의 `login`만 mock한다.
- 저장이 없을 때 기본 해제, 정상값 복원과 빈 비밀번호, 성공 시 두 필드만 저장, 실패 시 미저장, 선택 해제 즉시 삭제, 선택 없이 성공 시 미저장, 손상된 저장값 무시, 저장소 예외 시 로그인 유지 사례를 검증한다.
- [x] `npm run test -- tests/login-remember.test.tsx`로 신규 기능의 실패를 확인한다.
- [x] `frontend/src/pages/auth/hooks/useLoginForm.ts`에 lazy 초기화, 선택 상태, 해제 핸들러, 성공 후 명시적 두 필드 직렬화를 추가한다.
- [x] `frontend/src/pages/auth/components/LoginForm.tsx`에서 MUI `Checkbox`와 `FormControlLabel`을 비밀번호 아래에 배치한다. 제출 중에는 선택 변경을 막는다.
- [x] `frontend/src/pages/auth/LoginPage.tsx`에서 상태와 핸들러를 전달한다.
- [x] `frontend/tests/login.test.tsx`에 기본 해제된 체크박스 렌더 검증을 추가한다.

## 3. 검증 및 결과

- [x] `npm run test -- tests/login.test.tsx tests/login-form-field.test.tsx tests/login-remember.test.tsx` 성공 확인.
- [x] 변경 파일 대상으로 `npm run lint -- <파일 목록>`, `npm run build` 성공 확인.
- [x] 실제 브라우저에서 저장/새로고침/복원/해제를 확인하고 라이트/다크 × 375/768/1280px 가로 넘침을 확인한다.
- [x] `docs/result/20261029/login-remember/`에 결과 문서와 비식별 화면 스크린샷을 저장한다.
- 기존 타 작업 변경을 유지하며 이 작업에서 시작한 개발 서버만 종료한다. 백엔드/DB 변경이 없어 SQL 및 DB MCP 확인은 대상이 아니다.
