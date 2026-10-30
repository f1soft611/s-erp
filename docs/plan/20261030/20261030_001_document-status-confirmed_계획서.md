# 문서현황 참조 확인 상태 호환성 구현 계획

> **For agentic workers:** 이 세션에서 executing-plans 절차로 순차 실행한다.

**Goal:** 정상 `CONFIRMED` 상태가 포함된 문서현황 목록의 조회 장애를 복구한다.

**Architecture:** 기존 상태 옵션에서 파생되는 허용 집합과 표시 라벨을 그대로 재사용한다. 프론트엔드 검색 타입과 백엔드 검색 허용 상태만 같은 계약으로 확장하며 SQL/권한은 유지한다.

**Tech Stack:** React, TypeScript, Vitest, Spring Boot, JUnit.

## 근거와 선택

- [작업지시서](../../directions/20261030/20261030_001_document-status-confirmed_작업지시서.md)
- 응답 검증을 제거하거나 정상 행만 걸러내는 방식은 데이터 오류를 숨기므로 사용하지 않는다.
- 정상 상태를 기존 옵션·타입·서버 허용 목록에 추가하는 최소 변경을 선택한다.

## 단일 계약 수정 작업

- [x] `frontend/tests/document-status-service.test.ts`: `REFERENCE/CONFIRMED`와 `APPROVAL, REFERENCE/APPROVED, CONFIRMED`가 일반 행과 섞여도 전체·페이징 조회 모두 성공하는 테스트를 추가한다.
- [x] `frontend/tests/document-status-search.test.ts`: `myActionStatus=CONFIRMED` 검색값 변환을 검증한다.
- [x] `backend/src/test/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImplTest.java`: 확인 상태 필터를 사용자/테넌트 범위를 유지해 목록·건수 DAO로 전달하는 테스트를 추가한다.
- [x] `cd frontend; npm run test -- tests/document-status-service.test.ts tests/document-status-search.test.ts` 및 `cd backend; mvn -q "-Dtest=DocumentApprovalStatusServiceImplTest" test`로 실패를 확인한다.
- [x] `frontend/src/pages/groupware/documents/status/data/documentStatusOptions.ts`에 `{ value: 'CONFIRMED', label: '확인완료' }`, 같은 기능의 `types/documentStatus.types.ts`에 `| 'CONFIRMED'`를 추가한다.
- [x] `backend/src/main/java/egovframework/let/groupware/approval/status/service/impl/DocumentApprovalStatusServiceImpl.java`의 검색 처리상태 집합에 `"CONFIRMED"`를 추가한다.
- [x] 관련 문서현황 테스트, 서버 테스트, 프론트엔드 빌드와 변경 파일 lint를 실행한다. 기존 잘못된 상태 거부 테스트를 유지한다. 기존 검색 테스트 불일치 1건은 결과 문서에 별도 기록했다.
- [x] 기존 `127.0.0.1:4173` 서버를 확인해 재사용하며 합성 응답으로 375/768/1280px 브라우저를 검증한다. 실제 사용자 로그인 재현과 구분하고 계정/인증/테넌트 행은 저장하지 않는다.
- [x] `docs/result/20261030/document-status-confirmed`에 원인·해결·검증·스크린샷·DB MCP 근거를 기록한다. DB 변경이 없으므로 마이그레이션은 만들지 않는다.
