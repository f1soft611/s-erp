# 모듈별 공통코드 Seed Implementation Plan

> **For agentic workers:** `executing-plans`를 사용해 아래 순서대로 수행한다. 사용자 요청 없이 커밋하지 않는다.

**Goal:** 하드코딩된 업무 선택값을 분류하고 기존 저장값을 보존하는 공통코드 Seed를 제공한다.

**Architecture:** 페이지 조사표와 등록 SQL을 분리한다. 기존 그룹은 재사용하고 상태 전이·동적 마스터는 Seed에서 제외한다. 백엔드 미구현 화면의 두 후보는 선택 스크립트로 분리한다.

**Tech Stack:** PostgreSQL, psql, Markdown. React/Java 운영 코드는 변경하지 않는다.

---

근거: [작업지시서](../../directions/20261116/20261116_018_page-common-codes_작업지시서.md)

## 1. 조사 및 상세사양

- [x] 영업·구매자재·그룹웨어·기준정보·시스템 및 기타 페이지의 업무 선택값을 조사한다.
- [x] 기본 DB MCP의 목록/컬럼/길이/그룹 존재 여부를 확인한다. 테넌트 행은 수집하지 않는다.
- [x] `docs/spec/20261116/20261116_018_page-common-codes_상세사양서.md`에 기본 2그룹 4항목, 선택 2그룹 5항목, 보류·제외 기준을 명시한다.
- [x] `docs/result/20261116/page-common-codes/20261116_018_page-common-codes_조사결과.md`에 값·라벨·출처와 후속 연결 주의사항을 기록한다.

## 2. 격리 테스트와 구현

파일은 `docs/database/20261116` 및 `backend/DATABASE/20261116`에 동일하게 둔다.

- [x] `20261116_003_verify_page_common_codes.sql`을 먼저 작성한다. 전용 테스트 DB 이름을 강제하고 합성 테넌트와 원본 공통코드 DDL로 검증한다.
- [x] Seed 미구현 상태에서 테스트 실패를 확인한다.
- [x] `20261116_003_seed_page_common_codes.sql`: `ITEM_PARTNER_TRADE_TYPE`의 `매입/매출`, `SALES_DELIVERY_TYPE`의 `DIRECT/ORDER`를 등록한다.
- [x] `20261116_003_seed_work_standard_codes_optional.sql`: `WORK_STANDARD_VERSION_STATUS`의 `양산/샘플/폐기`, `WORK_STANDARD_SHELF_LIFE_BASE`의 `반제품 생산완료일/제품 생산완료일`을 등록한다.
- [x] `20261116_003_rollback_page_common_codes.sql`: 전용 설명 표식과 원본 정의가 유지된 Seed 소유 행만 제거한다. 수정·참조된 행은 보존한다.
- [x] 모든 SQL에 `ON_ERROR_STOP`, 필수 `target_tenant_id`, 단일 트랜잭션을 적용한다. 없는 테넌트는 예외로 실패시킨다.

## 3. 검증 및 결과

- [x] 로컬 PostgreSQL 바이너리로 작업 전용 임시 클러스터/포트를 기동한다. 운영 연결정보는 읽거나 사용하지 않는다.
- [x] `psql -X -v ON_ERROR_STOP=1 -d test_page_common_codes -f 20261116_003_verify_page_common_codes.sql` 실행으로 초기 등록, 재실행, 기존값 보존, 격리, 참조·수정 보존 롤백을 확인한다.
- [x] 미지정·없는 테넌트 거부 및 재등록을 확인한다.
- [x] 두 DB 폴더의 파일 해시와 `git diff --check`를 확인한다.
- [x] `20261116_003_change_page_common_codes.md`와 조사 결과에 실제 검증 범위·DB 미적용·UI 미교체 사실을 기록한다.
- [x] 임시 PostgreSQL을 종료한다. 스키마 DDL이 없으므로 누적 `db-schema.md`는 변경하지 않는다.
