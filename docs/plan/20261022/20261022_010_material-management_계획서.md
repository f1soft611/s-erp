# 품목관리 Implementation Plan

> 실행 방식: 현재 세션에서 문서·실패 테스트·구현·검증 순서로 실행한다.

**Goal:** 기존 품목 테이블을 사용하는 거래처 패턴의 품목관리 화면을 제공한다.

**Architecture:** 품목 전용 API/서비스/DAO/Mapper와 배치 서비스를 추가한다. 프론트는 품목 전용 타입·서비스·훅·그리드·페이지로 분리하고 기존 공통 UI를 재사용한다. 품목 코드는 eGov IDS를 사용하며 기존 테이블은 변경하지 않는다.

**Tech Stack:** React, TypeScript, MUI, F1-Grid, Vitest, Spring Boot, MyBatis, PostgreSQL, JUnit/Mockito.

## 기준

- [작업지시서](../../directions/20261022/20261022_010_material-management_작업지시서.md)
- 다음 단계: [상세사양서](../../spec/20261022/20261022_010_material-management_상세사양서.md)

## 1. 계약 및 회귀 테스트

- [x] 후속 호환성 수정: `MaterialInfoJava8CompatibilityTest`에서 실제 서비스 및 서비스 테스트 소스를 Java 8 API 기준으로 컴파일해 실패를 확인한 뒤 `Set.of`/`String.repeat`를 Java 8 대안으로 바꾸고 품목 집중 테스트를 실행했다. 호환성 회귀 테스트 포함 19개 통과.

- [x] `frontend/tests/material-management.test.tsx`: 응답 정규화, 검색 직렬화, 전체 업무 필드, 필수값/숫자/길이 검증, 코드 공통옵션, 등록/수정/오류/권한을 검증한다.
- [x] `backend/src/test/java/egovframework/let/co/master/material/`: Service, BatchService, Controller 및 Mapper 계약 테스트를 추가한다.
- [x] `npm run test -- tests/material-management.test.tsx`, `mvn -Dtest=MaterialInfoServiceImplTest,MaterialInfoBatchServiceImplTest,MaterialInfoApiControllerTest test`로 신규 기능 미구현 실패를 확인한다.

## 2. 백엔드

- [x] `backend/src/main/java/egovframework/let/co/master/material/domain/model/`에 `MaterialInfoSaveRequestVO`, `MaterialInfoVO`, `MaterialInfoSearchCondition`, 배치 변경/요청/결과 모델을 추가한다. 모든 업무 필드는 OpenAPI 설명을 제공한다.
- [x] `domain/repository/MaterialInfoDAO.java`, `service/MaterialInfoService.java`, `service/impl/MaterialInfoServiceImpl.java`: 인증 tenant 기반 목록/등록/수정, 문자열 길이·필수값·숫자·기한 검증, 코드 중복/999999 초과 오류를 구현한다.
- [x] `service/MaterialInfoBatchService.java`, `service/impl/MaterialInfoBatchServiceImpl.java`: 신규/수정을 하나의 트랜잭션으로 저장하고 삭제 요청·잘못된 ID·빈 행을 거부한다.
- [x] `controller/MaterialInfoApiController.java`: `/api/v1/co/master/materials`, `/{materialId}`, `/save-batch` 및 공통코드 옵션 조회를 연결한다.
- [x] `backend/src/main/resources/egovframework/mapper/let/co/master/material/MaterialInfo_SQL_postgresql.xml`: 명시적 컬럼, 바인딩된 검색 조건, tenant/미삭제 조건, 감사값과 생성시각을 적용한다.
- [x] `EgovConfigAppIdGen.java`에 품목 전용 6자리 generator를 등록한다.
- [x] `MaterialIntegerJsonDeserializers.java`로 JSON 정수의 소수점 절삭을 차단하고 컨트롤러에서 명시적 입력 오류를 반환한다.

## 3. 프론트엔드

- [x] `frontend/src/pages/co/master/materials/types/materialManagement.types.ts`: 모든 업무 필드, 숫자 null, 검색·배치·옵션 계약을 정의한다.
- [x] `services/materialManagement.service.ts`: 엄격한 응답 검사, 필드별 payload 검증 및 검색/배치/옵션 API를 구현한다.
- [x] `hooks/useMaterialManagement.ts`: 목록/옵션 로딩, stale 요청 방지, 저장 실패 dirty 보존, 성공 재조회 및 알림을 구현한다.
- [x] `components/MaterialGrid.tsx`: 업무 필드의 그룹별 폼과 상세검색 메타데이터, 숫자·선택 옵션을 구성한다.
- [x] `MaterialManagementPage.tsx`: 기존 Header/Search/Message/Grid/미저장 확인을 연결한다.
- [x] `DashboardContent.tsx`의 `co/materials` 분기 및 dashboard 페이지 설명을 갱신한다.

## 4. DB 및 문서

- [x] 생성 SQL 누락 보완: MCP로 스키마/인덱스를 재확인하고 `tools/tests/test_material_schema.cjs`에 전체 컬럼 및 제약/인덱스/사본 일치/롤백 검증을 추가해 실패를 확인했다.
- [x] `20261022_010_create_material_schema.sql`과 `20261022_010_rollback_material_schema.sql`을 두 DB 폴더에 추가했다. 생성은 테이블 미존재 환경에만 적용하며 롤백은 비어 있는 테이블만 삭제하고 IDS 발급 이력은 보존한다.
- [x] 채번 SQL 헤더, 변경 이력, 누적 스키마 및 결과 문서에 적용 순서를 반영하고 Node 집중 검증 5개 통과 및 5개 파일 해시 일치를 확인했다. 실제 DB 적용은 수행하지 않았다.

- [x] `docs/database/20261022/20261022_010_*` 및 `backend/DATABASE/20261022/20261022_010_*`: 품목 IDS 초기화·변경기록·카운터를 낮추지 않는 롤백을 동일하게 추가한다.
- [x] `docs/database/db-schema.md`에 품목의 MCP 확인 구조와 자동채번 계약을 반영한다.
- [x] `frontend/src/pages/f1-grid-docs/F1-GRID.md`에 품목 검색/행 폼/배치 사용 흐름을 추가한다.

## 5. 검증

- [x] 신규 테스트와 기존 거래처 서비스/페이지 테스트를 묶어 실행한다. 프론트 29개, 백엔드 46개 통과.
- [ ] `frontend`: `npm run build` 최종 성공 확인. 별도 작업의 공통 입력 이벤트 타입 오류(TS2345)로 실패했으며 사용자가 다른 작업에서 처리하므로 수정하지 말라고 확인했다.
- [x] `backend`: 위 품목 및 거래처 집중 테스트를 실행한다.
- [x] 기존 4173 S-ERP 서버를 확인해 재사용하고 실제 브라우저에서 375/768/1280px를 검증한다.
- [x] `docs/result/20261022/material-management/`에 결과 및 스크린샷 7개를 저장한다. 합성 API 검증과 미수행인 실제 DB 저장 검증을 구분한다.

결과: [구현·검증 결과](../../result/20261022/material-management/20261022_010_material-management_result.md). 실제 DB에 SQL을 적용하거나 기존 서버를 임의로 재시작하지 않았다.
