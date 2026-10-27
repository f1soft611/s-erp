# Master Classification Picker Implementation Plan

**Goal:** 품목·거래처 마스터에서 분류를 코드 선택하고 기존 저장 API로 영속화한다.

**Architecture:** 기존 단건/batch 저장 서비스에 선택 ID 검증을 연결하고 Mapper에서 ID/표시명을 읽고 쓴다. 프론트엔드는 분류 선택 전용 CommonDialog/F1Tree와 기존 코드 컬럼 콜백을 사용한다. 분류 조회는 선택창이 열릴 때만 수행한다.

**Tech Stack:** React, TypeScript, F1Tree, MUI CommonDialog, Java 8 API, Spring/MyBatis, Vitest/JUnit/Playwright.

## 실행 단위

1. `backend/src/main/java/egovframework/let/co/master/classification/service/ClassificationSelectionValidator.java`에 공통 검증을 만든다. tenant 범위 조회, 활성 조상, 품목 1~3단계, 거래처 1/2단계와 실제 부모를 검사한다. 기존 분류와 같은 ID 조합이면 미사용 상태 유지를 허용한다. 새 필드 미전송은 업데이트 시 기존 값 유지, 명시적 null은 해제다.
2. `material/domain/model/MaterialInfoSaveRequestVO.java`, `MaterialInfoVO.java`, `material/service/impl/MaterialInfoServiceImpl.java`, `MaterialInfo_SQL_postgresql.xml`에 `itemClsId` 및 응답 `itemClsPath`를 반영한다. 동일 위치의 customer 파일들에 `businessKind1/2` 및 응답 `businessKind1Name/2Name`을 반영한다. 모든 조회/저장과 분류명 조회에 tenant 조건을 유지한다.
3. 기존 backend service/mapper 테스트와 신규 분류 선택 검증 테스트로 잘못된 tenant/비활성/부모 조합 거부, null/미전송/기존값 유지, batch 재사용 경로를 확인한다.
4. `frontend/src/pages/co/master/classification/components/ClassificationPickerDialog.tsx`를 추가한다. 열 때 조회, 오류/재조회, 활성 계층만 선택, 단계 필터, 선택/해제/취소를 제공한다.
5. 품목/거래처 타입·정규화·payload·컬럼·페이지를 연결한다. 코드 컬럼은 표시명/경로를 보여주고 실제 ID를 저장한다. 행 폼에서도 비동기 코드 선택 콜백을 적용한다. 공통 폼의 동기/비동기 콜백은 기존 패치 적용 계약을 유지하며 보완한다.
6. 실패 테스트 후 구현한다. `mvn "-Dtest=ClassificationSelectionValidatorTest,MaterialInfoServiceImplTest,CustomerInfoServiceImplTest,MaterialInfoMapperTest,CustomerInfoMapperTest" test` 및 관련 frontend Vitest를 실행한다. 실제 테스트명은 저장소 파일명에 맞춘다.
7. frontend build/lint, 4173 실제 브라우저 375/768/1280px 선택/해제/저장/재조회(합성 API) 확인 후 `docs/result/20261027/master-classification-picker`에 결과 및 스크린샷을 남긴다.

## 17:01 후속 버튼 정리 계획

1. `classification-picker-dialog.test.tsx`에 품목/거래처 대·소분류 모두 하단 버튼이 `선택`, `취소`뿐인지 검증하는 실패 테스트를 작성한다.
2. `ClassificationPickerDialog.tsx`의 `선택 해제` 버튼을 제거하고 선택 버튼 다음에 취소 버튼을 배치한다.
3. `master-classification-picker.test.tsx`의 해제 시나리오는 취소 시 기존 선택 보존 및 대분류 변경 시 소분류 초기화 검증으로 변경한다.
4. 관련 Vitest, build/lint, 4173 브라우저 375/768/1280px 버튼 순서·선택·취소를 확인하고 결과와 스크린샷을 갱신한다. DB 변경과 API 계약 변경은 없다.

## 제외/위험

- 분류 검색 조건 추가, 분류 일괄 변경, 새 스키마 생성은 제외한다.
- 현재 DB MCP 메타데이터에 필요한 컬럼과 분류 테이블이 존재한다. 신규 DDL은 필요하지 않으며 이 작업에서 DB를 변경하지 않는다.
- 다른 작업의 미커밋 변경을 보존하고 자동 커밋하지 않는다.
