# Approval Line Template Response Implementation Plan

**Goal:** 정상 저장 응답을 오류로 표시하지 않고 목록·상세·이름 변경에도 같은 날짜 계약을 적용한다.

**Architecture:** 기존 공통 `isTemplateSummary` 검증을 유지하고 `updatedAt` 허용 범위만 서버 계약과 일치시킨다. 서버와 DB 및 화면 구조는 변경하지 않는다.

**Tech Stack:** React, TypeScript, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261020/20261020_003_approval-line-template-response_작업지시서.md)
- 서버 `ApprovalLineTemplateVO.updatedAt`은 `java.util.Date`이고 생성 서비스는 값을 설정하지 않아 null이다.
- 기존 프론트엔드는 생략 또는 문자열만 허용한다.
- DB MCP `list_tables` → `describe_table`로 템플릿 테이블과 `updated_at` timestamp NOT NULL 계약을 확인했다. 응답 VO의 null과 DB의 NOT NULL은 서로 다른 계층이다.

## 구현 및 검증 순서

1. 상세 사양서를 작성한다.
2. `frontend/tests/approval-line-template-service.test.ts`에 null/숫자/문자열/생략 날짜를 CRUD별로 검증하는 테스트와 객체·배열·불리언·비유한수 거부 테스트를 추가한다.
3. 해당 테스트를 실행해 기존 코드의 null/숫자 거부 실패를 확인한다.
4. `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`의 템플릿 요약 날짜 타입을 `updatedAt?: string | number | null`로 변경한다.
5. `frontend/src/pages/groupware/documents/write/services/approvalLineTemplate.service.ts`의 날짜 조건을 아래와 같이 변경한다.

```ts
(value.updatedAt === undefined ||
  value.updatedAt === null ||
  typeof value.updatedAt === 'string' ||
  (typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)))
```

6. 서비스와 기존 결재선 설정 다이얼로그 테스트를 함께 실행하고 `npm run build`를 확인한다.
7. 기존 4173 개발 서버를 확인해 재사용하고 모의 API로 저장 성공 후 선택 및 목록 조회를 브라우저에서 검증한다. 375/768/1280px 스크린샷을 결과 폴더에 기록한다.
8. 결과 문서에 실제 검증 범위와 미확인 사항을 남긴다. 자동 커밋은 하지 않는다.
