# Business Contact Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task.

**Goal:** 결재 없는 업무연락 발송과 안전한 작성 탭 전환을 구현한다.

**Architecture:** 모달의 기본정보와 참조자 UI를 기능 폴더 안에서 추출한다. 기존 작성 훅/API/테이블을 재사용하며 BUSINESS_CONTACT만 참조 전용 검증과 COMPLETED 전이로 분기한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Java, Spring, MyBatis, JUnit.

## 근거

[작업지시서](../../directions/20261020/20261020_003_business-contact_작업지시서.md)

## Task 1: 계약 및 회귀 기준

- [x] DB MCP list_tables → describe_table(문서/참여자/댓글) → CHECK 메타데이터 조회로 기존 코드 사용 가능 여부 확인.
- [x] 상세 사양서 작성 후 구현 시작.
- [x] 기존 프론트 문서 테스트와 백엔드 DocumentApprovalServiceImplTest를 실행하여 baseline 확인. 프론트 기존 실패는 사용자 승인 후 별도 기록.
- [x] 기존 테스트에 참조 전용 발송/임시저장/재열기/중복 및 부정 참여자 거부, 탭 취소/이동/유지 테스트 추가.
- [x] 새 테스트 실패가 미구현 동작에 의한 것인지 확인.

## Task 2: 작성 UI와 상태

대상: `frontend/src/pages/groupware/documents/write/components/DocumentComposerDialog.tsx`, `DocumentApprovalFields.tsx`, 신규 `DocumentMetadataFields.tsx`, `DocumentReferenceField.tsx`, `hooks/useDocumentComposer.ts`.

- [x] 상단 4개 필드를 DocumentMetadataFields로 추출하고 두 유형에서 사용.
- [x] 기존 참조 입력을 DocumentReferenceField로 추출하여 기안서/업무연락에서 사용.
- [ ] 추가 지시 반영: 다른 탭 이동은 수정 여부와 관계없이 항상 확인. 같은 탭 클릭은 무동작. 탭 전환 전용 snapshot과 저장 기준 추적 제거.
- [x] 승인된 이동은 제목/본문/양식/첨부를 보존하고 참여자만 초기화. 기안자 옵션을 별도 보관해 기안서 기본 단계 복구.
- [x] BUSINESS_CONTACT 요청에는 REFERENCE만 stageOrder=1로 직렬화. 임시저장은 빈 목록 가능, 발송은 참조자 필수.
- [x] 저장/업로드/양식 조회 중 이동을 차단하고 발송 오류와 성공 메시지를 명시.
- [x] 기안자 결재 행 없는 업무연락 임시저장을 다시 열 수 있도록 복원 분기.

## Task 3: 서버와 표시

대상: `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`, 프론트 `documentPresentation.ts`, `useDocumentWritePage.ts`, `DocumentApprovalDetailFeed.tsx`, `DocumentStatusGrid.tsx`, `documentWrite.types.ts`.

- [x] validateDraftRequest는 업무연락만 빈 참여자 목록 허용.
- [x] validateParticipants는 유형을 받아 업무연락의 참조 전용/연속 순서/중복/활성 사용자/작성자 제외를 검증. 기안서는 기존 검증 유지.
- [x] submit은 업무연락에서 참조자 필수, 기존 replaceApprovalLines와 COMPLETED 상태/이벤트 사용. 참조자의 action 필드는 모두 null.
- [x] 신규 업무연락은 결재 참여 행 없이 즉시 완료되어 기존 서버 상태 검증/클라이언트 참여자 판정에서 결재 액션이 허용되지 않음.
- [x] COMPLETED 업무연락을 발송완료로 표시하고 상세 참여 영역을 참조자로 명명. 상태 필터는 기존 COMPLETED를 재사용.
- [x] API/DB 구조는 변경하지 않으며 기존 체크 제약과 맞는 COMPLETED 이벤트를 재사용한다.

## Task 4: 검증과 결과

- [x] 프론트 관련 전체 범위 실행과 신규/인접 테스트 선택 실행. 전체 기존 실패와 최종 통과 선택 범위는 결과 문서에 구분 기록.
- [x] `backend`: `mvn -Dtest=DocumentApprovalServiceImplTest,DocumentApprovalApiControllerTest,DocumentApprovalMapperTest test`
- [x] `frontend`: `npm run build`, 변경 파일 대상 oxlint, `git diff --check`.
- [x] 4173 기존 서버 확인/재사용. Playwright의 모의 API로 실제 DB 데이터 변경 없이 발송/탭 이동/반응형 확인.
- [x] `docs/result/20261020/business-contact/`에 검증 근거, DB MCP 메타데이터 확인, 스크린샷 저장. 테스트용 브라우저 종료, 기존 서버 유지.
- [x] 변경 diff 자체 검토 후 기존 변경과 구분. 본 작업에서는 커밋하지 않음.

결과: [업무연락 결과 문서](../../result/20261020/business-contact/20261020_003_business-contact_결과.md).

## 추가 지시 검증 계획 (2026-10-20)

- 미수정 신규 문서, 저장 직후 문서, 저장된 참조자가 있는 재열기 문서에서 확인창을 검증한다.
- 취소는 참여자/내용을 보존하고 승인 후에만 초기화하는지 양방향 전환을 검증한다.
- 기존 업무연락 회귀 테스트를 새 확인 정책에 맞추고 실패를 확인한 뒤 구현한다.
- 관련 테스트, 빌드, 변경 파일 lint 및 375/768/1280px 브라우저 확인창 스크린샷으로 검증한다.
- API/백엔드/DB 변경은 없다.
