# 문서 리스트 도구막대 구현 계획서

**Goal:** 리스트/피드/상세의 상태·구분·선·핀·더보기 순서와 정렬 및 메뉴 권한을 통일한다.

**Architecture:** ListView에 renderItemToolbar 선택형 슬롯을 추가한다. DocumentApprovalToolbar와 추출한 DocumentActionsMenu를 문서 리스트와 상세에서 재사용한다. 목록의 isDrafter는 서버가 인증 사용자 ID와 drafter_id를 비교해 반환한다.

**Tech Stack:** React, TypeScript, MUI, MyBatis, Java, Vitest, JUnit.

## 순서

1. [작업지시서](../../directions/20261021/20261021_007_document_list_toolbar_work_instruction.md)와 기존 메뉴의 DRAFT 수정/삭제, REVISION_REQUESTED 수정 조건을 유지한다.
2. 매퍼 테스트에서 is_drafter SELECT 및 resultMap, JSON isDrafter 매핑을 검사한다. 툴바 테스트에서 20px 선과 align-self:center를 검사한다. 페이지 테스트에서 실제 순서/메뉴 권한 및 수정/삭제를 검사한다.
3. 테스트 실패 후 목록 VO/매퍼 투영을 확장한다. 기존 페이지 제외 조건 제거는 보존한다.
4. DocumentActionsMenu를 추출해 상세에서도 사용한다. 리스트는 기존 페이지 Composer와 기존 삭제 API/확인창을 연결하고 실패를 명시적으로 표시한다.
5. ListView 도구막대 슬롯이 있을 때만 내부 badge를 슬롯으로 대체하고 모바일에는 도구막대를 별도 줄에 우측 정렬한다. 슬롯이 없는 기존 소비자는 변경하지 않는다.
6. 대상 Vitest, 매퍼/서비스/컨트롤러 테스트, 프론트 빌드를 실행하고 375/768/1280px DOM geometry와 스크린샷을 확인한다.

결과는 `docs/result/20261021/document-list-toolbar`에 기록한다. 백엔드 새 응답은 재시작 후 적용되며 미반영 서버는 검증 완료로 간주하지 않는다.
