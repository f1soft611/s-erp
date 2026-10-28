# Document Sharing Corrections Implementation Plan

**Goal:** 공유 URL 암호화, 링크 수정 동기화, 페이지 영역 상세 패널, 피드 조회 복구.

**Architecture:** 서버 AES-256-GCM 토큰에 tenant와 문서 ID를 담고 기존 권한 필터로 발급/해석을 검증한다. 브라우저는 토큰을 복호화하지 않는다. 기존 `PageAreaOverlay`를 재사용하며 작성 중에는 작성창 내부에 배치한다.

**Tech Stack:** Java JCE, Spring, React, Tiptap, MUI, JUnit, Vitest, Playwright.

## 1. 회귀 재현

- [x] `document-link-sharing.test.tsx`에 href가 외부 주소로 변경되고 표시 텍스트만 이전 공유 URL인 경우 카드가 사라지는 테스트를 추가한다.
- [x] `document-link-navigation.test.tsx`에서 링크 상세가 `page-area-overlay` 내부에 있고 viewport Drawer가 아님을 확인한다.
- [x] `DocumentApprovalWriteServiceImplTest`에 일반/고정 피드의 문서번호 보존을 검증한다.
- [x] 기존 테스트를 실행하여 현재 구현의 실패를 확인한다.

## 2. 구현

- [x] `documentShareLink.ts`는 앵커의 href를 기준으로 추출하고 앵커 내부 표시 텍스트는 재검색하지 않는다.
- [x] `DocumentApprovalShareService` 및 컨트롤러에 토큰 발급/해석을 추가한다. 서버 비밀키로 목적 분리한 AES 키, 임의 IV, GCM 태그, tenant 검증 및 권한 재검사를 적용한다.
- [x] 프론트엔드 서비스/공유 메뉴/미리보기/직접 URL 진입에서 암호화 토큰을 처리한다. 구 URL은 계속 인식한다.
- [x] `DocumentLinkedDetailPanel`의 Drawer를 `PageAreaOverlay`로 교체한다. 작성창에는 `linkedDetail` 슬롯을 전달하여 작성창 바깥을 가리지 않고 상태를 유지한다. 스크롤로 인한 잘림을 방지하기 위해 CommonDialog paper에 overlay 슬롯을 추가한다.
- [x] `buildFeedDocuments`에서 `feedItem.setDocumentNo(listItem.getDocumentNo())`를 추가한다.

## 3. 검증

- [x] 서버 단위 테스트에서 발급/해석, 임의 IV, 변조, 다른 tenant, 접근 회수, 미인증, 설정 누락을 검증한다.
- [x] 공유/본문/내비게이션 및 피드 서비스 테스트와 frontend build를 실행한다.
- [x] 4173 서버를 확인하여 재사용하고 375/768/1280px 브라우저에서 미리보기 변경/상세 영역/복사/피드/작성 상태를 검증한다.
- [x] `docs/result/20261028/document-sharing-corrections`에 결과 및 스크린샷, MCP 근거와 검증 한계를 기록한다.

## 선택 근거

프론트 인코딩은 암호화가 아니므로 제외한다. 무작위 링크 테이블은 DB 변경을 필요로 하므로 제외하고, 무상태 인증 암호화를 사용한다. 키는 `DOCUMENT_SHARE_SECRET`을 우선 사용하고 미설정 시 기존 서버 `Globals.jwt.secret`에서 목적별 키를 도출한다. 키 변경 시 기존 암호화 링크는 무효화된다.
