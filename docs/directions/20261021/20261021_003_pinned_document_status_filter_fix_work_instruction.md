# 개인별 고정 문서 상태 필터 누수 수정 작업지시서

## 사용자 요구

- 개인별 고정 문서 목록이 임시저장 문서만 조회되는 현상을 조사하고 수정한다.
- 기존 인증 사용자, tenant, 문서 읽기 권한, scope, 업무구분, 선택 문서 필터는 유지한다.
- DB 스키마와 API 계약은 변경하지 않는다.

## 조사 결과

- `DocumentApprovalServiceImpl.actorParams()`는 다른 문서 작업의 기본값으로 `documentStatus=DRAFT`를 넣는다.
- `listPinnedDocuments()`는 이 공통 파라미터를 그대로 `selectPinnedRelatedDocumentList`에 전달한다.
- 고정 목록 SQL은 `relatedDocumentStatusFilters`를 재사용하며, 이 조각은 전달된 `documentStatus`를 실제 상태 조건으로 적용한다.
- 따라서 고정 목록 조회가 인증 사용자의 고정 문서 중 DRAFT 상태만 반환할 수 있다.

## 승인 범위 및 절차

1. 기존 scope 및 문서 접근 권한을 바꾸지 않고 고정 목록 조회에서만 공통 기본 DRAFT 상태가 검색 조건으로 전파되지 않도록 한다.
2. 서비스 단위 회귀 테스트를 먼저 작성하고 기존 기본값이 전달되는 상태에서 실패하는 것을 확인한다.
3. 최소한의 서비스 파라미터 수정으로 테스트를 통과시킨다.
4. 서비스 및 매퍼 테스트와 백엔드 빌드를 검증한다.
5. 결과 문서에 원인, 수정 범위, 검증, DB 변경 없음 및 기존 MCP 근거를 기록한다.

## 영향 범위

- 백엔드 서비스: `DocumentApprovalServiceImpl.listPinnedDocuments`
- 백엔드 회귀 테스트: `DocumentApprovalServiceImplTest.pinnedListUsesScopeAndFilterWithCurrentAuthenticatedIdentityOnly`
- DB 스키마, 프론트엔드 화면 및 API 경로는 변경하지 않는다.
