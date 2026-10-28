# 전자결재 문서번호 발급 및 표시 상세 사양서

## 기준 문서

- [작업지시서](../../directions/20261028/20261028_017_electronic-approval-document-number_작업지시서.md)
- [계획서](../../plan/20261028/20261028_010_electronic-approval-document-number_계획서.md)
- [설계](../../superpowers/specs/2026-10-28-electronic-approval-document-number-design.md)

## 1. 목표와 범위

문서 ID를 사용자에게 보여주는 대신 별도 업무 문서번호 `EA-YYYYMMDD-NNNN`를 발급해 문서 상세와 문서현황에서 일관되게 사용한다. 수주현황 상세에는 기존 주문번호 값은 그대로 두고 `수주번호:` 라벨만 추가한다.

- 번호는 최초 임시저장 시 발급하고 이후 수정, 결재신청, 재상신, 발송에서도 변경하지 않는다.
- 최소 4자리 sequence를 사용하고, 9999 초과를 자르거나 재사용하지 않는다.
- ID는 내부 PK 및 API 식별자로 보존한다.
- 문서유형 식별 코드 `eabusNo`는 변경하지 않는다.
- 백엔드와 DB를 변경하며 DB 스키마 스크립트는 생성하되 실행하지 않는다.

## 2. DB 및 채번 계약

### 2.1 기존 계약 확인

작업 전에 기본 PostgreSQL MCP의 `list_tables` 및 `describe_table`을 호출했다. `public.tb_electronic_approval_main`에는 `electronic_approval_id`, `tenant_id`, `created_at`, `eabus_no` 등이 있고 `document_no`는 없다. `public.tb_id_sequence`에는 `generator_key`, `scope_key_1`, `scope_key_2`, `last_issued_value`가 있다. 데이터 행은 조회하지 않았다.

### 2.2 신규 컬럼 및 번호 규칙

- 추가 컬럼: `public.tb_electronic_approval_main.document_no VARCHAR(40) NOT NULL`.
- 유일성: `UNIQUE (tenant_id, document_no)`.
- 형식: `EA-` + 발급일 `yyyyMMdd` + `-` + sequence의 4자리 이상 zero padding.
- generator key: `ELECTRONIC_APPROVAL_NO`.
- `scope_key_1`: 인증 principal의 tenant ID 문자열.
- `scope_key_2`: 발급일 `yyyyMMdd`.
- sequence 발급은 기존 `IdSequenceService.nextValue`를 사용하고 최초 insert와 같은 트랜잭션에서 수행한다.
- 문서번호를 요청 본문에서 받거나 클라이언트에서 생성하지 않는다. sequence/insert가 실패하면 transaction 실패를 그대로 반환한다.
- 발급 이후 update/save/submit/resubmit 동작은 기존 DB의 문서번호를 유지하고 추가 번호를 발급하지 않는다.

### 2.3 기존 행 backfill

- `created_at` 날짜별로 tenant 안에서 `created_at ASC, electronic_approval_id ASC` 순위를 매긴다.
- 각 문서에 `EA-YYYYMMDD-`와 최소 4자리 순위를 부여한다.
- backfill 결과에서 tenant/date별 최댓값으로 `tb_id_sequence`의 `ELECTRONIC_APPROVAL_NO` 행을 upsert한다. 기존 카운터가 더 크면 `GREATEST`로 유지한다.
- 컬럼을 NOT NULL로 바꾸고 tenant별 유일 제약을 추가한다.
- forward SQL은 트랜잭션으로 구성한다. 롤백은 이 generator key의 sequence 행, 유일 제약, 컬럼을 제거한다. 롤백 후 번호가 제거된다는 점을 변경 이력에 기록한다.
- docs/backend forward, change-history, rollback 파일은 같은 날짜/번호와 동일한 내용을 사용한다. `docs/database/db-schema.md`도 갱신한다.
- SQL은 작성 및 정적 확인만 하며 이 작업에서 DB에 적용하지 않는다.

## 3. API 계약

### 3.1 문서 생성/임시저장

- 최초 저장 요청 DTO는 변경하지 않는다. `documentNo` 또는 `electronicApprovalId` 입력을 신규 번호의 원본으로 신뢰하지 않는다.
- 최초 임시저장 성공 item에는 `electronicApprovalId`, `documentNo`, `documentStatus`가 포함된다.
- 기존 임시저장 수정 성공, 결재신청, 재상신 및 업무연락 발송 응답에도 저장된 `documentNo`를 포함한다.
- 번호가 누락된 성공 응답을 만들지 않는다. 서버 생성 또는 조회 실패 시 기존 오류 경로를 따른다.

### 3.2 상세/목록

- 문서 상세 API와 문서현황 행에 `documentNo`를 반환한다.
- 문서작성 목록/피드 API에서 사용하는 공통 목록 VO를 반환하는 조회에도 `documentNo`를 포함한다.
- `electronicApprovalId`는 정수 PK, 상세 조회 및 모든 기존 라우팅 기준으로 유지한다.
- `eabusNo`는 유형별 구분 코드로만 유지한다.
- `DocumentStatusRow`는 별도의 `documentNo` 필드를 가진다. 내부 `electronicApprovalId`는 행 key/상세 요청용으로 계속 포함한다.

### 3.3 문서현황 검색 및 정렬

- 문서번호 상세검색은 `documentNo` 문자열 exact match다.
- 빠른검색은 `documentNo`, 제목, 기안자 텍스트를 포함한다.
- `documentNo`는 서버 정렬 허용목록에 포함한다.
- 전체 건수 query와 목록 query는 같은 번호 필터 fragment를 사용한다.
- 내부 PK exact-match 필터를 사용자 노출 문서번호 필터로 재사용하지 않는다.
- tenant, 기안자, 결재 참여자 기반 권한/범위 필터는 기존대로 유지한다.

## 4. 화면

- 전자결재 상세 패널의 제목 아래 부제목은 `문서번호: {documentNo}`로 표시한다. 값이 없는 응답은 계약 오류로 처리하고 내부 ID로 대체하지 않는다.
- 문서현황 고정 번호 열은 `documentNo`를 보여주고 컬럼 헤더/검색 레이블은 `문서번호`로 유지한다.
- 번호 링크를 클릭하면 실제 번호 표시와 무관하게 기존 `electronicApprovalId`로 상세를 연다.
- 수주현황 상세의 기존 부제목 `orderNo`를 `수주번호: {orderNo}`로 표시한다.
- 반응형 스타일은 기존 컴포넌트를 우선하고 새 고정 너비나 페이지 전체 가로 스크롤을 추가하지 않는다.

## 5. 구현 및 테스트 기준

### 백엔드

- 최초 저장 시 tenant/date sequence 호출 인자와 저장 번호를 검증한다.
- `1`, `9999`, `10000` sequence가 각각 최소 4자리 padding 및 초과 자릿수 유지 규칙을 만족한다.
- 번호/insert 오류가 성공 응답으로 변환되지 않는다.
- 수정/상신 흐름이 새 sequence를 호출하지 않고 기존 번호를 반환한다.
- 상세/목록/현황 SQL 매핑에 `document_no`를 포함하고 번호 검색·정렬을 적용한다.
- 기존 인증/tenant/접근 fragment, 내부 ID 바인딩, 문서유형 필터는 변하지 않는다.

### 프론트엔드

- 문서현황 번호 열이 내부 ID 대신 `documentNo`를 보여준다.
- 상세번호 검색은 `documentNo` 쿼리 키를 보내고 빠른검색도 해당 필드를 포함한다.
- 상세 클릭 후 API/상세 feed는 내부 `electronicApprovalId`를 계속 사용한다.
- 상세 부제목이 `문서번호: EA-...`, 수주 상세 부제목이 `수주번호: SO-...`다.
- 다른 문서 목록/상세의 오류/로딩/수정 흐름은 기존대로 유지한다.

### 실행 검증

- backend 집중 테스트: `mvn -Dtest=DocumentApprovalWriteServiceImplTest,DocumentApprovalStatusServiceImplTest,DocumentApprovalMapperTest test`
- frontend 집중 테스트: `npm run test -- tests/document-status-page.test.tsx tests/document-status-service.test.ts tests/sales-order-status-page.test.tsx`
- 프론트엔드 build: `npm run build`.
- PostgreSQL에 SQL을 적용하지 않고 SQL 구조 및 docs/backend 복사본 일치 여부를 정적으로 검증한다.
- Chromium 브라우저에서 실제 375px, 768px, 1280px 레이아웃을 확인하고 결과 문서에 스크린샷을 보관한다.

## 6. 제외 항목

- 문서 번호를 편집/재발급/수정하는 UI/API.
- DB 데이터 조회·변경, migration 실행, 실제 배포.
- 수주번호 발급 규칙 또는 수주 API/스키마 변경.
- `eabusNo` 의미 변경, 전자결재 내부 PK/URL 변경.
- 문서 번호를 기존 대시보드 카드나 본문에 무관하게 확산하는 표시 변경.
