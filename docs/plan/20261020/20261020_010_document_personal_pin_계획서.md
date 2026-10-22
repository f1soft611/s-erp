# 문서작성 개인별 고정 문서 계획서

## 목표

전자결재 문서에 대한 개인별 고정/해제를 저장하고, 고정 문서 전체를 권한·필터가 적용된 별도 조회로 문서작성 화면에 제공한다.

## 아키텍처

승인된 [통합 설계](../../superpowers/specs/2026-10-20-document-pin-and-feed-list-pagination-design.md)와 [작업지시서](../../directions/20261020/20261020_010_document_personal_pin_work_instruction.md)를 따른다. 공용 문서 테이블을 변경하지 않고 tenant·문서·사용자 고정 관계 테이블을 추가한다. 인증 사용자만 pin/unpin할 수 있고, pin 및 pinned-list 조회는 기존 문서 읽기권한과 현재 scope·업무구분·문서 선택 조건을 적용한다. 후속 페이징은 별도 [작업지시서](../../directions/20261020/20261020_012_document_feed_list_pagination_work_instruction.md)에서 고정 문서와 일반 페이지를 분리한다.

## 기술 스택

React, TypeScript, MUI, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit.

## 변경 파일과 책임

### 데이터베이스

- `docs/database/20261020/20261020_007_create_electronic_approval_pin.sql`: 개인별 고정 관계 테이블 및 제약/인덱스를 생성한다.
- `docs/database/20261020/20261020_007_change_electronic_approval_pin_schema.md`: 날짜, 변경 목적, 적용 테이블, 영향 범위, 롤백 안내를 기록한다.
- `docs/database/20261020/20261020_007_rollback_electronic_approval_pin.sql`: pin 테이블을 안전하게 제거하는 롤백을 기록한다.
- `backend/DATABASE/20261020/`의 위 3개 파일: `docs/database`와 동일하게 유지한다.
- `docs/database/db-schema.md`: 신규 테이블 구조와 날짜별 변경 기록을 반영한다.

### 백엔드

- `backend/src/main/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiController.java`: 핀/해제 및 고정 문서 목록 API를 제공한다.
- `backend/src/main/java/egovframework/let/groupware/approval/service/DocumentApprovalService.java`: 인증된 개인 고정 명령과 목록 조회 계약을 제공한다.
- `backend/src/main/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImpl.java`: 사용자 ID 해석, 입력/권한 검증, 고정/해제 및 필터 조건을 처리한다.
- `backend/src/main/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalDAO.java`: 고정 관계 저장/삭제/목록 DAO를 정의한다.
- `backend/src/main/resources/egovframework/mapper/let/groupware/approval/DocumentApproval_SQL_postgresql.xml`: 사용자별 중복 방지, tenant·사용자별 pinned 조회 및 문서 접근권한을 구현한다.
- `backend/src/test/java/egovframework/let/groupware/approval/controller/DocumentApprovalApiControllerTest.java`: endpoint 인증 전달과 응답 형식을 검사한다.
- `backend/src/test/java/egovframework/let/groupware/approval/service/impl/DocumentApprovalServiceImplTest.java`: 사용자 ID, 권한 거부, 필터 보존 및 멱등 pin/unpin을 검사한다.
- `backend/src/test/java/egovframework/let/groupware/approval/domain/repository/DocumentApprovalMapperTest.java`: tenant/user 격리, read access, 정렬 및 SQL 제약을 검사한다.

### 프론트엔드

- `frontend/src/pages/groupware/documents/write/types/documentWrite.types.ts`: 핀 API 응답과 `isPinned` 상태를 정의한다.
- `frontend/src/pages/groupware/documents/write/services/documentApproval.service.ts`: 핀/해제/고정 목록 API와 응답 검증을 담당한다.
- `frontend/src/pages/groupware/documents/write/hooks/useDocumentWritePage.ts`: 고정 문서와 일반 문서 상태를 분리하고 필터·새로고침·액션 뒤 재조회한다.
- `frontend/src/pages/groupware/documents/write/DocumentWritePage.tsx`: 별도 pinned 패널과 고정 수를 기존 툴바에 연결한다.
- `frontend/src/pages/groupware/documents/write/components/DocumentFeedItem.tsx`: 공지 피드와 같은 카드 액션 위치에 pin/unpin 아이콘을 제공한다.
- `frontend/src/shared/components/view-mode/ListView.tsx`: 선택적 행 우측 pin 액션을 제공하되 기존 소비자 기본 동작을 유지한다.
- `frontend/src/shared/components/view-mode/PinnedItemsPanel.tsx`: 핀 해제 액션을 선택적으로 제공한다.
- `frontend/tests/document-approval-service.test.ts`: pin API 경로 및 응답 검증을 검사한다.
- `frontend/tests/use-document-write-page-pins.test.tsx`: pin 결과 분리, 필터, 오류, 성공 후 재조회와 view-mode 정렬을 검사한다.
- `frontend/tests/document-write-page.test.tsx`: 액션 아이콘 배치와 기존 작성/상세 동작 회귀를 검사한다.

## 실행 순서 (TDD)

### 1. 계약 확인 및 상세 사양 승인

- [ ] 기본 읽기 전용 DB MCP의 `list_tables`와 `describe_table` 결과를 확인한다. 현재 main·approval-line에 pin 필드는 없고 사용자 테이블은 `user_id` bigint 및 `tenant_id`를 보유한다.
- [ ] 기존 DDL의 복합 tenant FK, user ID 매핑 및 문서 `documentReadAccess` 패턴을 확인하고 상세 사양서의 키·제약을 확정한다.
- [ ] [상세 사양서](../../spec/20261020/20261020_010_document_personal_pin_상세사양서.md)를 작성하고 사용자 검토를 받는다.

### 2. DB 변경 파일과 mapper 테스트

- [ ] DB migration 테스트/문서 규칙을 확인하고 테이블 제약 테스트에 unique user-document pin, tenant/document FK, user FK, 조회 인덱스를 추가한다.
- [ ] Mapper 테스트에 사용자의 pin만 조회, 다른 tenant/user pin 미노출, 문서 읽기 권한·필터 조건, 최신 수정일 정렬, 중복 저장 방지를 추가한다.
- [ ] 테스트를 먼저 실행해 신규 mapper query 부재로 실패함을 확인한다.
- [ ] `20261020_007` SQL, 변경 이력, 롤백을 `docs/database`와 `backend/DATABASE`에 동일하게 작성하고 `db-schema.md`를 갱신한다. DB에 직접 적용하지 않는다.

### 3. 백엔드 API 구현

- [ ] Controller/Service 테스트에 pin/unpin/list의 인증 사용자 전달, 읽기권한 오류, 다른 사용자의 상태 격리, idempotent 재요청, scope/type/document 필터를 추가한다.
- [ ] 신규 테스트를 실행해 구현 전 실패를 확인한다.
- [ ] API 계약을 `PUT /documents/{id}/pin`, `DELETE /documents/{id}/pin`, `GET /documents/pinned`로 구현한다. 사용자 ID는 인증 `LoginVO`에서만 읽는다.
- [ ] 고정목록은 전체 pin을 최신 문서 순으로 조회하고, 권한 또는 현재 필터와 맞지 않는 문서는 제외한다. 클라이언트가 보낸 owner ID는 받지 않는다.
- [ ] 전체 기존 전자결재 권한 및 tenant 범위를 보존하고 DB 직접 적용 없이 mapper/service/controller 관련 테스트를 실행한다.

### 4. 프론트 API·상태·액션 구현

- [ ] 서비스 테스트에 핀/해제 경로·입력 검증·pinned 목록 응답 오류 검증을 추가한다.
- [ ] hook/page 테스트에 고정 목록과 일반 문서 분리, 모든 현재 필터 적용, 실패 알림, 성공 후 갱신, 피드 상단 정렬을 추가한다.
- [ ] 공유 리스트 테스트에 액션 prop이 없을 때 기존 markup을 유지하고 활성화 시 행 오른쪽에 icon action을 제공하는 회귀를 추가한다.
- [ ] 신규 테스트를 구현 전에 실행해 실패함을 확인한다.
- [ ] `useDocumentWritePage`가 개인별 pinned 전체를 별도 조회하고 `isPinned`를 계산해 pinned panel/feed order에 반영하도록 구현한다.
- [ ] 공지 피드와 동일한 PushPin 아이콘 위치 및 한국어 aria-label/title을 연결하고 pin 요청 중 중복 입력을 막는다. 실패는 기존 notification 체계로 사용자에게 알린다.
- [ ] 핀/해제 성공 후 pinned/일반 목록을 서버 기준으로 재조회해 문서가 중복 또는 누락 상태로 남지 않도록 한다.
- [ ] 서비스·hook·페이지 테스트와 `npm run build`를 실행한다.

### 5. 브라우저 및 결과 검증

- [ ] 기존 4173 S-ERP 서버를 재사용해 375px, 768px, 1280px에서 아이콘 위치, 고정 패널, 고정 수, pin/unpin 반영을 확인한다.
- [ ] `docs/result/20261020/document-personal-pins/screenshots`에 영문 소문자·숫자·하이픈 스크린샷을 저장한다.
- [ ] 결과서에 테스트, 브라우저 확인, DB MCP 메타데이터, 스키마 SQL 작성 및 DB 미적용 상태를 기록한다.
- [ ] 기존의 무관한 미커밋 변경을 보존하고 대상 diff를 확인한다.

## 완료 조건

- 고정 상태는 사용자 간 공유되지 않고 인증 사용자별로 저장된다.
- 현재 읽을 권한이 있는 문서만 pin/unpin 및 조회가 가능하다.
- pinned 문서 전체가 현재 화면 필터에 맞게 별도 조회되고, 문서 목록과 댓글/첨부 데이터 권한을 벗어나지 않는다.
- 리스트형 패널, 피드형 상단 우선 표시, 공지 피드와 같은 핀 아이콘 액션 위치가 동작한다.
- 날짜별 양쪽 SQL 변경 이력·롤백과 누적 스키마 문서가 동기화된다.
- 지정 테스트와 반응형 브라우저 검증 결과가 결과서에 기록된다.
