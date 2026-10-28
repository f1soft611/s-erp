# Document Link Sharing Implementation Plan

> 현재 공유 링크/상세 영역 계약은 [018 후속 계획서](20261028_018_document-sharing-corrections_계획서.md)를 따른다. 아래는 최초 구현 이력이다.

**Goal:** 문서 링크 복사, 권한 기반 OG형 미리보기, 우측 상세 열기를 연결한다.

**Architecture:** `/groupware/doc/write?documentId=<id>` 링크를 사용한다. 기존 권한 필터가 적용되는 `listDocumentApprovals('ALL', undefined, id)`로 미리보기를 조회하고 상세는 기존 상세 컴포넌트로 재검증한다. 저장 데이터는 일반 URL을 유지하며 카드 메타데이터는 저장하지 않는다.

**Tech Stack:** React, TypeScript, MUI, Tiptap, Vitest, Playwright.

## 1. 링크와 카드

- [x] `frontend/tests/document-link-sharing.test.tsx`에 유효 URL/외부 URL/잘못된 ID/권한 없는 응답/조회 실패/카드 클릭 테스트를 추가한다.
- [x] `npm run test -- tests/document-link-sharing.test.tsx`로 실패를 확인한다.
- [x] `write/data/documentShareLink.ts`에 링크 생성·파싱·HTML 링크 추출을 구현한다.
- [x] `write/components/DocumentLinkPreviews.tsx`에 권한별 카드 조회 및 취소 처리를 구현한다. 중복 링크는 하나로 표시한다.

## 2. UI 연결

- [x] `DocumentActionsMenu.tsx`에 공유 콜백을 추가하고 수정/삭제 권한과 독립적으로 노출한다.
- [x] `DocumentApprovalDetailFeed.tsx`에 클립보드 알림, 본문·댓글 카드 렌더러를 연결한다.
- [x] `RichTextEditor` 및 `TiptapCommentThread`에 선택적인 미리보기 렌더러를 추가한다. 기존 소비자의 동작은 유지한다.
- [x] `DocumentComposerDialog.tsx`에서 본문 변경 시 카드 렌더링을 연결한다. 양식의 `emitUpdate: false` 교체도 문서 변경 transaction으로 동기화한다.
- [x] `DocumentWritePage.tsx`에서 미리보기 클릭과 직접 링크 진입을 기존 우측 패널에 연결한다. 작성창은 닫지 않고 보존하며 링크 상세를 그 위에서 확인한다.
- [x] `DocumentLinkedDetailPanel.tsx`로 링크 상세 패널을 분리하고 `status/components/DocumentStatusDetail.tsx`의 재사용 상세/작성창에도 같은 콜백을 연결한다.

## 3. 검증 및 결과

- [x] 공유 메뉴, 실제 붙여넣기, 저장된 본문·댓글, 권한 거부 및 상세 전환을 테스트한다.
- [x] 관련 Vitest, `npm run build`, `npm run lint`를 실행한다. 전체 검사 제약과 범위 린트 결과를 결과 문서에 구분한다.
- [x] 기존 4173 서버를 확인 후 재사용하여 가상 API 데이터로 375/768/1280px 화면을 검증한다.
- [x] `docs/result/20261028/document-link-sharing`에 결과와 스크린샷을 기록한다.

## 대안과 선택 근거

공개 OG 엔드포인트는 비공개 문서 메타데이터 노출 위험 때문에 제외한다. 별도 미리보기 API는 현재 목록 API의 권한·ID 필터로 충족되므로 추가하지 않는다. 내부 카드 방식은 저장 데이터와 접근 권한을 변경하지 않으며 미리보기 조회로 상세 조회수를 증가시키지 않는다.
