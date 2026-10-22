# 개인별 고정 문서 상태 필터 누수 상세 사양서

## 1. 목적

고정 문서 목록 API가 임시저장 문서만 반환할 수 있는 상태 필터 누수를 수정한다. 현재 구현에서 `actorParams()`가 채우는 기본 `documentStatus=DRAFT`가 고정 목록 SQL의 공용 상태 검색조건으로 전달되는 문제를 해결한다.

## 2. 현행 동작과 원인

1. `DocumentApprovalServiceImpl.listPinnedDocuments`는 `actorParams(user)`를 사용한다.
2. `actorParams`에는 다른 문서 처리 기능을 위한 `documentStatus=DRAFT` 기본값이 있다.
3. `selectPinnedRelatedDocumentList`는 `relatedDocumentStatusFilters`를 포함한다.
4. SQL 조각은 `documentStatus`가 null/빈 문자열이 아닌 경우 `m.document_status = #{documentStatus}`를 적용한다.
5. 고정 목록 조회 파라미터에서 기본값을 지우지 않아 고정 문서가 DRAFT 상태로 제한될 수 있다.

## 3. 기대 동작

- 고정 문서 목록은 현재 인증 사용자 및 tenant의 pin 관계와 기존 문서 읽기 권한에 맞는 문서를 조회한다.
- 기존 scope, 업무구분, 문서 ID 필터를 보존한다.
- 고정 문서 전용 목록 요청에는 별도의 문서 상태 검색 조건이 정의되어 있지 않으므로 공통 actor 기본 `DRAFT` 값은 SQL 검색 필터로 전달하지 않는다.
- 일반 문서 목록, 문서 현황 검색, 문서 생성·수정·삭제의 DRAFT 기본 처리에는 영향이 없어야 한다.
- API 경로, 응답 형태, 데이터베이스 스키마는 변경하지 않는다.

## 4. 구현 사양

- `listPinnedDocuments`가 `actorParams(user)`를 생성한 뒤 `documentStatus` 파라미터를 제거한다.
- 회귀 테스트는 `selectPinnedRelatedDocumentList` 호출 인자에 `documentStatus` 키가 없는 것을 검증하고, tenant/user/권한 주체/scope/type/document ID가 유지되는 것도 함께 검증한다.

## 5. 검증 기준

- 회귀 테스트는 수정 전 실패하고 수정 후 통과해야 한다.
- `DocumentApprovalServiceImplTest`, `DocumentApprovalMapperTest`, `DocumentApprovalApiControllerTest`가 통과해야 한다.
- DB 스키마 변경은 없다. 기존 확인된 DB MCP 메타데이터는 대상 테이블 `tb_electronic_approval_main`, `tb_electronic_approval_line_info`, `tb_electronic_approval_pin`이다.
