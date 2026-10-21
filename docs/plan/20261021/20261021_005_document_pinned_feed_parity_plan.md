# 문서작성 상단 고정 표시 정합성 계획서

**Goal:** 피드형 상단 고정 영역 누락과 핀 색상 누락을 수정하고 고정 패널의 직접 해제 버튼을 제거한다.

**Architecture:** 기존 별도 고정 조회와 공통 PinnedItemsPanel을 그대로 사용한다. 페이지의 보기 제한 조건과 액션 슬롯만 제거하고, 상세/피드 공용 핀 아이콘에 현재 고정 상태의 색상을 반영한다.

**Tech Stack:** React, TypeScript, MUI, Vitest, Playwright.

## 근거

- [작업지시서](../../directions/20261021/20261021_005_document_pinned_feed_parity_work_instruction.md)
- [기존 확인창 사양](../../spec/20261021/20261021_004_document_pin_confirmation_actions_상세사양서.md)

## 실행

1. `frontend/tests/document-write-page.test.tsx`에서 고정 패널 직접 해제 테스트를 버튼 부재 검사로 변경한다. 피드 전환 후에도 고정 영역이 보이고 카드의 고정 핀이 `MuiSvgIcon-colorPrimary`인지 검사한다. 기존 상세 해제 테스트에도 색상 검사를 추가한다.
2. 대상 테스트를 먼저 실행해 기존 코드에서 실패함을 확인한다.
3. `DocumentWritePage.tsx`의 고정 패널 조건에서 `viewMode === 'list'`를 제거하고 `renderItemAction`을 제거한다. 상위 파일 보기 분기는 유지한다.
4. `DocumentApprovalDetailFeed.tsx`의 아이콘에 `color={isPinned ? 'primary' : 'inherit'}`를 적용한다.
5. 문서작성/문서 피드/고정 훅 집중 테스트와 `npm run build`를 실행한다.
6. 기존 4173 서버에서 두 보기와 상세를 확인하고 375/768/1280px 스크린샷 및 결과를 작성한다. 실제 데이터는 변경하지 않는다.

## 추가 승인: 일반 목록 순서 및 고정 문서 유지

1. 훅 테스트에 일반 조회 순서 `[일반, 고정]` 유지, 고정 문서의 리스트 잔류, 별도 고정 조회에만 있는 문서의 본문 미삽입, 다음 페이지의 고정 상태 표시를 추가하고 실패를 확인한다.
2. `useDocumentWritePage.ts`에서 별도 고정 상태와 일반 조회 상태를 분리한다. 일반 결과의 고정 문서 제외 및 피드 고정 우선 재정렬을 제거하고, 고정 ID 집합은 색상/동작 판별에만 사용한다.
3. 문서 목록 이름을 `listDocuments`/`listViewItems`로 명확히 하고, 리스트 핀의 접근성 이름/색상/토글 인자에 실제 상태를 전달한다.
4. 기존 회귀 테스트와 빌드, 두 보기의 반응형 브라우저 검증을 다시 실행한다.

별도 공통화, 백엔드 수정은 하지 않는다.
